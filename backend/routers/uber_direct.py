"""
routers/uber_direct.py
──────────────────────
Uber Direct integration + delivery option routing for Afrizone.

Key changes vs previous version:
  • /delivery-options now accepts address string fields and geocodes them
    server-side (Nominatim, no API key needed) so the frontend never needs
    to supply lat/lng manually.
  • USPS prices are now fetched live from Shippo instead of hardcoded.
    Falls back to $8.99 if Shippo is unavailable.
  • verify_uber_quote() moved here from the deleted delivery_rates.py.
  • _geocode() helper added here (was in delivery_rates.py).

Shipping cost optimizations (latest):
  • Cubic-optimized parcel dimensions to qualify for USPS Cubic pricing.
  • First Class Package Service added for items under 16 oz ($3–5).
  • Shippo address validation runs before rate fetch to avoid bad-address surcharges.
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

# ── Uber Direct Config ──────────────────────────────────────────────────────
UBER_CLIENT_ID     = os.getenv("UBER_CLIENT_ID", "")
UBER_CLIENT_SECRET = os.getenv("UBER_CLIENT_SECRET", "")
UBER_CUSTOMER_ID   = os.getenv("UBER_CUSTOMER_ID", "")
UBER_SANDBOX       = os.getenv("UBER_SANDBOX", "true").lower() == "true"
UBER_BASE          = "https://api.uber.com"

# ── Shippo Config ────────────────────────────────────────────────────────────
SHIPPO_TOKEN       = os.getenv("SHIPPO_API_KEY") or os.getenv("SHIPPO_TOKEN", "")
SHIPPO_BASE_URL    = "https://api.goshippo.com"

# ── Pricing Config ───────────────────────────────────────────────────────────
AFRIZONE_MARGIN    = 2.00
MAX_DELIVERY_MILES = 20
SANDBOX_BASE_FEE   = 3.50
SANDBOX_PER_MILE   = 0.90

DELIVERY_ZONES = [
    {"zone": "zone_1", "label": "Nearby",   "min_miles": 0,  "max_miles": 3,  "charge": 5.99,  "uber_est": 3.50,  "profit": 2.49},
    {"zone": "zone_2", "label": "Local",    "min_miles": 3,  "max_miles": 7,  "charge": 8.99,  "uber_est": 5.50,  "profit": 3.49},
    {"zone": "zone_3", "label": "Extended", "min_miles": 7,  "max_miles": 12, "charge": 12.99, "uber_est": 8.50,  "profit": 4.49},
    {"zone": "zone_4", "label": "Far",      "min_miles": 12, "max_miles": 20, "charge": 16.99, "uber_est": 12.00, "profit": 4.99},
]


# ── Uber token cache ─────────────────────────────────────────────────────────
_uber_token_cache: dict = {"token": None, "expires_at": 0.0}


# ─────────────────────────── Helpers ────────────────────────────────────────

def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3958.8
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _geocode(address: str, city: str, state: str, zip_: str, country: str = "US") -> tuple[float, float] | None:
    """
    Best-effort geocode using Nominatim (no API key required).
    Returns (lat, lon) or None if geocoding fails.
    """
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
        logger.warning(f"[Geocode] Failed for '{city}, {state}': {e}")
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


def get_zone_for_distance(distance_miles: float) -> dict | None:
    if distance_miles > MAX_DELIVERY_MILES:
        return None
    for zone in DELIVERY_ZONES:
        if zone["min_miles"] <= distance_miles < zone["max_miles"]:
            return zone
    if distance_miles == MAX_DELIVERY_MILES:
        return DELIVERY_ZONES[-1]
    return None


# ─────────────────────────── Shippo USPS rate fetch ─────────────────────────

def _parcel_for_weight(weight_lbs: float) -> dict:
    """
    Return cubic-optimized parcel dimensions for USPS Cubic pricing eligibility.

    USPS Cubic pricing applies to parcels ≤ 0.5 cubic feet AND ≤ 20 lbs,
    and is often cheaper than Priority Mail for dense/small packages.
    Dimensions are chosen to stay within cubic tier thresholds while
    keeping dimensional weight (L×W×H / 166) below actual weight.

    Tiers:
      <= 0.5 lb  padded envelope  6x9x2   → 0.0625 cu ft  (Cubic tier 0)
      <= 2.0 lb  cubic shoebox    10x8x6  → 0.278 cu ft   (Cubic tier 2)
      >  2.0 lb  cubic medium     12x12x8 → 0.444 cu ft   (Cubic tier 4, ≤ 20 lb)
    """
    w = str(round(max(weight_lbs, 0.1), 2))
    if weight_lbs <= 0.5:
        # Padded envelope — qualifies for Cubic tier 0 (~$8–9 Priority or First Class)
        return {"length": "6", "width": "9", "height": "2",
                "distance_unit": "in", "weight": w, "mass_unit": "lb"}
    if weight_lbs <= 2.0:
        # Shoebox — Cubic tier 2, typically $10–12 vs $14+ standard Priority
        return {"length": "10", "width": "8", "height": "6",
                "distance_unit": "in", "weight": w, "mass_unit": "lb"}
    # Medium cubic box — Cubic tier 4, covers up to ~20 lb competitively
    return {"length": "12", "width": "12", "height": "8",
            "distance_unit": "in", "weight": w, "mass_unit": "lb"}


def _validate_shippo_address(addr: dict) -> dict:
    """
    Run Shippo address validation on a to_addr dict.
    Returns a corrected address dict if validation succeeds, otherwise
    returns the original unchanged. Never raises — bad validation should
    not block the rate fetch.

    Why this matters: Shippo/USPS will return no rates (or inflated rates)
    for unrecognized addresses. Validation normalizes street abbreviations,
    zip+4 codes, and state codes before the shipment is created.
    """
    if not SHIPPO_TOKEN:
        return addr
    try:
        resp = httpx.post(
            f"{SHIPPO_BASE_URL}/addresses/",
            json={**addr, "validate": True},
            headers={
                "Authorization": f"ShippoToken {SHIPPO_TOKEN}",
                "Content-Type":  "application/json",
            },
            timeout=8.0,
        )
        if resp.status_code == 201:
            data = resp.json()
            validation = data.get("validation_results", {})
            if validation.get("is_valid"):
                # Use Shippo-normalized fields where available
                return {
                    "name":    addr.get("name", ""),
                    "street1": data.get("street1") or addr["street1"],
                    "city":    data.get("city")    or addr["city"],
                    "state":   data.get("state")   or addr["state"],
                    "zip":     data.get("zip")      or addr["zip"],
                    "country": data.get("country")  or addr.get("country", "US"),
                }
            else:
                messages = validation.get("messages", [])
                logger.warning(f"[Shippo] Address invalid: {messages}")
    except Exception as e:
        logger.warning(f"[Shippo] Address validation error: {e}")
    return addr


def _fetch_live_usps_rate(
    from_addr:  dict,
    to_addr:    dict,
    weight_lbs: float = 0.5,
) -> dict:
    """
    Fetch a real USPS rate from Shippo synchronously.

    Service priority (cheapest first):
      1. USPS First Class Package  — items < 16 oz, typically $3–5
      2. USPS Ground Advantage     — slower ground, typically $5–8
      3. USPS Priority Mail        — 1–3 days, typically $8–15

    Address validation runs before the shipment call to avoid
    unrecognized-address rate failures.

    Returns {"priority": float, "ground": float | None, "first_class": float | None, "mock": bool}.
    Falls back to {"priority": 8.99, "ground": 4.99, "mock": True} on any error.
    """
    FALLBACK = {"priority": 8.99, "ground": 4.99, "first_class": None, "mock": True}

    if not SHIPPO_TOKEN:
        logger.warning("[Shippo] No API key — using fallback USPS rates")
        return FALLBACK

    # ── Validate destination address before rate fetch ────────────────────
    to_addr = _validate_shippo_address(to_addr)

    try:
        parcel = _parcel_for_weight(weight_lbs)

        resp = httpx.post(
            f"{SHIPPO_BASE_URL}/shipments/",
            json={
                "address_from": from_addr,
                "address_to":   to_addr,
                "parcels":      [parcel],
                "async":        False,
            },
            headers={
                "Authorization": f"ShippoToken {SHIPPO_TOKEN}",
                "Content-Type":  "application/json",
            },
            timeout=12.0,
        )
        resp.raise_for_status()
        rates = resp.json().get("rates", [])

        usps = [r for r in rates if r.get("provider", "").upper() == "USPS" and r.get("amount")]
        if not usps:
            return FALLBACK

        def _find(keyword: str):
            """
            Find the cheapest USPS rate matching a service-level keyword.
            First Class Package is checked first since it's the cheapest
            option for sub-16 oz items (qualifies when weight_lbs < 1.0).
            """
            # For lightweight items, surface First Class Package ahead of Priority
            if keyword == "FIRST":
                return next(
                    (r for r in usps if "FIRST CLASS PACKAGE" in r.get("servicelevel", {}).get("name", "").upper()),
                    None,
                )
            return next(
                (r for r in usps if keyword in r.get("servicelevel", {}).get("name", "").upper()),
                None,
            )

        priority_rate   = _find("PRIORITY")
        ground_rate     = _find("GROUND") or _find("ADVANTAGE")
        first_class_rate = _find("FIRST") if weight_lbs < 1.0 else None  # FC only valid < 16 oz

        result = {
            "mock":     False,
            "priority": round(float(priority_rate["amount"]), 2) if priority_rate else FALLBACK["priority"],
            "ground":   round(float(ground_rate["amount"]),   2) if ground_rate and ground_rate != priority_rate else None,
            # First Class Package — only returned when item is under 16 oz
            "first_class":     round(float(first_class_rate["amount"]), 2) if first_class_rate else None,
            "first_class_eta": first_class_rate.get("estimated_days")      if first_class_rate else None,
            "priority_eta":    priority_rate.get("estimated_days")         if priority_rate else None,
            "ground_eta":      ground_rate.get("estimated_days")           if ground_rate else None,
        }
        logger.info(
            f"[Shippo] Priority=${result['priority']} "
            f"Ground={result['ground']} "
            f"FirstClass={result['first_class']}"
        )
        return result

    except Exception as e:
        logger.error(f"[Shippo] Rate fetch error: {e}")
        return FALLBACK


# ─────────────────────────── Uber token + quote helpers ─────────────────────

async def get_uber_token() -> str:
    """Fetch OAuth2 token from Uber. Uses module-level cache."""
    now = time.time()
    if _uber_token_cache["token"] and now < _uber_token_cache["expires_at"] - 30:
        return _uber_token_cache["token"]

    if not UBER_CLIENT_ID or not UBER_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Uber Direct not configured. Add UBER_CLIENT_ID and UBER_CLIENT_SECRET to environment.",
        )
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{UBER_BASE}/oauth/v2/token",
            data={
                "client_id":     UBER_CLIENT_ID,
                "client_secret": UBER_CLIENT_SECRET,
                "grant_type":    "client_credentials",
                "scope":         "eats.deliveries",
            },
            timeout=15,
        )
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Uber auth failed: {r.text}")
        data = r.json()
        _uber_token_cache["token"]      = data["access_token"]
        _uber_token_cache["expires_at"] = now + data.get("expires_in", 3600)
        return _uber_token_cache["token"]


def verify_uber_quote(quote_id: str, expected_fee_cents: int) -> float:
    """
    Synchronously verify an Uber quote is still valid before charging.
    Returns the authoritative fee in dollars.
    Raises HTTPException 400 if quote expired or fee surged >20%.
    Called by orders.py before committing an order.
    """
    if not all([UBER_CLIENT_ID, UBER_CLIENT_SECRET, UBER_CUSTOMER_ID]):
        return round(expected_fee_cents / 100, 2)

    try:
        resp_token = httpx.post(
            f"{UBER_BASE}/oauth/v2/token",
            data={
                "client_id":     UBER_CLIENT_ID,
                "client_secret": UBER_CLIENT_SECRET,
                "grant_type":    "client_credentials",
                "scope":         "eats.deliveries",
            },
            timeout=10.0,
        )
        resp_token.raise_for_status()
        token = resp_token.json()["access_token"]

        resp = httpx.get(
            f"{UBER_BASE}/v1/customers/{UBER_CUSTOMER_ID}/delivery_quotes/{quote_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10.0,
        )
        if resp.status_code == 404:
            raise HTTPException(
                status_code=400,
                detail="Uber delivery quote expired. Please refresh delivery options.",
            )
        resp.raise_for_status()
        data = resp.json()

        live_cents = data.get("fee", expected_fee_cents)
        live_fee   = round(live_cents / 100, 2)
        original   = expected_fee_cents / 100

        if original > 0 and abs(live_fee - original) / original > 0.20:
            raise HTTPException(
                status_code=400,
                detail=f"Uber delivery fee changed from ${original:.2f} to ${live_fee:.2f}. Please review and confirm.",
            )
        return live_fee

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Uber] Quote verify error: {e}")
        return round(expected_fee_cents / 100, 2)


async def get_uber_fee(store, customer_lat: float, customer_lng: float, customer_address: str = "") -> float:
    """Get actual Uber Direct fee, or estimate from distance in sandbox."""
    store_lat = getattr(store, "latitude", None)
    store_lng = getattr(store, "longitude", None)

    distance = (
        haversine_miles(store_lat, store_lng, customer_lat, customer_lng)
        if (store_lat and store_lng and customer_lat and customer_lng)
        else 4.2
    )

    if UBER_CLIENT_ID and UBER_CLIENT_SECRET and UBER_CUSTOMER_ID:
        try:
            token = await get_uber_token()
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    f"{UBER_BASE}/v1/customers/{UBER_CUSTOMER_ID}/delivery_quotes",
                    json={
                        "pickup_address":    store.address or f"{store.city}, USA",
                        "dropoff_address":   customer_address,
                        "pickup_latitude":   store_lat or customer_lat,
                        "pickup_longitude":  store_lng or customer_lng,
                        "dropoff_latitude":  customer_lat,
                        "dropoff_longitude": customer_lng,
                        "pickup_name":       store.name,
                        "manifest_items":    [{"name": "Order", "quantity": 1, "size": "small", "price": 1000}],
                    },
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10,
                )
                if r.status_code == 200:
                    fee_cents = r.json().get("fee", 0)
                    if fee_cents:
                        return round(fee_cents / 100, 2)
        except Exception as e:
            logger.warning(f"[Uber Fee] API call failed: {e} — using estimate")

    return estimate_uber_cost(distance)


# ─────────────────────────── Endpoints ──────────────────────────────────────

@router.get("/zones")
def get_delivery_zones():
    return {
        "zones":               DELIVERY_ZONES,
        "max_delivery_miles":  MAX_DELIVERY_MILES,
        "note":                "Delivery fee is determined by distance from restaurant to your address.",
        "sandbox":             UBER_SANDBOX,
    }


@router.post("/quote")
async def get_delivery_quote(payload: dict, db: Session = Depends(get_db)):
    """
    Get a delivery quote for a store → customer address.
    Accepts either lat/lng coordinates OR address string fields.
    """
    store_id         = payload.get("store_id")
    customer_lat     = payload.get("customer_lat")
    customer_lng     = payload.get("customer_lng")
    customer_address = payload.get("customer_address", "")

    if not (customer_lat and customer_lng):
        coords = _geocode(
            address=payload.get("address", customer_address),
            city=payload.get("city", ""),
            state=payload.get("state", ""),
            zip_=payload.get("zip", ""),
            country=payload.get("country", "US"),
        )
        if coords:
            customer_lat, customer_lng = coords

    customer_lat = float(customer_lat) if customer_lat else 0.0
    customer_lng = float(customer_lng) if customer_lng else 0.0

    if not store_id:
        raise HTTPException(status_code=400, detail="store_id required")

    store = db.query(models.Store).filter(models.Store.id == store_id).first()
    if not store:
        return {"distance_miles": None, "store_vendor_type": None, "options": [
            {"id": "usps_standard", "label": "USPS Standard Shipping", "icon": "📦",
             "price": 4.99, "eta": "2–3 business days", "provider": "usps", "available": True},
        ]}

    if getattr(store, "delivery_type", None) not in ["local_delivery", "both"]:
        raise HTTPException(status_code=400, detail="This store does not offer local delivery")

    store_lat = getattr(store, "latitude", None)
    store_lng = getattr(store, "longitude", None)

    if store_lat and store_lng and customer_lat and customer_lng:
        distance_miles = haversine_miles(store_lat, store_lng, customer_lat, customer_lng)
    elif UBER_SANDBOX:
        distance_miles = 4.2
    else:
        raise HTTPException(status_code=400, detail="Store location not set.")

    zone = get_zone_for_distance(distance_miles)
    if not zone:
        return {
            "available":      False,
            "reason":         f"Address is {distance_miles:.1f} miles away — outside our {MAX_DELIVERY_MILES} mile range.",
            "distance_miles": round(distance_miles, 1),
        }

    uber_quote_id      = None
    estimated_minutes  = 45

    if UBER_CLIENT_ID and UBER_CLIENT_SECRET and UBER_CUSTOMER_ID:
        try:
            token = await get_uber_token()
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    f"{UBER_BASE}/v1/customers/{UBER_CUSTOMER_ID}/delivery_quotes",
                    json={
                        "pickup_address":      store.address or f"{store.city}, USA",
                        "dropoff_address":     customer_address,
                        "pickup_latitude":     store_lat or customer_lat,
                        "pickup_longitude":    store_lng or customer_lng,
                        "dropoff_latitude":    customer_lat,
                        "dropoff_longitude":   customer_lng,
                        "pickup_name":         store.name,
                        "dropoff_name":        payload.get("customer_name", "Customer"),
                        "pickup_phone_number": store.phone or "+10000000000",
                        "dropoff_phone_number": payload.get("customer_phone", "+10000000000"),
                        "manifest_items":      [{"name": "Food order", "quantity": 1, "size": "small", "price": 1000}],
                    },
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=15,
                )
                if r.status_code == 200:
                    data              = r.json()
                    uber_quote_id     = data.get("quote_id")
                    estimated_minutes = data.get("duration", 45) // 60 if data.get("duration") else 45
        except Exception as e:
            logger.warning(f"[Uber Quote] {e} — using zone estimate")

    return {
        "available":       True,
        "distance_miles":  round(distance_miles, 1),
        "zone":            get_zone_label(distance_miles),
        "zone_label":      zone["label"],
        "delivery_fee":    zone["charge"],
        "estimated_minutes": estimated_minutes,
        "uber_quote_id":   uber_quote_id,
        "sandbox":         UBER_SANDBOX,
        "breakdown": {
            "customer_pays":      zone["charge"],
            "uber_cost_estimate": zone["uber_est"],
            "afrizone_margin":    zone["profit"],
        },
    }


@router.post("/dispatch/{order_id}")
async def dispatch_uber_driver(
    order_id:         int,
    background_tasks: BackgroundTasks,
    db:               Session     = Depends(get_db),
    current_user:     models.User = Depends(auth_utils.require_seller),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store or order.store_id != store.id:
        raise HTTPException(status_code=403, detail="Not your order")

    if order.status not in ["paid", "processing"]:
        raise HTTPException(status_code=400, detail=f"Cannot dispatch — order is {order.status}")

    if UBER_SANDBOX or not UBER_CLIENT_ID or not UBER_CLIENT_SECRET or not UBER_CUSTOMER_ID:
        order.status          = models.OrderStatus.shipped
        order.tracking_number = f"UBER-SANDBOX-{order_id}"
        order.tracking_url    = "https://uber.com/track/sandbox"
        db.commit()
        return {
            "success":        True,
            "sandbox":        True,
            "message":        "Sandbox mode: driver dispatch simulated.",
            "tracking_number": order.tracking_number,
            "tracking_url":   order.tracking_url,
            "delivery_id":    f"sandbox-delivery-{order_id}",
        }

    try:
        token = await get_uber_token()
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{UBER_BASE}/v1/customers/{UBER_CUSTOMER_ID}/deliveries",
                json={
                    "quote_id": order.uber_quote_id or None,
                    "pickup": {
                        "name":    store.name,
                        "address": store.address or f"{store.city}, USA",
                        "phone":   store.phone or "+10000000000",
                        "notes":   f"Order #{order.id} — food should be ready and packaged",
                    },
                    "dropoff": {
                        "name":    order.shipping_name,
                        "address": f"{order.shipping_address}, {order.shipping_city}, {order.shipping_state} {order.shipping_zip}",
                        "phone":   "+10000000000",
                        "notes":   "",
                    },
                    "manifest_items": [
                        {
                            "name":     item.product.name if item.product else "Food item",
                            "quantity": item.quantity,
                            "size":     "small",
                            "price":    int(item.unit_price * 100),
                        }
                        for item in (order.items or [])
                    ],
                },
                headers={"Authorization": f"Bearer {token}"},
                timeout=30,
            )
            if r.status_code not in [200, 201]:
                raise HTTPException(status_code=502, detail=f"Uber dispatch failed: {r.text}")

            data          = r.json()
            delivery_id   = data.get("id")
            tracking_url  = data.get("tracking_url")

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
        raise HTTPException(status_code=502, detail=f"Uber Direct error: {str(e)}")


@router.get("/status/{order_id}")
async def get_delivery_status(
    order_id:     int,
    db:           Session     = Depends(get_db),
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
            "driver":       {"name": "Test Driver", "phone": "+10000000000", "location": None},
            "tracking_url": order.tracking_url,
            "eta_minutes":  12,
        }

    try:
        token       = await get_uber_token()
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
                "status":       data.get("status"),
                "sandbox":      False,
                "driver":       data.get("courier"),
                "tracking_url": data.get("tracking_url"),
                "eta_minutes":  data.get("dropoff_eta"),
            }
    except Exception as e:
        return {"status": order.status, "error": str(e)}


@router.post("/webhook")
async def uber_webhook(payload: dict, db: Session = Depends(get_db)):
    event_type  = payload.get("event_type", "")
    delivery_id = payload.get("delivery_id", "")
    logger.info(f"[Uber Webhook] {event_type} — delivery {delivery_id}")

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


# ─────────────────────────── Core routing endpoint ──────────────────────────

@router.post("/delivery-options")
async def get_delivery_options(payload: dict, db: Session = Depends(get_db)):
    """
    Core delivery routing — called from checkout when customer enters address.

    Accepts address as either:
      { store_id, customer_lat, customer_lng, customer_address }   ← original
      { store_id, address, city, state, zip, country }             ← new (from DeliverySelector)

    USPS prices are fetched live from Shippo (with address validation).
    Uber quotes use the Uber Direct API (or sandbox estimates).

    Service selection (cheapest first):
      < 16 oz items       → First Class Package surfaced as cheapest option
      local distance      → USPS Ground Advantage + Priority (non-restaurant)
      long distance ≥15mi → USPS Priority only
      restaurant + local  → Uber Express + optional Pickup
    """
    store_id = payload.get("store_id")
    if not store_id:
        raise HTTPException(status_code=400, detail="store_id required")

    # ── Resolve coordinates ────────────────────────────────────────────────
    customer_lat = payload.get("customer_lat")
    customer_lng = payload.get("customer_lng")

    if not (customer_lat and customer_lng):
        coords = _geocode(
            address=payload.get("address", payload.get("customer_address", "")),
            city=payload.get("city", ""),
            state=payload.get("state", ""),
            zip_=payload.get("zip", ""),
            country=payload.get("country", "US"),
        )
        if coords:
            customer_lat, customer_lng = coords
            logger.info(f"[DeliveryOptions] Geocoded to {customer_lat:.4f},{customer_lng:.4f}")

    customer_lat     = float(customer_lat) if customer_lat else 0.0
    customer_lng     = float(customer_lng) if customer_lng else 0.0
    customer_address = payload.get("customer_address") or payload.get("address", "")

    # ── Load store ─────────────────────────────────────────────────────────
    store = db.query(models.Store).filter(models.Store.id == store_id).first()
    if not store:
        return {
            "distance_miles":    None,
            "store_vendor_type": None,
            "options": [
                {"id": "usps_priority", "label": "USPS Priority Mail", "icon": "📬",
                 "price": 8.99, "eta": "1–3 business days", "provider": "usps", "available": True},
            ],
        }

    # ── Calculate distance ─────────────────────────────────────────────────
    store_lat = getattr(store, "latitude", None)
    store_lng = getattr(store, "longitude", None)

    if store_lat and store_lng and customer_lat and customer_lng:
        distance_miles = haversine_miles(store_lat, store_lng, customer_lat, customer_lng)
    elif UBER_SANDBOX:
        distance_miles = 4.2
    else:
        distance_miles = None

    is_restaurant   = getattr(store, "vendor_type",   None) == "restaurant"
    delivery_type   = getattr(store, "delivery_type", None) or ""
    offers_local    = delivery_type in ["local_delivery", "both"]
    offers_shipping = delivery_type in ["shipping", "both"] or not delivery_type

    options = []

    # ── Resolve cart weight ────────────────────────────────────────────────
    cart_weight_lbs: float = float(payload.get("weight_lbs") or 0)
    if not cart_weight_lbs:
        items = payload.get("items") or []
        if items:
            try:
                from models import Product
                total_kg = 0.0
                for item in items:
                    pid = item.get("product_id")
                    qty = int(item.get("quantity", 1))
                    if pid:
                        p = db.query(Product).filter(Product.id == pid).first()
                        total_kg += (getattr(p, "weight_kg", None) or 0.227) * qty
                cart_weight_lbs = round(total_kg * 2.205, 2)
            except Exception:
                cart_weight_lbs = 0.5
    cart_weight_lbs = max(cart_weight_lbs, 0.1)

    # ── Build Shippo address objects ───────────────────────────────────────
    from_addr = {
        "name":    store.name,
        "street1": getattr(store, "address", "") or "",
        "city":    getattr(store, "city", "") or "",
        "state":   getattr(store, "state", "TX") or "TX",
        "zip":     getattr(store, "zip", "77001") or "77001",
        "country": "US",
    }
    to_addr = {
        "name":    "Customer",
        "street1": payload.get("address", customer_address),
        "city":    payload.get("city", ""),
        "state":   payload.get("state", ""),
        "zip":     payload.get("zip", ""),
        "country": payload.get("country", "US") or "US",
    }

    # ── BRANCH: long distance or unknown → USPS only ───────────────────────
    if distance_miles is None or distance_miles >= 15:
        usps_rates = _fetch_live_usps_rate(from_addr, to_addr, cart_weight_lbs)

        # Surface First Class if available (cheapest for light items)
        if usps_rates.get("first_class"):
            options.append({
                "id":          "usps_first_class",
                "label":       "USPS First Class Package",
                "icon":        "✉️",
                "price":       usps_rates["first_class"],
                "eta":         f"{usps_rates.get('first_class_eta', '2–5')} business day(s)",
                "description": "Cheapest tracked option for lightweight items under 16 oz.",
                "provider":    "usps",
                "available":   True,
                "live_rate":   not usps_rates["mock"],
            })

        options.append({
            "id":          "usps_priority",
            "label":       "USPS Priority Mail",
            "icon":        "📬",
            "price":       usps_rates["priority"],
            "eta":         f"{usps_rates.get('priority_eta', '1–3')} business day(s)",
            "description": "Ships nationwide. Tracking included.",
            "provider":    "usps",
            "available":   True,
            "live_rate":   not usps_rates["mock"],
        })
        return {
            "distance_miles":    round(distance_miles, 1) if distance_miles else None,
            "distance_zone":     "long_distance",
            "store_vendor_type": getattr(store, "vendor_type", None),
            "options":           options,
            "note":              "This store is more than 15 miles away — shipping only.",
            "sandbox":           UBER_SANDBOX,
        }

    # ── BRANCH: local distance ─────────────────────────────────────────────
    zone = get_zone_for_distance(distance_miles)

    usps_rates = None
    if not is_restaurant and offers_shipping:
        usps_rates = _fetch_live_usps_rate(from_addr, to_addr, cart_weight_lbs)

    # USPS options for non-restaurant stores (cheapest first)
    if not is_restaurant and offers_shipping and usps_rates:
        # First Class Package — cheapest for items under 16 oz
        if usps_rates.get("first_class"):
            options.append({
                "id":          "usps_first_class",
                "label":       "USPS First Class Package",
                "icon":        "✉️",
                "price":       usps_rates["first_class"],
                "eta":         f"{usps_rates.get('first_class_eta', '2–5')} business day(s)",
                "description": "Best price for lightweight items under 16 oz. Tracked.",
                "provider":    "usps",
                "available":   True,
                "live_rate":   not usps_rates["mock"],
            })

        # Ground Advantage
        if usps_rates.get("ground"):
            options.append({
                "id":          "usps_ground",
                "label":       "USPS Ground Advantage",
                "icon":        "📦",
                "price":       usps_rates["ground"],
                "eta":         f"{usps_rates.get('ground_eta', '2–5')} business day(s)",
                "description": "Affordable ground shipping with tracking.",
                "provider":    "usps",
                "available":   True,
                "live_rate":   not usps_rates["mock"],
            })

        # Priority
        options.append({
            "id":          "usps_priority",
            "label":       "USPS Priority Mail",
            "icon":        "📬",
            "price":       usps_rates["priority"],
            "eta":         f"{usps_rates.get('priority_eta', '1–3')} business day(s)",
            "description": "Tracked USPS Priority shipping to your door.",
            "provider":    "usps",
            "available":   True,
            "live_rate":   not usps_rates["mock"],
        })

    # Uber Express
    if (is_restaurant and offers_local) or (not is_restaurant and delivery_type == "both"):
        try:
            uber_cost  = await get_uber_fee(store, customer_lat, customer_lng, customer_address)
            uber_price = zone["charge"] if zone else customer_price(uber_cost)
            zone_label = get_zone_label(distance_miles)
            eta_text   = "~45 minutes" if is_restaurant else "2–4 hours"
            options.append({
                "id":          "uber_express",
                "label":       "Uber Express Delivery" if is_restaurant else "Same-Day Local Delivery",
                "icon":        "🛵",
                "price":       uber_price,
                "eta":         eta_text,
                "description": f"{'Hot food' if is_restaurant else 'Local'} delivery. ({zone_label} zone)",
                "provider":    "uber_direct",
                "available":   True,
                "uber_cost":   uber_cost,
                "sandbox":     UBER_SANDBOX,
            })
        except Exception as e:
            logger.warning(f"[DeliveryOptions] Uber fee error: {e}")
            options.append({
                "id":          "uber_express",
                "label":       "Uber Express Delivery",
                "icon":        "🛵",
                "price":       0,
                "eta":         "N/A",
                "description": "Uber is not available at this time.",
                "provider":    "uber_direct",
                "available":   False,
            })

    # Pickup option
    if delivery_type in ["pickup", "both", "local_delivery"]:
        prep = getattr(store, "prep_time_minutes", 30) or 30
        options.append({
            "id":          "pickup",
            "label":       "Store Pickup",
            "icon":        "🏪",
            "price":       0,
            "eta":         f"Ready in ~{prep} mins",
            "description": f"Pick up at {getattr(store, 'address', None) or getattr(store, 'city', 'store')}.",
            "provider":    "pickup",
            "available":   True,
        })

    # Final fallback
    if not options:
        options.append({
            "id":          "usps_priority",
            "label":       "USPS Priority Mail",
            "icon":        "📬",
            "price":       8.99,
            "eta":         "1–3 business days",
            "description": "Standard tracked shipping.",
            "provider":    "usps",
            "available":   True,
        })

    return {
        "distance_miles":    round(distance_miles, 1),
        "distance_zone":     "local",
        "store_vendor_type": getattr(store, "vendor_type", None),
        "options":           options,
        "sandbox":           UBER_SANDBOX,
    }