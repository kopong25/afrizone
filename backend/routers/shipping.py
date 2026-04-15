from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
import models, auth as auth_utils
import os, httpx, logging
from pydantic import BaseModel
from typing import Optional

router = APIRouter()
logger = logging.getLogger(__name__)

SHIPPO_API_KEY = os.getenv("SHIPPO_API_KEY", "")
SHIPPO_BASE = "https://api.goshippo.com"
SHIPPO_TEST_MODE = SHIPPO_API_KEY.startswith("shippo_test_") or not SHIPPO_API_KEY

logger.info(f"[SHIPPO] API key loaded: {'YES' if SHIPPO_API_KEY else 'NO'} | mode: {'TEST — sample labels' if SHIPPO_TEST_MODE else 'LIVE'}")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def shippo_post(endpoint: str, data: dict):
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{SHIPPO_BASE}/{endpoint}",
            json=data,
            headers={
                "Authorization": f"ShippoToken {SHIPPO_API_KEY}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        r.raise_for_status()
        return r.json()


async def shippo_get(endpoint: str):
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SHIPPO_BASE}/{endpoint}",
            headers={"Authorization": f"ShippoToken {SHIPPO_API_KEY}"},
            timeout=30,
        )
        r.raise_for_status()
        return r.json()


def _pick_best_rate(rates: list) -> str | None:
    """Pick the best rate — prefer USPS Priority, fall back to cheapest."""
    if not rates:
        return None
    priority = [
        r for r in rates
        if "PRIORITY" in r.get("servicelevel", {}).get("token", "").upper()
    ]
    if priority:
        return priority[0]["object_id"]
    cheapest = min(rates, key=lambda r: float(r.get("amount", 9999)))
    logger.info(f"[SHIPPO] No priority rate found — using cheapest: {cheapest.get('object_id')} (${cheapest.get('amount')})")
    return cheapest["object_id"]


def validate_shipping_address(order: models.Order):
    missing = []
    if not order.shipping_name:    missing.append("recipient name")
    if not order.shipping_address: missing.append("street address")
    if not order.shipping_city:    missing.append("city")
    if not order.shipping_state:   missing.append("state")
    if not order.shipping_zip:     missing.append("zip code")
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Incomplete shipping address. Missing: {', '.join(missing)}. "
                   f"Please ask the customer to update their address before creating a label.",
        )


def _build_address_from(store: models.Store) -> dict:
    if not store.address or not store.city:
        raise HTTPException(
            status_code=400,
            detail="Your store address is incomplete. Go to Store Settings and add your full address before creating labels.",
        )
    return {
        "name":    store.name,
        "street1": store.address,
        "city":    store.city,
        "state":   store.state if hasattr(store, "state") and store.state else "TX",
        "zip":     store.zip if hasattr(store, "zip") and store.zip else "77001",
        "country": "US",
        "phone":   store.phone or "",
        "email":   store.owner.email if store.owner else "",
    }


def _build_address_to(order: models.Order) -> dict:
    return {
        "name":    order.shipping_name,
        "street1": order.shipping_address,
        "city":    order.shipping_city,
        "state":   order.shipping_state,
        "zip":     order.shipping_zip,
        "country": "US",
    }


def _build_parcel(order: models.Order) -> dict:
    total_weight = sum(
        (item.product.weight_kg or 0.5) * item.quantity
        for item in order.items
    ) or 0.5
    return {
        "length": "12", "width": "10", "height": "6",
        "distance_unit": "in",
        "weight": str(round(total_weight * 2.205, 2)),
        "mass_unit": "lb",
    }


def _build_parcel_estimate(weight_lbs: float = 1.0) -> dict:
    return {
        "length": "6", "width": "4", "height": "2",
        "distance_unit": "in",
        "weight": str(round(weight_lbs, 2)),
        "mass_unit": "lb",
    }


def _create_mock_label(order_id: int, db: Session, order, store, background_tasks: BackgroundTasks, sample: bool = False):
    status = "sample" if sample else "created"
    label_url = f"https://afrizone-loqr.onrender.com/shipping/mock-label/{order_id}{'?sample=1' if sample else ''}"
    label = models.ShippingLabel(
        order_id=order_id,
        carrier="USPS",
        service="Priority Mail",
        tracking_number=f"9400111899223{order_id:06d}",
        label_url=label_url,
        rate=8.95,
        status=status,
    )
    db.add(label)
    order.tracking_number = label.tracking_number
    order.status = models.OrderStatus.shipped
    db.commit()
    background_tasks.add_task(_email_label_to_seller, order, store, label)
    return {
        "label_url":       label.label_url,
        "tracking_number": label.tracking_number,
        "carrier":         label.carrier,
        "mock":            True,
        "sample":          sample,
        "warning":         (
            "Address was incomplete — this is a SAMPLE label. DO NOT SHIP. "
            "Ask the customer to update their address."
        ) if sample else None,
    }


# ---------------------------------------------------------------------------
# Schema for estimate endpoint
# ---------------------------------------------------------------------------

class ShippingEstimateRequest(BaseModel):
    store_id: int
    address: str
    city: str
    state: str
    zip: str
    country: str = "US"
    weight_lbs: Optional[float] = 1.0


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/estimate")
async def get_shipping_estimate(
    body: ShippingEstimateRequest,
    db: Session = Depends(get_db),
):
    """
    Get a real-time USPS shipping rate estimate before an order is placed.
    Called during checkout so the customer pays the correct Shippo rate.
    Falls back to $8.99 if Shippo is unavailable or not configured.
    """
    FALLBACK_RATE = 8.99

    if not SHIPPO_API_KEY:
        logger.warning("[SHIPPO] No API key — returning fallback estimate")
        return {"rate": FALLBACK_RATE, "mock": True, "carrier": "USPS", "service": "Priority Mail"}

    store = db.query(models.Store).filter(models.Store.id == body.store_id).first()
    if not store or not store.address or not store.city:
        logger.warning(f"[SHIPPO] Store {body.store_id} has incomplete address — returning fallback")
        return {"rate": FALLBACK_RATE, "mock": True, "carrier": "USPS", "service": "Priority Mail"}

    try:
        address_from = {
            "name":    store.name,
            "street1": store.address,
            "city":    store.city,
            "state":   store.state if hasattr(store, "state") and store.state else "AZ",
            "zip":     store.zip if hasattr(store, "zip") and store.zip else "85225",
            "country": "US",
        }
        address_to = {
            "name":    "Customer",
            "street1": body.address,
            "city":    body.city,
            "state":   body.state,
            "zip":     body.zip,
            "country": body.country or "US",
        }
        parcel = _build_parcel_estimate(body.weight_lbs or 1.0)

        shipment = await shippo_post("shipments", {
            "address_from": address_from,
            "address_to":   address_to,
            "parcels":      [parcel],
            "async": False,
        })

        rates = shipment.get("rates", [])
        if not rates:
            logger.warning("[SHIPPO] No rates returned — using fallback")
            return {"rate": FALLBACK_RATE, "mock": True, "carrier": "USPS", "service": "Priority Mail"}

        # Prefer USPS Priority
        priority = [r for r in rates if "PRIORITY" in r.get("servicelevel", {}).get("token", "").upper()]
        best = priority[0] if priority else min(rates, key=lambda r: float(r.get("amount", 9999)))

        real_rate = round(float(best.get("amount", FALLBACK_RATE)), 2)
        service = best.get("servicelevel", {}).get("name", "Priority Mail")
        carrier = best.get("provider", "USPS")
        days = best.get("estimated_days", "1–3")

        logger.info(f"[SHIPPO] Estimate: {carrier} {service} = ${real_rate} ({days} days)")
        return {
            "rate":    real_rate,
            "mock":    False,
            "carrier": carrier,
            "service": service,
            "days":    days,
        }

    except Exception as e:
        logger.error(f"[SHIPPO] Estimate error: {e}")
        return {"rate": FALLBACK_RATE, "mock": True, "carrier": "USPS", "service": "Priority Mail"}


@router.get("/rates/{order_id}")
async def get_shipping_rates(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    validate_shipping_address(order)

    store = db.query(models.Store).filter(models.Store.id == order.store_id).first()

    if not SHIPPO_API_KEY:
        logger.warning("[SHIPPO] No API key — returning mock rates")
        return {
            "mock": True,
            "rates": [
                {"carrier": "USPS", "service": "Priority Mail",  "amount": "8.95",  "days": "2-3", "object_id": "mock_priority"},
                {"carrier": "USPS", "service": "First Class",    "amount": "4.50",  "days": "3-5", "object_id": "mock_first"},
                {"carrier": "UPS",  "service": "Ground",         "amount": "12.00", "days": "3-7", "object_id": "mock_ups"},
            ],
        }

    try:
        shipment = await shippo_post("shipments", {
            "address_from": _build_address_from(store),
            "address_to":   _build_address_to(order),
            "parcels":      [_build_parcel(order)],
            "async": False,
        })
    except httpx.HTTPStatusError as e:
        logger.error(f"[SHIPPO] Shipment creation failed: {e.response.status_code} — {e.response.text}")
        raise HTTPException(status_code=502, detail=f"Shippo rejected the shipment request: {e.response.text}")
    except Exception as e:
        logger.error(f"[SHIPPO] Unexpected error fetching rates: {e}")
        raise HTTPException(status_code=502, detail=f"Could not reach Shippo: {str(e)}")

    rates = shipment.get("rates", [])
    if not rates:
        raise HTTPException(
            status_code=400,
            detail="Shippo returned no rates for this address. Please verify the shipping address is correct and try again.",
        )

    return {
        "mock": False,
        "rates": [
            {
                "carrier":   r["provider"],
                "service":   r["servicelevel"]["name"],
                "amount":    r["amount"],
                "days":      r.get("estimated_days", "?"),
                "object_id": r["object_id"],
            }
            for r in rates if r.get("object_id")
        ],
    }


@router.post("/label/{order_id}")
async def create_shipping_label(
    order_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller),
    rate_id: str = "auto",
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    store = db.query(models.Store).filter(
        models.Store.owner_id == current_user.id,
        models.Store.id == order.store_id,
    ).first()
    if not store:
        raise HTTPException(status_code=403, detail="Access denied")

    existing = db.query(models.ShippingLabel).filter(models.ShippingLabel.order_id == order_id).first()
    if existing:
        return {
            "label_url":       existing.label_url,
            "tracking_number": existing.tracking_number,
            "carrier":         existing.carrier,
        }

    if not SHIPPO_API_KEY:
        logger.warning("[SHIPPO] No API key — issuing mock label")
        return _create_mock_label(order_id, db, order, store, background_tasks)

    if rate_id.startswith("mock_"):
        raise HTTPException(
            status_code=400,
            detail="Cannot create a real label with a mock rate ID. Please call /rates first to get a valid Shippo rate.",
        )

    validate_shipping_address(order)

    if rate_id == "auto":
        try:
            shipment = await shippo_post("shipments", {
                "address_from": _build_address_from(store),
                "address_to":   _build_address_to(order),
                "parcels":      [_build_parcel(order)],
                "async": False,
            })
            rates = shipment.get("rates", [])
            if not rates:
                raise HTTPException(
                    status_code=400,
                    detail="Shippo returned no rates for this address. Verify the shipping address and try again.",
                )
            rate_id = _pick_best_rate(rates)
            logger.info(f"[SHIPPO] Auto-selected rate: {rate_id}")

        except HTTPException:
            raise
        except httpx.HTTPStatusError as e:
            logger.error(f"[SHIPPO] Rate fetch HTTP error: {e.response.status_code} — {e.response.text}")
            raise HTTPException(status_code=502, detail=f"Shippo rejected the address: {e.response.text}")
        except Exception as e:
            logger.error(f"[SHIPPO] Rate fetch error: {e}")
            raise HTTPException(status_code=502, detail=f"Could not fetch Shippo rates: {str(e)}")

    try:
        txn = await shippo_post("transactions", {
            "rate":            rate_id,
            "label_file_type": "PDF_4x6",
            "async":           False,
        })
    except httpx.HTTPStatusError as e:
        logger.error(f"[SHIPPO] Transaction HTTP error: {e.response.status_code} — {e.response.text}")
        if "complete address" in e.response.text.lower() or "address" in e.response.text.lower():
            logger.warning("[SHIPPO] Incomplete address detected — issuing SAMPLE label")
            return _create_mock_label(order_id, db, order, store, background_tasks, sample=True)
        raise HTTPException(status_code=502, detail=f"Shippo transaction failed: {e.response.text}")
    except Exception as e:
        logger.error(f"[SHIPPO] Transaction error: {e}")
        raise HTTPException(status_code=502, detail=f"Could not purchase label: {str(e)}")

    if txn.get("status") != "SUCCESS":
        messages = txn.get("messages", "Unknown Shippo error")
        logger.error(f"[SHIPPO] Transaction not SUCCESS: {messages}")
        msg_str = str(messages).lower()
        if "address" in msg_str or "complete" in msg_str:
            logger.warning("[SHIPPO] Address issue in transaction — issuing SAMPLE label")
            return _create_mock_label(order_id, db, order, store, background_tasks, sample=True)
        raise HTTPException(status_code=400, detail=f"Shippo could not create label: {messages}")

    label = models.ShippingLabel(
        order_id=order_id,
        shippo_transaction_id=txn["object_id"],
        tracking_number=txn["tracking_number"],
        label_url=txn["label_url"],
        carrier="USPS",
        service="Priority Mail",
        status="created",
    )
    db.add(label)
    order.tracking_number = txn["tracking_number"]
    order.tracking_url = txn.get("tracking_url_provider", "")
    order.status = models.OrderStatus.shipped
    db.commit()

    background_tasks.add_task(_email_label_to_seller, order, store, label)
    return {
        "label_url":       label.label_url,
        "tracking_number": label.tracking_number,
        "carrier":         label.carrier,
        "mock":            False,
    }


@router.get("/label/{order_id}")
def get_label(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    label = db.query(models.ShippingLabel).filter(models.ShippingLabel.order_id == order_id).first()
    if not label:
        raise HTTPException(status_code=404, detail="No label for this order")
    return {
        "label_url":       label.label_url,
        "tracking_number": label.tracking_number,
        "carrier":         label.carrier,
        "status":          label.status,
    }


# ---------------------------------------------------------------------------
# Background tasks
# ---------------------------------------------------------------------------

def _email_label_to_seller(order, store, label):
    try:
        from utils.email import send_email, _wrap, FRONTEND_URL
        body = f"""
        <h2 class="hero">New Order — Print Your Shipping Label</h2>
        <p>You have a new order <strong>#{order.id}</strong>. Your FREE USPS shipping label is ready to print.</p>
        <div class="order-box" style="text-align:center">
          <p style="font-size:14px;color:#555;margin-bottom:8px">Tracking Number</p>
          <p style="font-family:monospace;font-size:18px;font-weight:bold;color:#1A5C38;margin:0">{label.tracking_number}</p>
        </div>
        <p><strong>Instructions:</strong></p>
        <ol style="color:#444;line-height:2;font-size:14px">
          <li>Click the button below to download your 4x6" label PDF</li>
          <li>Print on any printer (even a regular 8.5x11" sheet works)</li>
          <li>Cut and tape the label securely on the package</li>
          <li>Drop at any USPS location, blue mailbox, or leave at door</li>
        </ol>
        <a href="{label.label_url}" class="btn btn-gold" style="font-size:16px">Download Shipping Label PDF</a>
        <p style="margin-top:16px;font-size:13px;color:#888">This label was auto-generated by Afrizone. No postage needed — it's prepaid!</p>
        """
        send_email(store.owner.email, f"🏷️ Print Label — Afrizone Order #{order.id}", _wrap(body))
    except Exception as e:
        logger.error(f"[EMAIL] Label email error: {e}")


# ---------------------------------------------------------------------------
# Mock label endpoint (dev/test only)
# ---------------------------------------------------------------------------

@router.get("/mock-label/{order_id}")
def mock_label_pdf(order_id: int, sample: int = 0, db: Session = Depends(get_db)):
    from fastapi.responses import Response

    label = db.query(models.ShippingLabel).filter(models.ShippingLabel.order_id == order_id).first()
    order = db.query(models.Order).filter(models.Order.id == order_id).first()

    is_sample = bool(sample) or (label and label.status == "sample")
    tracking = label.tracking_number if label else f"9400111899223{order_id:06d}"
    ship_to = ""
    if order:
        ship_to = "\n".join([
            order.shipping_name or "",
            order.shipping_address or "",
            f"{order.shipping_city or ''}, {order.shipping_state or ''} {order.shipping_zip or ''}",
        ])

    watermark = (
        '<div style="position:absolute;top:40%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);'
        'font-size:72px;font-weight:900;color:rgba(220,0,0,0.18);pointer-events:none;'
        'white-space:nowrap;z-index:99">SAMPLE &#8212; DO NOT SHIP</div>'
    ) if is_sample else ""

    note_style = 'color:#c00;font-weight:bold;font-size:13px;' if is_sample else ''
    note_text = (
        "&#9888; SAMPLE LABEL &mdash; Address incomplete. DO NOT SHIP. Ask customer to update their address."
        if is_sample else
        "TEST LABEL &mdash; For real shipments, ensure the shipping address is complete."
    )

    html = f"""<!DOCTYPE html>
<html>
<head>
<style>
  body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background: white; }}
  .label {{ border: 3px solid black; padding: 20px; max-width: 500px; margin: auto; position: relative; overflow: hidden; }}
  .carrier {{ font-size: 36px; font-weight: 900; text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 10px; }}
  .service {{ font-size: 20px; font-weight: bold; text-align: center; margin-bottom: 16px; }}
  .section {{ margin-bottom: 14px; }}
  .label-text {{ font-size: 11px; color: #555; font-weight: bold; text-transform: uppercase; }}
  .value {{ font-size: 15px; font-weight: bold; }}
  .tracking {{ font-family: monospace; font-size: 18px; font-weight: 900; letter-spacing: 2px; text-align: center; background: #f0f0f0; padding: 10px; border: 1px solid #ccc; margin: 12px 0; }}
  .barcode {{ text-align: center; font-family: monospace; font-size: 28px; letter-spacing: -1px; margin: 8px 0; }}
  .note {{ font-size: 11px; color: #888; text-align: center; margin-top: 16px; border-top: 1px dashed #ccc; padding-top: 10px; }}
  @media print {{ body {{ margin: 0; }} }}
</style>
</head>
<body>
<div class="label">
  {watermark}
  <div class="carrier">USPS</div>
  <div class="service">PRIORITY MAIL 2-DAY</div>
  <div class="section">
    <div class="label-text">From:</div>
    <div class="value">Afrizone Seller</div>
    <div class="value" style="font-weight:normal">Fulfilled via Afrizone Marketplace</div>
  </div>
  <div class="section">
    <div class="label-text">Ship To:</div>
    <div class="value" style="white-space:pre-line">{ship_to}</div>
  </div>
  <div class="tracking">{tracking}</div>
  <div class="barcode">||| |||| ||| |||| ||| ||||</div>
  <div style="text-align:center;margin:10px 0">
    <span style="font-size:13px;background:#1A5C38;color:white;padding:4px 12px;border-radius:4px">Afrizone Order #{order_id}</span>
  </div>
  <div class="note" style="{note_style}">{note_text}</div>
</div>
<script>window.onload = function() {{ window.print(); }}</script>
</body>
</html>"""

    return Response(content=html, media_type="text/html")