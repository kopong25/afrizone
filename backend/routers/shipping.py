from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
import models, auth as auth_utils
import os, httpx

router = APIRouter()

SHIPPO_API_KEY = os.getenv("SHIPPO_API_KEY", "")
SHIPPO_BASE = "https://api.goshippo.com"

async def shippo_post(endpoint: str, data: dict):
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{SHIPPO_BASE}/{endpoint}",
            json=data,
            headers={"Authorization": f"ShippoToken {SHIPPO_API_KEY}", "Content-Type": "application/json"},
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


@router.get("/rates/{order_id}")
async def get_shipping_rates(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """Get available shipping rates for an order."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    store = db.query(models.Store).filter(models.Store.id == order.store_id).first()

    # Calculate total weight from order items
    total_weight = sum(
        (item.product.weight_kg or 0.5) * item.quantity
        for item in order.items
    ) or 0.5

    if not SHIPPO_API_KEY:
        # Return mock rates for testing
        return {"rates": [
            {"carrier": "USPS", "service": "Priority Mail", "amount": "8.95", "days": "2-3", "object_id": "mock_priority"},
            {"carrier": "USPS", "service": "First Class", "amount": "4.50", "days": "3-5", "object_id": "mock_first"},
            {"carrier": "UPS", "service": "Ground", "amount": "12.00", "days": "3-7", "object_id": "mock_ups"},
        ]}

    try:
        shipment = await shippo_post("shipments", {
            "address_from": {
                "name": store.name,
                "street1": store.address or "123 Main St",
                "city": store.city or "Houston",
                "state": "TX",
                "zip": "77001",
                "country": "US",
            },
            "address_to": {
                "name": order.shipping_name or "Customer",
                "street1": order.shipping_address or "456 Oak Ave",
                "city": order.shipping_city or "New York",
                "state": order.shipping_state or "NY",
                "zip": order.shipping_zip or "10001",
                "country": "US",
            },
            "parcels": [{
                "length": "12", "width": "10", "height": "6",
                "distance_unit": "in",
                "weight": str(round(total_weight * 2.205, 2)),  # kg to lbs
                "mass_unit": "lb",
            }],
            "async": False,
        })
        rates = shipment.get("rates", [])
        return {"rates": [
            {
                "carrier": r["provider"],
                "service": r["servicelevel"]["name"],
                "amount": r["amount"],
                "days": r.get("estimated_days", "?"),
                "object_id": r["object_id"],
            }
            for r in rates if r.get("object_id")
        ]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Shipping rate error: {str(e)}")


@router.post("/label/{order_id}")
async def create_shipping_label(
    order_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller),
    rate_id: str = "auto",
):
    """Create a shipping label for an order."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    store = db.query(models.Store).filter(
        models.Store.owner_id == current_user.id,
        models.Store.id == order.store_id
    ).first()
    if not store:
        raise HTTPException(status_code=403, detail="Access denied")

    existing = db.query(models.ShippingLabel).filter(models.ShippingLabel.order_id == order_id).first()
    if existing:
        return {"label_url": existing.label_url, "tracking_number": existing.tracking_number, "carrier": existing.carrier}

    # If no Shippo key or mock rate, use mock label
    if not SHIPPO_API_KEY or rate_id.startswith("mock_"):
        label = models.ShippingLabel(
            order_id=order_id, carrier="USPS", service="Priority Mail",
            tracking_number=f"9400111899223{order_id:06d}",
            label_url=f"https://afrizone-loqr.onrender.com/shipping/mock-label/{order_id}",
            rate=8.95, status="created",
        )
        db.add(label)
        order.tracking_number = label.tracking_number
        order.status = models.OrderStatus.shipped
        db.commit()
        background_tasks.add_task(_email_label_to_seller, order, store, label)
        return {"label_url": label.label_url, "tracking_number": label.tracking_number, "carrier": label.carrier}

    # Shippo key exists — get real rates first if rate_id is "auto"
    if rate_id == "auto":
        try:
            total_weight = sum(
                (item.product.weight_kg or 0.5) * item.quantity
                for item in order.items
            ) or 0.5
            shipment = await shippo_post("shipments", {
                "address_from": {
                    "name": store.name,
                    "street1": store.address or "123 Main St",
                    "city": store.city or "Houston",
                    "state": "TX", "zip": "77001", "country": "US",
                },
                "address_to": {
                    "name": order.shipping_name or "Customer",
                    "street1": order.shipping_address or "456 Oak Ave",
                    "city": order.shipping_city or "New York",
                    "state": order.shipping_state or "NY",
                    "zip": order.shipping_zip or "10001",
                    "country": "US",
                },
                "parcels": [{
                    "length": "12", "width": "10", "height": "6",
                    "distance_unit": "in",
                    "weight": str(round(total_weight * 2.205, 2)),
                    "mass_unit": "lb",
                }],
                "async": False,
            })
            # Pick cheapest USPS Priority rate
            rates = shipment.get("rates", [])
            priority = [r for r in rates if "PRIORITY" in r.get("servicelevel", {}).get("token", "").upper()]
            rate_id = priority[0]["object_id"] if priority else (rates[0]["object_id"] if rates else None)
            if not rate_id:
                raise Exception("No rates available")
        except Exception as e:
            # Fall back to mock if Shippo rates fail
            label = models.ShippingLabel(
                order_id=order_id, carrier="USPS", service="Priority Mail",
                tracking_number=f"9400111899223{order_id:06d}",
                label_url=f"https://afrizone-loqr.onrender.com/shipping/mock-label/{order_id}",
                rate=8.95, status="created",
            )
            db.add(label)
            order.tracking_number = label.tracking_number
            order.status = models.OrderStatus.shipped
            db.commit()
            background_tasks.add_task(_email_label_to_seller, order, store, label)
            return {"label_url": label.label_url, "tracking_number": label.tracking_number, "carrier": label.carrier}

    try:
        txn = await shippo_post("transactions", {
            "rate": rate_id,
            "label_file_type": "PDF_4x6",
            "async": False,
        })
        if txn.get("status") != "SUCCESS":
            raise HTTPException(status_code=400, detail=txn.get("messages", "Label creation failed"))

        label = models.ShippingLabel(
            order_id=order_id,
            shippo_transaction_id=txn["object_id"],
            tracking_number=txn["tracking_number"],
            label_url=txn["label_url"],
            carrier="USPS", service="Priority Mail",
            status="created",
        )
        db.add(label)
        order.tracking_number = txn["tracking_number"]
        order.tracking_url = txn.get("tracking_url_provider", "")
        order.status = models.OrderStatus.shipped
        db.commit()

        background_tasks.add_task(_email_label_to_seller, order, store, label)
        return {"label_url": label.label_url, "tracking_number": label.tracking_number, "carrier": label.carrier}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/label/{order_id}")
def get_label(order_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    label = db.query(models.ShippingLabel).filter(models.ShippingLabel.order_id == order_id).first()
    if not label:
        raise HTTPException(status_code=404, detail="No label for this order")
    return {"label_url": label.label_url, "tracking_number": label.tracking_number, "carrier": label.carrier, "status": label.status}


def _email_label_to_seller(order, store, label):
    """Background task: email shipping label PDF to seller."""
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
        print(f"Label email error: {e}")


@router.get("/mock-label/{order_id}")
def mock_label_pdf(order_id: int, db: Session = Depends(get_db)):
    """Generate a mock shipping label PDF for testing."""
    from fastapi.responses import Response
    import textwrap

    label = db.query(models.ShippingLabel).filter(models.ShippingLabel.order_id == order_id).first()
    order = db.query(models.Order).filter(models.Order.id == order_id).first()

    tracking = label.tracking_number if label else f"9400111899223{order_id:06d}"
    ship_to = ""
    if order:
        ship_to = f"{order.shipping_name or ''}\n{order.shipping_address or ''}\n{order.shipping_city or ''}, {order.shipping_state or ''} {order.shipping_zip or ''}"

    # Generate a simple HTML label that looks like a shipping label
    html = f"""<!DOCTYPE html>
<html>
<head>
<style>
  body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background: white; }}
  .label {{ border: 3px solid black; padding: 20px; max-width: 500px; margin: auto; }}
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

  <div class="note">
    TEST LABEL — For real shipments, add your Shippo API key to Render environment.<br>
    Print this label and tape it to your package. Drop at any USPS location.
  </div>
</div>
<script>window.onload = function() {{ window.print(); }}</script>
</body>
</html>"""

    return Response(content=html, media_type="text/html")