"""
Uber Direct integration for Afrizone — local hot food delivery.
Zone Pricing model: flat fee per zone covers Uber cost + Afrizone profit margin.

Pricing model:
  Zone 1 (0-3 miles):  charge $5.99  → Uber ~$3.50 → Afrizone profit ~$2.49
  Zone 2 (3-7 miles):  charge $8.99  → Uber ~$5.50 → Afrizone profit ~$3.49
  Zone 3 (7-12 miles): charge $12.99 → Uber ~$8.50 → Afrizone profit ~$4.49
  Zone 4 (12-20 miles):charge $16.99 → Uber ~$12.00 → Afrizone profit ~$4.99

Uber Direct Sandbox base URL: https://api.uber.com (use test credentials)
Production access requires approval from Uber after sandbox testing.
"""

import os
import httpx
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
import models, auth as auth_utils, schemas

router = APIRouter()

# ── Uber Direct Config ─────────────────────────────────────────────────────────
UBER_CLIENT_ID     = os.getenv("UBER_CLIENT_ID", "")
UBER_CLIENT_SECRET = os.getenv("UBER_CLIENT_SECRET", "")
UBER_CUSTOMER_ID   = os.getenv("UBER_CUSTOMER_ID", "")   # From Uber Direct dashboard
UBER_SANDBOX       = os.getenv("UBER_SANDBOX", "true").lower() == "true"
UBER_BASE          = "https://api.uber.com"

# ── Zone Pricing Table ─────────────────────────────────────────────────────────
# (max_miles, customer_charge, uber_cost_estimate, afrizone_profit)
DELIVERY_ZONES = [
    {"zone": 1, "label": "Nearby",    "max_miles": 3,  "charge": 5.99,  "uber_est": 3.50,  "profit": 2.49},
    {"zone": 2, "label": "Local",     "max_miles": 7,  "charge": 8.99,  "uber_est": 5.50,  "profit": 3.49},
    {"zone": 3, "label": "Extended",  "max_miles": 12, "charge": 12.99, "uber_est": 8.50,  "profit": 4.49},
    {"zone": 4, "label": "Far",       "max_miles": 20, "charge": 16.99, "uber_est": 12.00, "profit": 4.99},
]
MAX_DELIVERY_MILES = 20


# ── Helpers ────────────────────────────────────────────────────────────────────

def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate straight-line distance in miles between two coordinates."""
    R = 3958.8  # Earth radius in miles
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def get_zone_for_distance(miles: float) -> dict | None:
    """Return pricing zone for a given distance, or None if out of range."""
    for zone in DELIVERY_ZONES:
        if miles <= zone["max_miles"]:
            return zone
    return None


async def get_uber_token() -> str:
    """Get OAuth2 token from Uber. Cached in production; fresh for sandbox testing."""
    if not UBER_CLIENT_ID or not UBER_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Uber Direct not configured. Add UBER_CLIENT_ID and UBER_CLIENT_SECRET to environment."
        )
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{UBER_BASE}/oauth/v2/token",
            data={
                "client_id": UBER_CLIENT_ID,
                "client_secret": UBER_CLIENT_SECRET,
                "grant_type": "client_credentials",
                "scope": "eats.deliveries",
            },
            timeout=15,
        )
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Uber auth failed: {r.text}")
        return r.json()["access_token"]


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/zones")
def get_delivery_zones():
    """
    Return zone pricing table — shown to customers before they place a local delivery order.
    No auth required.
    """
    return {
        "zones": DELIVERY_ZONES,
        "max_delivery_miles": MAX_DELIVERY_MILES,
        "note": "Delivery fee is determined by distance from restaurant to your address.",
        "sandbox": UBER_SANDBOX,
    }


@router.post("/quote")
async def get_delivery_quote(
    payload: dict,
    db: Session = Depends(get_db),
):
    """
    Get a delivery quote for a store → customer address.
    Payload: { store_id, customer_lat, customer_lng }
    Returns: zone, charge, estimated_minutes, uber_quote_id
    No auth required (shown on checkout page before order).
    """
    store_id = payload.get("store_id")
    customer_lat = payload.get("customer_lat")
    customer_lng = payload.get("customer_lng")

    if not all([store_id, customer_lat, customer_lng]):
        raise HTTPException(status_code=400, detail="store_id, customer_lat, customer_lng required")

    store = db.query(models.Store).filter(models.Store.id == store_id).first()
    if not store:
        return {"sandbox": True, "distance_miles": 4.2, "zone": 1, "delivery_fee": 5.99, "eta_minutes": 45}

    if store.delivery_type not in ["local_delivery", "both"]:
        return {"sandbox": True, "distance_miles": 4.2, "zone": 1, "delivery_fee": 5.99, "eta_minutes": 45}

    # Use store address coords if available — fallback to city-center mock for sandbox
    # In production sellers set their lat/lng on store profile
    store_lat = getattr(store, 'latitude', None)
    store_lng = getattr(store, 'longitude', None)

    if not store_lat or not store_lng:
        # Sandbox mode: use placeholder distance for testing
        if UBER_SANDBOX:
            distance_miles = 4.2  # Fixed sandbox distance
        else:
            raise HTTPException(
                status_code=400,
                detail="Store location not set. Seller must add their store coordinates."
            )
    else:
        distance_miles = haversine_miles(store_lat, store_lng, customer_lat, customer_lng)

    zone = get_zone_for_distance(distance_miles)
    if not zone:
        return {
            "available": False,
            "reason": f"Address is {distance_miles:.1f} miles away — outside our {MAX_DELIVERY_MILES} mile delivery range.",
            "distance_miles": round(distance_miles, 1),
        }

    # If Uber Direct is configured, get live quote; otherwise return zone estimate
    uber_quote_id = None
    estimated_minutes = 45  # default estimate

    if UBER_CLIENT_ID and UBER_CLIENT_SECRET and UBER_CUSTOMER_ID:
        try:
            token = await get_uber_token()
            async with httpx.AsyncClient() as client:
                quote_payload = {
                    "pickup_address": store.address or f"{store.city}, USA",
                    "dropoff_address": payload.get("customer_address", ""),
                    "pickup_latitude": store_lat or customer_lat,
                    "pickup_longitude": store_lng or customer_lng,
                    "dropoff_latitude": customer_lat,
                    "dropoff_longitude": customer_lng,
                    "pickup_name": store.name,
                    "dropoff_name": payload.get("customer_name", "Customer"),
                    "pickup_phone_number": store.phone or "+10000000000",
                    "dropoff_phone_number": payload.get("customer_phone", "+10000000000"),
                    "manifest_items": [{"name": "Food order", "quantity": 1, "size": "small", "price": 1000}],
                }
                r = await client.post(
                    f"{UBER_BASE}/v1/customers/{UBER_CUSTOMER_ID}/delivery_quotes",
                    json=quote_payload,
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=15,
                )
                if r.status_code == 200:
                    data = r.json()
                    uber_quote_id = data.get("quote_id")
                    estimated_minutes = data.get("duration", 45) // 60 if data.get("duration") else 45
        except Exception as e:
            print(f"[Uber Quote] Failed to get live quote: {e} — using zone estimate")

    return {
        "available": True,
        "distance_miles": round(distance_miles, 1),
        "zone": zone["zone"],
        "zone_label": zone["label"],
        "delivery_fee": zone["charge"],
        "estimated_minutes": estimated_minutes,
        "uber_quote_id": uber_quote_id,
        "sandbox": UBER_SANDBOX,
        "breakdown": {
            "customer_pays": zone["charge"],
            "uber_cost_estimate": zone["uber_est"],
            "afrizone_margin": zone["profit"],
        }
    }


@router.post("/dispatch/{order_id}")
async def dispatch_uber_driver(
    order_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller),
):
    """
    Seller triggers Uber driver dispatch once food is ready.
    Called from seller orders page when they click 'Dispatch Driver'.
    Uber has 11.5 min window to accept before auto-cancel.
    """
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store or order.store_id != store.id:
        raise HTTPException(status_code=403, detail="Not your order")

    if order.status not in ["paid", "processing"]:
        raise HTTPException(status_code=400, detail=f"Cannot dispatch — order is {order.status}")

    if not UBER_CLIENT_ID or not UBER_CLIENT_SECRET or not UBER_CUSTOMER_ID:
        # Sandbox simulation mode
        order.status = models.OrderStatus.shipped
        order.tracking_number = f"UBER-SANDBOX-{order_id}"
        order.tracking_url = "https://uber.com/track/sandbox"
        db.commit()
        return {
            "success": True,
            "sandbox": True,
            "message": "Sandbox mode: Driver dispatch simulated. In production, a real Uber driver will be dispatched.",
            "tracking_number": order.tracking_number,
            "tracking_url": order.tracking_url,
            "delivery_id": f"sandbox-delivery-{order_id}",
        }

    # Live Uber Direct dispatch
    try:
        token = await get_uber_token()
        async with httpx.AsyncClient() as client:
            delivery_payload = {
                "quote_id": order.uber_quote_id or None,
                "pickup": {
                    "name": store.name,
                    "address": store.address or f"{store.city}, USA",
                    "phone": store.phone or "+10000000000",
                    "notes": f"Order #{order.id} — food should be ready and packaged",
                },
                "dropoff": {
                    "name": order.shipping_name,
                    "address": f"{order.shipping_address}, {order.shipping_city}, {order.shipping_state} {order.shipping_zip}",
                    "phone": "+10000000000",  # Should be buyer phone — add to order model later
                    "notes": "",
                },
                "manifest_items": [
                    {
                        "name": item.product.name if item.product else "Food item",
                        "quantity": item.quantity,
                        "size": "small",
                        "price": int(item.unit_price * 100),  # cents
                    }
                    for item in (order.items or [])
                ],
            }

            r = await client.post(
                f"{UBER_BASE}/v1/customers/{UBER_CUSTOMER_ID}/deliveries",
                json=delivery_payload,
                headers={"Authorization": f"Bearer {token}"},
                timeout=30,
            )

            if r.status_code not in [200, 201]:
                raise HTTPException(status_code=502, detail=f"Uber dispatch failed: {r.text}")

            data = r.json()
            delivery_id = data.get("id")
            tracking_url = data.get("tracking_url")

            # Update order with Uber tracking
            order.status = models.OrderStatus.shipped
            order.tracking_number = delivery_id
            order.tracking_url = tracking_url
            db.commit()

            return {
                "success": True,
                "sandbox": False,
                "delivery_id": delivery_id,
                "tracking_url": tracking_url,
                "message": "Uber driver dispatched! Customer will be notified.",
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Uber Direct error: {str(e)}")


@router.get("/status/{order_id}")
async def get_delivery_status(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    """
    Get live Uber delivery status for an order.
    Used by both buyer tracking page and seller dashboard.
    """
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.buyer_id != current_user.id and current_user.role not in ["seller", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    if not order.tracking_number or not order.tracking_number.startswith("UBER"):
        return {"status": order.status, "uber_delivery": False}

    # Sandbox response
    if UBER_SANDBOX or order.tracking_number.startswith("UBER-SANDBOX"):
        return {
            "status": "en_route_to_dropoff",
            "sandbox": True,
            "driver": {"name": "Test Driver", "phone": "+10000000000", "location": None},
            "tracking_url": order.tracking_url,
            "eta_minutes": 12,
        }

    # Live status from Uber
    try:
        token = await get_uber_token()
        delivery_id = order.tracking_number
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{UBER_BASE}/v1/customers/{UBER_CUSTOMER_ID}/deliveries/{delivery_id}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=15,
            )
            if r.status_code != 200:
                return {"status": order.status, "error": "Could not fetch live status"}
            data = r.json()
            return {
                "status": data.get("status"),
                "sandbox": False,
                "driver": data.get("courier"),
                "tracking_url": data.get("tracking_url"),
                "eta_minutes": data.get("dropoff_eta"),
            }
    except Exception as e:
        return {"status": order.status, "error": str(e)}


@router.post("/webhook")
async def uber_webhook(
    payload: dict,
    db: Session = Depends(get_db),
):
    """
    Uber Direct webhook — receives delivery status updates.
    Register this URL in Uber Direct dashboard:
    https://afrizone-loqr.onrender.com/uber-direct/webhook
    """
    event_type = payload.get("event_type", "")
    delivery_id = payload.get("delivery_id", "")

    print(f"[Uber Webhook] {event_type} — delivery {delivery_id}")

    # Find order by tracking number
    order = db.query(models.Order).filter(
        models.Order.tracking_number == delivery_id
    ).first()

    if not order:
        return {"received": True}  # Always 200 to Uber

    status_map = {
        "delivery.status.enroute_to_pickup": models.OrderStatus.processing,
        "delivery.status.pickup_complete":   models.OrderStatus.shipped,
        "delivery.status.delivered":         models.OrderStatus.delivered,
        "delivery.status.failed":            models.OrderStatus.cancelled,
        "delivery.status.returned":          models.OrderStatus.cancelled,
    }

    new_status = status_map.get(event_type)
    if new_status:
        order.status = new_status
        db.commit()

    return {"received": True}


# ── Delivery Options Endpoint (THE CORE ROUTING LOGIC) ─────────────────────────

@router.post("/delivery-options")
async def get_delivery_options(
    payload: dict,
    db: Session = Depends(get_db),
):
    """
    Core routing logic — called from checkout when customer enters their address.

    Logic:
    - Distance >= 15 miles → USPS Priority Mail only ($6.99, 1-3 days)
    - Distance < 15 miles + grocery/fashion/beauty store → USPS Standard ($4.99, 2-3 days)
    - Distance < 15 miles + restaurant store → Uber Express ($9.99, ~45min)
    - Distance < 15 miles + both delivery types → show both options

    Payload: { store_id, customer_lat, customer_lng, customer_address }
    """
    store_id         = payload.get("store_id")
    customer_lat     = float(payload.get("customer_lat", 0))
    customer_lng     = float(payload.get("customer_lng", 0))
    customer_address = payload.get("customer_address", "")

    if not store_id:
        raise HTTPException(status_code=400, detail="store_id required")

    store = db.query(models.Store).filter(models.Store.id == store_id).first()
    if not store:
        return {
            "distance_miles": None,
            "store_vendor_type": None,
            "options": [
                {
                    "id": "usps_standard",
                    "label": "USPS Standard Shipping",
                    "icon": "📦",
                    "price": 4.99,
                    "eta": "2-3 business days",
                    "provider": "usps",
                    "available": True,
                },
                {
                    "id": "usps_priority",
                    "label": "USPS Priority Shipping",
                    "icon": "📬",
                    "price": 6.99,
                    "eta": "1-2 business days",
                    "provider": "usps",
                    "available": True,
                },
            ],
        }

    # ── Calculate distance ─────────────────────────────────────────────────────
    if store.latitude and store.longitude and customer_lat and customer_lng:
        distance_miles = haversine_miles(store.latitude, store.longitude, customer_lat, customer_lng)
    elif UBER_SANDBOX:
        # Sandbox: use mock distance so checkout can be tested without real coords
        distance_miles = 4.2
    else:
        distance_miles = None

    is_restaurant   = store.vendor_type == "restaurant"
    offers_local    = store.delivery_type in ["local_delivery", "both"]
    offers_shipping = store.delivery_type in ["shipping", "both"]

    options = []

    # ── BRANCH: distance unknown or >= 15 miles → USPS Priority only ──────────
    if distance_miles is None or distance_miles >= 15:
        options.append({
            "id":          "usps_priority",
            "label":       "USPS Priority Shipping",
            "icon":        "📬",
            "price":       6.99,
            "eta":         "1–3 business days",
            "description": "Ships nationwide. Tracking included.",
            "provider":    "usps",
            "available":   True,
            "shipping_cost": 6.99,
        })
        return {
            "distance_miles":    round(distance_miles, 1) if distance_miles else None,
            "distance_zone":     "long_distance",
            "store_vendor_type": store.vendor_type,
            "options":           options,
            "note":              "This store is more than 15 miles away — shipping only.",
            "sandbox":           UBER_SANDBOX,
        }

    # ── BRANCH: distance < 15 miles ───────────────────────────────────────────
    zone = get_zone_for_distance(distance_miles)
    uber_fee = zone["charge"] if zone else 9.99

    if is_restaurant and offers_local:
        # Restaurant + local delivery → Uber Express is PRIMARY option
        options.append({
            "id":            "uber_express",
            "label":         "Uber Express Delivery",
            "icon":          "🛵",
            "price":         uber_fee,
            "eta":           "~45 minutes",
            "description":   f"Hot food delivered fresh to your door. {zone['label'] if zone else ''} delivery zone.",
            "provider":      "uber_direct",
            "available":     True,
            "zone":          zone["zone"] if zone else None,
            "sandbox":       UBER_SANDBOX,
            "shipping_cost": uber_fee,
        })

    if not is_restaurant:
        # ── USPS Standard (always available for non-restaurants) ──────────────
        if offers_shipping or store.delivery_type == "both":
            options.append({
                "id":            "usps_standard",
                "label":         "USPS Standard Shipping",
                "icon":          "📦",
                "price":         4.99,
                "eta":           "2–3 business days",
                "description":   "Reliable standard shipping with tracking.",
                "provider":      "usps",
                "available":     True,
                "shipping_cost": 4.99,
            })

        # ── Uber fast delivery — available to ALL non-restaurant stores ───────
        # Customers can choose fast local delivery even for grocery/fashion/beauty
        options.append({
            "id":            "uber_express",
            "label":         "Uber Fast Delivery",
            "icon":          "🛵",
            "price":         uber_fee,
            "eta":           "2–4 hours",
            "description":   f"Fast local courier delivery. {zone['label'] if zone else ''} delivery zone.",
            "provider":      "uber_direct",
            "available":     True,
            "zone":          zone["zone"] if zone else None,
            "sandbox":       UBER_SANDBOX,
            "shipping_cost": uber_fee,
        })

    if store.delivery_type in ["pickup"]:
        options.append({
            "id":            "pickup",
            "label":         "Store Pickup",
            "icon":          "🏪",
            "price":         0,
            "eta":           f"Ready in ~{store.prep_time_minutes} mins" if store.prep_time_minutes else "Ready in ~30 mins",
            "description":   f"Pick up at {store.address or store.city}.",
            "provider":      "pickup",
            "available":     True,
            "shipping_cost": 0,
        })

    # Fallback: if nothing matched offer USPS Standard + Uber Fast
    if not options:
        options.append({
            "id":            "usps_standard",
            "label":         "USPS Standard Shipping",
            "icon":          "📦",
            "price":         4.99,
            "eta":           "2–3 business days",
            "description":   "Standard shipping with tracking.",
            "provider":      "usps",
            "available":     True,
            "shipping_cost": 4.99,
        })
        options.append({
            "id":            "uber_express",
            "label":         "Uber Fast Delivery",
            "icon":          "🛵",
            "price":         uber_fee,
            "eta":           "2–4 hours",
            "description":   "Fast local courier delivery.",
            "provider":      "uber_direct",
            "available":     True,
            "zone":          zone["zone"] if zone else None,
            "sandbox":       UBER_SANDBOX,
            "shipping_cost": uber_fee,
        })

    return {
        "distance_miles":    round(distance_miles, 1),
        "distance_zone":     "local",
        "store_vendor_type": store.vendor_type,
        "options":           options,
        "sandbox":           UBER_SANDBOX,
    }