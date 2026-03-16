"""
Uber Direct integration for Afrizone — local hot food delivery.

Dynamic Pricing model:
  Customer pays = Real Uber Direct cost + $2.00 Afrizone margin
  Example: Uber charges $5.50 -> customer pays $7.50 -> Afrizone earns $2.00

  Sandbox fallback (no Uber credentials): distance-based estimate
    Base fee $3.50 + $0.90/mile + $2.00 margin
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

UBER_CLIENT_ID     = os.getenv("UBER_CLIENT_ID", "")
UBER_CLIENT_SECRET = os.getenv("UBER_CLIENT_SECRET", "")
UBER_CUSTOMER_ID   = os.getenv("UBER_CUSTOMER_ID", "")
UBER_SANDBOX       = os.getenv("UBER_SANDBOX", "true").lower() == "true"
UBER_BASE          = "https://api.uber.com"

AFRIZONE_MARGIN    = 2.00
SANDBOX_BASE_FEE   = 3.50
SANDBOX_PER_MILE   = 0.90


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3958.8
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def estimate_uber_cost(distance_miles: float) -> float:
    return round(SANDBOX_BASE_FEE + (SANDBOX_PER_MILE * distance_miles), 2)


def customer_price(uber_cost: float) -> float:
    return round(uber_cost + AFRIZONE_MARGIN, 2)


def zone_label(miles: float) -> str:
    if miles <= 3:  return "Nearby"
    if miles <= 7:  return "Local"
    if miles <= 12: return "Extended"
    return "Far"


async def get_uber_token() -> str:
    if not UBER_CLIENT_ID or not UBER_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Uber Direct not configured.")
    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://auth.uber.com/oauth/v2/token",
            data={
                "client_id":     UBER_CLIENT_ID,
                "client_secret": UBER_CLIENT_SECRET,
                "grant_type":    "client_credentials",
                "scope":         "eats.deliveries",
            },
            timeout=15,
        )
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="Uber auth failed: " + r.text)
        return r.json()["access_token"]


async def get_live_uber_quote(
    store, customer_lat: float, customer_lng: float,
    customer_address: str = "", distance_miles: float = 4.2
) -> dict:
    store_lat = getattr(store, 'latitude', None)
    store_lng = getattr(store, 'longitude', None)

    if UBER_CLIENT_ID and UBER_CLIENT_SECRET and UBER_CUSTOMER_ID:
        try:
            token = await get_uber_token()
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    f"{UBER_BASE}/v1/customers/{UBER_CUSTOMER_ID}/delivery_quotes",
                    json={
                        "pickup_address":       store.address or f"{store.city}, USA",
                        "dropoff_address":      customer_address,
                        "pickup_latitude":      store_lat or customer_lat,
                        "pickup_longitude":     store_lng or customer_lng,
                        "dropoff_latitude":     customer_lat,
                        "dropoff_longitude":    customer_lng,
                        "pickup_name":          store.name,
                        "dropoff_name":         "Customer",
                        "pickup_phone_number":  store.phone or "+14805550100",
                        "dropoff_phone_number": "+14805550100",
                        "manifest_items": [{"name": "Delivery", "quantity": 1, "size": "small", "price": 1000}],
                    },
                    headers={"Authorization": "Bearer " + token},
                    timeout=10,
                )
                if r.status_code == 200:
                    data = r.json()
                    fee_cents = data.get("fee", 0)
                    if fee_cents:
                        uber_cost = round(fee_cents / 100, 2)
                        eta_raw = data.get("duration", 2700) // 60
                        return {
                            "uber_cost":       uber_cost,
                            "customer_charge": customer_price(uber_cost),
                            "uber_quote_id":   data.get("quote_id"),
                            "eta_minutes":     max(eta_raw, 20),
                            "source":          "live",
                        }
        except Exception as e:
            print("Uber Quote live API failed: " + str(e))

    uber_cost = estimate_uber_cost(distance_miles)
    return {
        "uber_cost":       uber_cost,
        "customer_charge": customer_price(uber_cost),
        "uber_quote_id":   None,
        "eta_minutes":     max(20, int(distance_miles * 5)),
        "source":          "estimate",
    }


@router.get("/zones")
def get_delivery_zones():
    return {
        "pricing_model":      "dynamic",
        "afrizone_margin":    AFRIZONE_MARGIN,
        "note":               "Delivery fee = real Uber cost + $2.00 Afrizone service fee.",
        "sandbox":            UBER_SANDBOX,
        "zones": [
            {"zone": 1, "label": "Nearby",   "max_miles": 3,  "est_charge": customer_price(estimate_uber_cost(1.5))},
            {"zone": 2, "label": "Local",    "max_miles": 7,  "est_charge": customer_price(estimate_uber_cost(5.0))},
            {"zone": 3, "label": "Extended", "max_miles": 12, "est_charge": customer_price(estimate_uber_cost(9.0))},
            {"zone": 4, "label": "Far",      "max_miles": 20, "est_charge": customer_price(estimate_uber_cost(16.0))},
        ],
    }


@router.post("/quote")
async def get_delivery_quote(
    payload: dict,
    db: Session = Depends(get_db),
):
    store_id     = payload.get("store_id")
    customer_lat = payload.get("customer_lat")
    customer_lng = payload.get("customer_lng")

    if not all([store_id, customer_lat, customer_lng]):
        raise HTTPException(status_code=400, detail="store_id, customer_lat, customer_lng required")

    store = db.query(models.Store).filter(models.Store.id == store_id).first()
    if not store:
        est = customer_price(estimate_uber_cost(4.2))
        return {"sandbox": True, "distance_miles": 4.2, "delivery_fee": est, "eta_minutes": 45}

    store_lat = getattr(store, 'latitude', None)
    store_lng = getattr(store, 'longitude', None)

    if store_lat and store_lng and customer_lat and customer_lng:
        distance_miles = haversine_miles(store_lat, store_lng, float(customer_lat), float(customer_lng))
    else:
        distance_miles = 4.2

    quote = await get_live_uber_quote(
        store, float(customer_lat), float(customer_lng),
        payload.get("customer_address", ""), distance_miles
    )

    return {
        "available":         True,
        "distance_miles":    round(distance_miles, 1),
        "zone_label":        zone_label(distance_miles),
        "uber_cost":         quote["uber_cost"],
        "delivery_fee":      quote["customer_charge"],
        "afrizone_margin":   AFRIZONE_MARGIN,
        "estimated_minutes": quote["eta_minutes"],
        "uber_quote_id":     quote["uber_quote_id"],
        "price_source":      quote["source"],
        "sandbox":           UBER_SANDBOX,
    }


@router.post("/dispatch/{order_id}")
async def dispatch_uber_driver(
    order_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store or order.store_id != store.id:
        raise HTTPException(status_code=403, detail="Not your order")

    if order.status not in ["paid", "processing"]:
        raise HTTPException(status_code=400, detail="Cannot dispatch order with status: " + str(order.status))

    if not UBER_CLIENT_ID or not UBER_CLIENT_SECRET or not UBER_CUSTOMER_ID:
        order.status          = models.OrderStatus.shipped
        order.tracking_number = "UBER-SANDBOX-" + str(order_id)
        order.tracking_url    = "https://uber.com/track/sandbox"
        db.commit()
        return {
            "success":         True,
            "sandbox":         True,
            "message":         "Sandbox mode: Driver dispatch simulated.",
            "tracking_number": order.tracking_number,
            "tracking_url":    order.tracking_url,
            "delivery_id":     "sandbox-delivery-" + str(order_id),
        }

    try:
        token = await get_uber_token()
        async with httpx.AsyncClient() as client:
            delivery_payload = {
                "quote_id":             getattr(order, "uber_quote_id", None) or None,
                "pickup_name":          store.name,
                "pickup_address":       store.address or f"{store.city}, USA",
                "pickup_phone_number":  store.phone or "+14805550100",
                "pickup_notes":         "Order #" + str(order.id) + " - food should be ready and packaged",
                "dropoff_name":         order.shipping_name or "Customer",
                "dropoff_address":      str(order.shipping_address) + ", " + str(order.shipping_city) + ", " + str(order.shipping_state) + " " + str(order.shipping_zip),
                "dropoff_phone_number": "+14805550100",
                "dropoff_notes":        "",
                "manifest_items": [
                    {
                        "name":     item.product.name if item.product else "Food item",
                        "quantity": item.quantity,
                        "size":     "small",
                        "price":    int(item.unit_price * 100),
                    }
                    for item in (order.items or [])
                ],
            }
            r = await client.post(
                f"{UBER_BASE}/v1/customers/{UBER_CUSTOMER_ID}/deliveries",
                json=delivery_payload,
                headers={"Authorization": "Bearer " + token},
                timeout=30,
            )
            if r.status_code not in [200, 201]:
                err      = r.json() if "application/json" in r.headers.get("content-type", "") else {}
                code     = err.get("code", "")
                metadata = err.get("metadata", {})
                if code == "address_undeliverable":
                    details = metadata.get("details", "")
                    raise HTTPException(status_code=400, detail="Delivery unavailable: " + details)
                raise HTTPException(status_code=502, detail="Uber dispatch failed: " + r.text)

            data         = r.json()
            delivery_id  = data.get("id")
            tracking_url = data.get("tracking_url")
            order.status          = models.OrderStatus.shipped
            order.tracking_number = delivery_id
            order.tracking_url    = tracking_url
            db.commit()
            return {
                "success":      True,
                "sandbox":      False,
                "delivery_id":  delivery_id,
                "tracking_url": tracking_url,
                "message":      "Uber driver dispatched! Customer will be notified.",
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail="Uber Direct error: " + str(e))


@router.get("/status/{order_id}")
async def get_delivery_status(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.buyer_id != current_user.id and current_user.role not in ["seller", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    if not order.tracking_number or not order.tracking_number.startswith("UBER"):
        return {"status": order.status, "uber_delivery": False}

    if UBER_SANDBOX or order.tracking_number.startswith("UBER-SANDBOX"):
        return {
            "status":       "en_route_to_dropoff",
            "sandbox":      True,
            "driver":       {"name": "Test Driver", "phone": "+14805550100", "location": None},
            "tracking_url": order.tracking_url,
            "eta_minutes":  12,
        }

    try:
        token       = await get_uber_token()
        delivery_id = order.tracking_number
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{UBER_BASE}/v1/customers/{UBER_CUSTOMER_ID}/deliveries/{delivery_id}",
                headers={"Authorization": "Bearer " + token},
                timeout=15,
            )
            if r.status_code != 200:
                return {"status": order.status, "error": "Could not fetch live status"}
            data = r.json()
            return {
                "status":       data.get("status"),
                "sandbox":      False,
                "driver":       data.get("courier"),
                "tracking_url": data.get("tracking_url"),
                "eta_minutes":  data.get("dropoff_eta"),
            }
    except Exception as e:
        return {"status": order.status, "error": str(e)}


@router.post("/webhook")
async def uber_webhook(
    payload: dict,
    db: Session = Depends(get_db),
):
    event_type  = payload.get("event_type", "")
    delivery_id = payload.get("delivery_id", "")
    print("Uber Webhook: " + event_type + " delivery " + delivery_id)

    order = db.query(models.Order).filter(
        models.Order.tracking_number == delivery_id
    ).first()

    if not order:
        return {"received": True}

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


@router.get("/geocode")
async def geocode_address(address: str, city: str, state: str, zip: str):
    try:
        url = (
            "https://nominatim.openstreetmap.org/search"
            "?format=json&limit=1"
            "&street=" + address +
            "&city=" + city +
            "&state=" + state +
            "&postalcode=" + zip +
            "&country=USA"
        )
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url, headers={"User-Agent": "Afrizone/1.0 (afrizoneshop.com)"})
            data = r.json()
            if data:
                return {"lat": float(data[0]["lat"]), "lng": float(data[0]["lon"]), "found": True}
            return {"lat": None, "lng": None, "found": False}
    except Exception as e:
        print("Geocode failed: " + str(e))
        return {"lat": None, "lng": None, "found": False}


@router.post("/delivery-options")
async def get_delivery_options(
    payload: dict,
    db: Session = Depends(get_db),
):
    store_id         = payload.get("store_id")
    customer_lat     = float(payload.get("customer_lat") or 0) or None
    customer_lng     = float(payload.get("customer_lng") or 0) or None
    customer_address = payload.get("customer_address", "")

    if not store_id:
        raise HTTPException(status_code=400, detail="store_id required")

    store = db.query(models.Store).filter(models.Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    if store.latitude and store.longitude and customer_lat and customer_lng:
        distance_miles = haversine_miles(store.latitude, store.longitude, float(customer_lat), float(customer_lng))
    else:
        distance_miles = 4.2

    is_restaurant = store.vendor_type == "restaurant"

    quote    = await get_live_uber_quote(store, customer_lat or 0, customer_lng or 0, customer_address, distance_miles)
    uber_fee = quote["customer_charge"]
    z_label  = zone_label(distance_miles)

    options = []

    if is_restaurant:
        options.append({
            "id":            "uber_express",
            "label":         "Uber Express Delivery",
            "icon":          "🛵",
            "price":         uber_fee,
            "shipping_cost": uber_fee,
            "eta":           "~" + str(quote["eta_minutes"]) + " minutes",
            "description":   "Hot food delivered fresh to your door.",
            "provider":      "uber_direct",
            "available":     True,
            "uber_quote_id": quote["uber_quote_id"],
            "sandbox":       UBER_SANDBOX,
        })
    else:
        options.append({
            "id":            "uber_express",
            "label":         "Uber Express Delivery",
            "icon":          "🛵",
            "price":         uber_fee,
            "shipping_cost": uber_fee,
            "eta":           "~" + str(quote["eta_minutes"]) + " minutes",
            "description":   "Fast same-day delivery to your door.",
            "provider":      "uber_direct",
            "available":     True,
            "uber_quote_id": quote["uber_quote_id"],
            "sandbox":       UBER_SANDBOX,
        })
        options.append({
            "id":            "usps_standard",
            "label":         "USPS Standard Shipping",
            "icon":          "📦",
            "price":         4.99,
            "shipping_cost": 4.99,
            "eta":           "2-3 business days",
            "description":   "Reliable tracked shipping nationwide.",
            "provider":      "usps",
            "available":     True,
        })
        options.append({
            "id":            "usps_priority",
            "label":         "USPS Priority Shipping",
            "icon":          "📬",
            "price":         6.99,
            "shipping_cost": 6.99,
            "eta":           "1-2 business days",
            "description":   "Faster tracked shipping with Shippo label.",
            "provider":      "usps",
            "available":     True,
        })

    return {
        "distance_miles":    round(distance_miles, 1),
        "distance_zone":     z_label,
        "store_vendor_type": store.vendor_type,
        "options":           options,
        "sandbox":           UBER_SANDBOX,
    }