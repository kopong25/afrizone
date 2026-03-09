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
    rate_id: str = "auto",
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
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

    if not SHIPPO_API_KEY or rate_id.startswith("mock_") or rate_id == "auto":
        # Mock label for testing
        label = models.ShippingLabel(
            order_id=order_id, carrier="USPS", service="Priority Mail",
            tracking_number=f"9400111899223{order_id:06d}",
            label_url="https://shippo-static.s3.amazonaws.com/providers/usps/USPS.pdf",
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