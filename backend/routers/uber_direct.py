"""
routers/uber_direct.py - Afrizone delivery routing
"""

import os
import httpx
import math
import time
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
import models, auth as auth_utils, schemas

router = APIRouter()
logger = logging.getLogger(__name__)

UBER_CLIENT_ID     = os.getenv("UBER_CLIENT_ID", "")
UBER_CLIENT_SECRET = os.getenv("UBER_CLIENT_SECRET", "")
UBER_CUSTOMER_ID   = os.getenv("UBER_CUSTOMER_ID", "")
UBER_SANDBOX       = os.getenv("UBER_SANDBOX", "true").lower() == "true"
UBER_BASE          = "https://api.uber.com"

SHIPPO_TOKEN       = os.getenv("SHIPPO_API_KEY") or os.getenv("SHIPPO_TOKEN", "")
SHIPPO_BASE_URL    = "https://api.goshippo.com"

AFRIZONE_MARGIN    = 2.00
MAX_DELIVERY_MILES = 20
SANDBOX_BASE_FEE   = 3.50
SANDBOX_PER_MILE   = 0.90

# FIX: Cap USPS rates - never charge more than these maximums
MAX_USPS_PRIORITY   = 14.99
MAX_USPS_GROUND     = 9.99
MAX_USPS_FIRST_CLASS = 6.99

DELIVERY_ZONES = [
    {"zone": "zone_1", "label": "Nearby",   "min_miles": 0,  "max_miles": 3,  "charge": 5.99,  "uber_est": 3.50,  "profit": 2.49},
    {"zone": "zone_2", "label": "Local",    "min_miles": 3,  "max_miles": 7,  "charge": 8.99,  "uber_est": 5.50,  "profit": 3.49},
    {"zone": "zone_3", "label": "Extended", "min_miles": 7,  "max_miles": 12, "charge": 12.99, "uber_est": 8.50,  "profit": 4.49},
    {"zone": "zone_4", "label": "Far",      "min_miles": 12, "max_miles": 20, "charge": 16.99, "uber_est": 12.00, "profit": 4.99},
]

_uber_token_cache: dict = {"token": None, "expires_at": 0.0}


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3958.8
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _geocode(address: str, city: str, state: str, zip_: str, country: str = "US"):
    try:
        q = f"{address}, {city}, {state} {zip_}, {country}"
        resp = httpx.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": q, "format": "json", "limit": 1},
            headers={"User-Agent": "Afrizone/1.0"},
            timeout=8.0,
        )
        results = resp.json()
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception as e:
        logger.warning(f"[Geocode] Failed: {e}")
    return None


def estimate_uber_cost(distance_miles: float) -> float:
    return round(SANDBOX_BASE_FEE + (SANDBOX_PER_MILE * distance_miles), 2)


def customer_price(uber_cost: float) -> float:
    return round(uber_cost + AFRIZONE_MARGIN, 2)


def get_zone_label(miles: float) -> str:
    if miles <= 3:  return "Nearby"
    if miles <= 7:  return "Local"
    if miles <= 12: return "Extended"
    return "Far"


def get_zone_for_distance(distance_miles: float):
    if distance_miles > MAX_DELIVERY_MILES:
        return None
    for zone in DELIVERY_ZONES:
        if zone["min_miles"] <= distance_miles < zone["max_miles"]:
            return zone
    if distance_miles == MAX_DELIVERY_MILES:
        return DELIVERY_ZONES[-1]
    return None


def _parcel_for_weight(weight_lbs: float) -> dict:
    w = str(round(max(weight_lbs, 0.1), 2))
    if weight_lbs <= 0.5:
        return {"length": "6", "width": "9", "height": "2", "distance_unit": "in", "weight": w, "mass_unit": "lb"}
    if weight_lbs <= 2.0:
        return {"length": "10", "width": "8", "height": "6", "distance_unit": "in", "weight": w, "mass_unit": "lb"}
    return {"length": "12", "width": "12", "height": "8", "distance_unit": "in", "weight": w, "mass_unit": "lb"}


def _validate_shippo_address(addr: dict) -> dict:
    if not SHIPPO_TOKEN:
        return addr
    try:
        resp = httpx.post(
            f"{SHIPPO_BASE_URL}/addresses/",
            json={**addr, "validate": True},
            headers={"Authorization": f"ShippoToken {SHIPPO_TOKEN}", "Content-Type": "application/json"},
            timeout=8.0,
        )
        if resp.status_code == 201:
            data = resp.json()
            if data.get("validation_results", {}).get("is_valid"):
                return {
                    "name": addr.get("name", ""),
                    "street1": data.get("street1") or addr["street1"],
                    "city": data.get("city") or addr["city"],
                    "state": data.get("state") or addr["state"],
                    "zip": data.get("zip") or addr["zip"],
                    "country": data.get("country") or addr.get("country", "US"),
                }
    except Exception as e:
        logger.warning(f"[Shippo] Address validation error: {e}")
    return addr


def _fetch_live_usps_rate(from_addr: dict, to_addr: dict, weight_lbs: float = 0.5) -> dict:
    """
    Fetch USPS rates from Shippo with hard caps to prevent abnormal rates.
    Caps: Priority $14.99, Ground $9.99, First Class $6.99
    """
    FALLBACK = {"priority": 8.99, "ground": 4.99, "first_class": None, "mock": True}

    if not SHIPPO_TOKEN:
        return FALLBACK

    to_addr = _validate_shippo_address(to_addr)

    try:
        parcel = _parcel_for_weight(weight_lbs)
        resp = httpx.post(
            f"{SHIPPO_BASE_URL}/shipments/",
            json={"address_from": from_addr, "address_to": to_addr, "parcels": [parcel], "async": False},
            headers={"Authorization": f"ShippoToken {SHIPPO_TOKEN}", "Content-Type": "application/json"},
            timeout=12.0,
        )
        resp.raise_for_status()
        rates = resp.json().get("rates", [])

        usps = [r for r in rates if r.get("provider", "").upper() == "USPS" and r.get("amount")]
        if not usps:
            return FALLBACK

        def _find(keyword: str):
            if keyword == "FIRST":
                return next((r for r in usps if "FIRST CLASS PACKAGE" in r.get("servicelevel", {}).get("name", "").upper()), None)
            return next((r for r in usps if keyword in r.get("servicelevel", {}).get("name", "").upper()), None)

        priority_rate    = _find("PRIORITY")
        ground_rate      = _find("GROUND") or _find("ADVANTAGE")
        first_class_rate = _find("FIRST") if weight_lbs < 1.0 else None

        def _safe_rate(rate_obj, max_price, fallback_price):
            """
            Return rate amount, capped at max_price.
            If Shippo returns anything above max (abnormal rate), use fallback.
            """
            if rate_obj is None:
                return None
            try:
                raw = round(float(rate_obj["amount"]), 2)
                if raw > max_price:
                    logger.warning(f"[Shippo] Abnormal rate ${raw} capped to ${fallback_price}")
                    return fallback_price
                return raw
            except Exception:
                return fallback_price

        priority_price    = _safe_rate(priority_rate,    MAX_USPS_PRIORITY,    8.99)
        ground_price      = _safe_rate(ground_rate,      MAX_USPS_GROUND,      4.99) if ground_rate and ground_rate != priority_rate else None
        first_class_price = _safe_rate(first_class_rate, MAX_USPS_FIRST_CLASS, 4.49) if first_class_rate else None

        result = {
            "mock":            False,
            "priority":        priority_price or FALLBACK["priority"],
            "ground":          ground_price,
            "first_class":     first_class_price,
            "first_class_eta": first_class_rate.get("estimated_days") if first_class_rate else None,
            "priority_eta":    priority_rate.get("estimated_days")    if priority_rate else None,
            "ground_eta":      ground_rate.get("estimated_days")      if ground_rate else None,
        }
        logger.info(f"[Shippo] Priority=${result['priority']} Ground={result['ground']} FC={result['first_class']}")
        return result

    except Exception as e:
        logger.error(f"[Shippo] Rate fetch error: {e}")
        return FALLBACK


async def get_uber_token() -> str:
    now = time.time()
    if _uber_token_cache["token"] and now < _uber_token_cache["expires_at"] - 30:
        return _uber_token_cache["token"]
    if not UBER_CLIENT_ID or not UBER_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Uber Direct not configured.")
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{UBER_BASE}/oauth/v2/token",
            data={"client_id": UBER_CLIENT_ID, "client_secret": UBER_CLIENT_SECRET, "grant_type": "client_credentials", "scope": "eats.deliveries"},
            timeout=15,
        )
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Uber auth failed: {r.text}")
        data = r.json()
        _uber_token_cache["token"]      = data["access_token"]
        _uber_token_cache["expires_at"] = now + data.get("expires_in", 3600)
        return _uber_token_cache["token"]


def verify_uber_quote(quote_id: str, expected_fee_cents: int) -> float:
    if not all([UBER_CLIENT_ID, UBER_CLIENT_SECRET, UBER_CUSTOMER_ID]):
        return round(expected_fee_cents / 100, 2)
    try:
        resp_token = httpx.post(
            f"{UBER_BASE}/oauth/v2/token",
            data={"client_id": UBER_CLIENT_ID, "client_secret": UBER_CLIENT_SECRET, "grant_type": "client_credentials", "scope": "eats.deliveries"},
            timeout=10.0,
        )
        resp_token.raise_for_status()
        token = resp_token.json()["access_token"]
        resp = httpx.get(
            f"{UBER_BASE}/v1/customers/{UBER_CUSTOMER_ID}/delivery_quotes/{quote_id}",
            headers={"Authorization": f"Bearer {token}"}, timeout=10.0,
        )
        if resp.status_code == 404:
            raise HTTPException(status_code=400, detail="Uber delivery quote expired.")
        resp.raise_for_status()
        data = resp.json()
        live_cents = data.get("fee", expected_fee_cents)
        live_fee   = round(live_cents / 100, 2)
        original   = expected_fee_cents / 100
        if original > 0 and abs(live_fee - original) / original > 0.20:
            raise HTTPException(status_code=400, detail=f"Uber fee changed from ${original:.2f} to ${live_fee:.2f}.")
        return live_fee
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Uber] Quote verify error: {e}")
        return round(expected_fee_cents / 100, 2)


async def get_uber_fee(store, customer_lat: float, customer_lng: float, customer_address: str = "") -> float:
    store_lat = getattr(store, "latitude", None)
    store_lng = getattr(store, "longitude", None)
    distance  = (haversine_miles(store_lat, store_lng, customer_lat, customer_lng)
                 if (store_lat and store_lng and customer_lat and customer_lng) else 4.2)
    if UBER_CLIENT_ID and UBER_CLIENT_SECRET and UBER_CUSTOMER_ID:
        try:
            token = await get_uber_token()
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    f"{UBER_BASE}/v1/customers/{UBER_CUSTOMER_ID}/delivery_quotes",
                    json={"pickup_address": store.address or f"{store.city}, USA", "dropoff_address": customer_address,
                          "pickup_latitude": store_lat or customer_lat, "pickup_longitude": store_lng or customer_lng,
                          "dropoff_latitude": customer_lat, "dropoff_longitude": customer_lng,
                          "pickup_name": store.name, "manifest_items": [{"name": "Order", "quantity": 1, "size": "small", "price": 1000}]},
                    headers={"Authorization": f"Bearer {token}"}, timeout=10,
                )
                if r.status_code == 200:
                    fee_cents = r.json().get("fee", 0)
                    if fee_cents:
                        return round(fee_cents / 100, 2)
        except Exception as e:
            logger.warning(f"[Uber Fee] {e} — using estimate")
    return estimate_uber_cost(distance)


@router.get("/zones")
def get_delivery_zones():
    return {"zones": DELIVERY_ZONES, "max_delivery_miles": MAX_DELIVERY_MILES, "sandbox": UBER_SANDBOX}


@router.post("/quote")
async def get_delivery_quote(payload: dict, db: Session = Depends(get_db)):
    store_id     = payload.get("store_id")
    customer_lat = payload.get("customer_lat")
    customer_lng = payload.get("customer_lng")
    if not (customer_lat and customer_lng):
        coords = _geocode(payload.get("address", payload.get("customer_address", "")), payload.get("city", ""), payload.get("state", ""), payload.get("zip", ""))
        if coords:
            customer_lat, customer_lng = coords
    customer_lat = float(customer_lat) if customer_lat else 0.0
    customer_lng = float(customer_lng) if customer_lng else 0.0
    if not store_id:
        raise HTTPException(status_code=400, detail="store_id required")
    store = db.query(models.Store).filter(models.Store.id == store_id).first()
    if not store:
        return {"options": [{"id": "usps_standard", "label": "USPS Standard Shipping", "icon": "📦", "price": 4.99, "eta": "2–3 business days", "provider": "usps", "available": True}]}
    store_lat = getattr(store, "latitude", None)
    store_lng = getattr(store, "longitude", None)
    distance_miles = haversine_miles(store_lat, store_lng, customer_lat, customer_lng) if (store_lat and store_lng and customer_lat and customer_lng) else 4.2
    zone = get_zone_for_distance(distance_miles)
    if not zone:
        return {"available": False, "reason": f"Outside {MAX_DELIVERY_MILES} mile range.", "distance_miles": round(distance_miles, 1)}
    return {"available": True, "distance_miles": round(distance_miles, 1), "zone": get_zone_label(distance_miles), "delivery_fee": zone["charge"], "estimated_minutes": 45, "sandbox": UBER_SANDBOX}


@router.post("/dispatch/{order_id}")
async def dispatch_uber_driver(order_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.require_seller)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store or order.store_id != store.id:
        raise HTTPException(status_code=403, detail="Not your order")
    if order.status not in ["paid", "processing"]:
        raise HTTPException(status_code=400, detail=f"Cannot dispatch — order is {order.status}")
    if UBER_SANDBOX or not UBER_CLIENT_ID or not UBER_CLIENT_SECRET or not UBER_CUSTOMER_ID:
        order.status = models.OrderStatus.shipped
        order.tracking_number = f"UBER-SANDBOX-{order_id}"
        order.tracking_url = "https://uber.com/track/sandbox"
        db.commit()
        return {"success": True, "sandbox": True, "message": "Sandbox mode: driver dispatch simulated.", "tracking_number": order.tracking_number, "tracking_url": order.tracking_url}
    try:
        token = await get_uber_token()
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{UBER_BASE}/v1/customers/{UBER_CUSTOMER_ID}/deliveries",
                json={"quote_id": order.uber_quote_id or None,
                      "pickup": {"name": store.name, "address": store.address or f"{store.city}, USA", "phone": store.phone or "+10000000000", "notes": f"Order #{order.id}"},
                      "dropoff": {"name": order.shipping_name, "address": f"{order.shipping_address}, {order.shipping_city}, {order.shipping_state} {order.shipping_zip}", "phone": "+10000000000"},
                      "manifest_items": [{"name": item.product.name if item.product else "Item", "quantity": item.quantity, "size": "small", "price": int(item.unit_price * 100)} for item in (order.items or [])]},
                headers={"Authorization": f"Bearer {token}"}, timeout=30,
            )
            if r.status_code not in [200, 201]:
                raise HTTPException(status_code=502, detail=f"Uber dispatch failed: {r.text}")
            data = r.json()
            order.status = models.OrderStatus.shipped
            order.tracking_number = data.get("id")
            order.tracking_url = data.get("tracking_url")
            db.commit()
            return {"success": True, "sandbox": False, "delivery_id": data.get("id"), "tracking_url": data.get("tracking_url")}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Uber Direct error: {str(e)}")


@router.get("/status/{order_id}")
async def get_delivery_status(order_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.buyer_id != current_user.id and current_user.role not in ["seller", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    if not order.tracking_number or not order.tracking_number.startswith("UBER"):
        return {"status": order.status, "uber_delivery": False}
    if UBER_SANDBOX or order.tracking_number.startswith("UBER-SANDBOX"):
        return {"status": "en_route_to_dropoff", "sandbox": True, "driver": {"name": "Test Driver"}, "tracking_url": order.tracking_url, "eta_minutes": 12}
    try:
        token = await get_uber_token()
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{UBER_BASE}/v1/customers/{UBER_CUSTOMER_ID}/deliveries/{order.tracking_number}", headers={"Authorization": f"Bearer {token}"}, timeout=15)
            if r.status_code != 200:
                return {"status": order.status, "error": "Could not fetch live status"}
            data = r.json()
            return {"status": data.get("status"), "sandbox": False, "driver": data.get("courier"), "tracking_url": data.get("tracking_url"), "eta_minutes": data.get("dropoff_eta")}
    except Exception as e:
        return {"status": order.status, "error": str(e)}


@router.post("/webhook")
async def uber_webhook(payload: dict, db: Session = Depends(get_db)):
    event_type = payload.get("event_type", "")
    delivery_id = payload.get("delivery_id", "")
    order = db.query(models.Order).filter(models.Order.tracking_number == delivery_id).first()
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


@router.post("/delivery-options")
async def get_delivery_options(payload: dict, db: Session = Depends(get_db)):
    """
    Core delivery routing. Fixes:
    1. Caps USPS rates at max $14.99 to prevent Shippo returning $50+ rates
    2. Adds pickup option for non-restaurant stores within 7 miles
    3. Uses API options as single source of truth
    """
    store_id = payload.get("store_id")
    if not store_id:
        raise HTTPException(status_code=400, detail="store_id required")

    customer_lat = payload.get("customer_lat")
    customer_lng = payload.get("customer_lng")
    if not (customer_lat and customer_lng):
        coords = _geocode(
            address=payload.get("address", payload.get("customer_address", "")),
            city=payload.get("city", ""), state=payload.get("state", ""),
            zip_=payload.get("zip", ""),
        )
        if coords:
            customer_lat, customer_lng = coords
    customer_lat     = float(customer_lat) if customer_lat else 0.0
    customer_lng     = float(customer_lng) if customer_lng else 0.0
    customer_address = payload.get("customer_address") or payload.get("address", "")

    store = db.query(models.Store).filter(models.Store.id == store_id).first()
    if not store:
        return {"distance_miles": None, "store_vendor_type": None, "options": [
            {"id": "usps_priority", "label": "USPS Priority Mail", "icon": "📬", "price": 8.99, "eta": "1–3 business days", "provider": "usps", "available": True},
        ]}

    store_lat      = getattr(store, "latitude", None)
    store_lng      = getattr(store, "longitude", None)
    distance_miles = (haversine_miles(store_lat, store_lng, customer_lat, customer_lng)
                      if (store_lat and store_lng and customer_lat and customer_lng)
                      else (4.2 if UBER_SANDBOX else None))

    is_restaurant   = getattr(store, "vendor_type",   None) == "restaurant"
    delivery_type   = getattr(store, "delivery_type", None) or ""
    offers_local    = delivery_type in ["local_delivery", "both"]
    offers_shipping = delivery_type in ["shipping", "both"] or not delivery_type
    is_nearby       = distance_miles is not None and distance_miles <= 7

    cart_weight_lbs: float = float(payload.get("weight_lbs") or 0.5)
    items = payload.get("items") or []
    if items and not payload.get("weight_lbs"):
        try:
            from models import Product
            total_kg = sum(
                (getattr(db.query(Product).filter(Product.id == item.get("product_id")).first(), "weight_kg", None) or 0.227)
                * int(item.get("quantity", 1))
                for item in items if item.get("product_id")
            )
            cart_weight_lbs = max(round(total_kg * 2.205, 2), 0.1)
        except Exception:
            cart_weight_lbs = 0.5

    from_addr = {
        "name": store.name, "street1": getattr(store, "address", "") or "",
        "city": getattr(store, "city", "") or "", "state": getattr(store, "state", "TX") or "TX",
        "zip": getattr(store, "zip", "77001") or "77001", "country": "US",
    }
    to_addr = {
        "name": "Customer", "street1": payload.get("address", customer_address),
        "city": payload.get("city", ""), "state": payload.get("state", ""),
        "zip": payload.get("zip", ""), "country": payload.get("country", "US") or "US",
    }

    options = []

    # ── LONG DISTANCE (≥15 miles) → USPS only ────────────────────────────
    if distance_miles is None or distance_miles >= 15:
        usps = _fetch_live_usps_rate(from_addr, to_addr, cart_weight_lbs)
        if usps.get("first_class"):
            options.append({"id": "usps_first_class", "label": "USPS First Class Package", "icon": "✉️",
                             "price": usps["first_class"], "eta": f"{usps.get('first_class_eta','2–5')} day(s)",
                             "description": "Cheapest tracked option for lightweight items.", "provider": "usps",
                             "available": True, "live_rate": not usps["mock"]})
        options.append({"id": "usps_priority", "label": "USPS Priority Mail", "icon": "📬",
                        "price": usps["priority"], "eta": f"{usps.get('priority_eta','1–3')} day(s)",
                        "description": "Ships nationwide. Tracking included.", "provider": "usps",
                        "available": True, "live_rate": not usps["mock"]})
        return {"distance_miles": round(distance_miles, 1) if distance_miles else None,
                "distance_zone": "long_distance",
                "store_vendor_type": getattr(store, "vendor_type", None),
                "options": options, "sandbox": UBER_SANDBOX}

    # ── LOCAL (< 15 miles) ────────────────────────────────────────────────
    zone = get_zone_for_distance(distance_miles)

    # USPS options for non-restaurant stores
    if not is_restaurant and offers_shipping:
        usps = _fetch_live_usps_rate(from_addr, to_addr, cart_weight_lbs)
        if usps.get("first_class"):
            options.append({"id": "usps_first_class", "label": "USPS First Class Package", "icon": "✉️",
                             "price": usps["first_class"], "eta": f"{usps.get('first_class_eta','2–5')} day(s)",
                             "description": "Best price for lightweight items under 16 oz.", "provider": "usps",
                             "available": True, "live_rate": not usps["mock"]})
        if usps.get("ground"):
            options.append({"id": "usps_ground", "label": "USPS Ground Advantage", "icon": "📦",
                             "price": usps["ground"], "eta": f"{usps.get('ground_eta','2–5')} day(s)",
                             "description": "Affordable ground shipping with tracking.", "provider": "usps",
                             "available": True, "live_rate": not usps["mock"]})
        options.append({"id": "usps_priority", "label": "USPS Priority Mail", "icon": "📬",
                        "price": usps["priority"], "eta": f"{usps.get('priority_eta','1–3')} day(s)",
                        "description": "Tracked USPS shipping to your door.", "provider": "usps",
                        "available": True, "live_rate": not usps["mock"]})

    # Uber Express (restaurant or both)
    if (is_restaurant and offers_local) or (not is_restaurant and delivery_type == "both"):
        try:
            uber_cost  = await get_uber_fee(store, customer_lat, customer_lng, customer_address)
            uber_price = zone["charge"] if zone else customer_price(uber_cost)
            options.append({"id": "uber_express",
                             "label": "Uber Express Delivery" if is_restaurant else "Same-Day Local Delivery",
                             "icon": "🛵", "price": uber_price,
                             "eta": "~45 minutes" if is_restaurant else "2–4 hours",
                             "description": f"{'Hot food' if is_restaurant else 'Local'} delivery. ({get_zone_label(distance_miles)} zone)",
                             "provider": "uber_direct", "available": True, "sandbox": UBER_SANDBOX})
        except Exception as e:
            logger.warning(f"[DeliveryOptions] Uber fee error: {e}")
            options.append({"id": "uber_express", "label": "Uber Express Delivery", "icon": "🛵",
                             "price": 0, "eta": "N/A", "description": "Uber is not available at this time.",
                             "provider": "uber_direct", "available": False})

    # ── FIX: Pickup for ALL stores within 7 miles ─────────────────────────
    # Restaurant: always show if delivery_type allows it
    # Non-restaurant: show pickup if nearby (≤7 miles) as a convenience option
    show_pickup = (
        delivery_type in ["pickup", "both"] or
        (is_restaurant and delivery_type in ["local_delivery", "both"]) or
        (not is_restaurant and is_nearby)  # NEW: any store within 7 miles offers pickup
    )
    if show_pickup:
        prep = getattr(store, "prep_time_minutes", None) or (30 if is_restaurant else 0)
        eta_text = f"Ready in ~{prep} mins" if prep else "Available for pickup"
        options.append({"id": "pickup", "label": "Customer Pickup", "icon": "🏪",
                        "price": 0, "eta": eta_text,
                        "description": f"Pick up from {getattr(store, 'address', None) or getattr(store, 'city', 'the store')}. Free — no delivery charge.",
                        "provider": "pickup", "available": True})

    if not options:
        options.append({"id": "usps_priority", "label": "USPS Priority Mail", "icon": "📬",
                        "price": 8.99, "eta": "1–3 business days",
                        "description": "Standard tracked shipping.", "provider": "usps", "available": True})

    return {"distance_miles": round(distance_miles, 1), "distance_zone": "local",
            "store_vendor_type": getattr(store, "vendor_type", None),
            "options": options, "sandbox": UBER_SANDBOX}