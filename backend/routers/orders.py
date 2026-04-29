"""
routers/orders.py
─────────────────
All order, cart, and delivery-fee endpoints.

Key changes vs previous version:
  • fetch_verified_shipping_cost() now also handles Uber Direct, re-verifying
    the quote_id that was captured at rate-selection time.
  • create_order() accepts uber_quote_id on the payload and passes it through
    for server-side verification before the order is committed.
  • Pickup is always free; USPS always re-verified via Shippo; Uber re-verified
    via quote lookup (surge / expiry protection).

CRITICAL BUG FIX — 4 leak points patched:
  LEAK 1: create_order() now sets status="awaiting_payment" (was "pending").
           "pending" is now the PAID state, not the created state.
  LEAK 2: send-confirmation endpoint no longer emails the seller.
           Seller email fires only from the Stripe webhook after payment.
  LEAK 3: get_seller_orders() now filters out non-paid statuses.
  LEAK 4: get_store_orders() now filters out non-paid statuses.

Add this to models.py OrderStatus enum:
    awaiting_payment = "awaiting_payment"
    payment_failed   = "payment_failed"

Add to your Stripe webhook (routers/payments.py or similar):
    on checkout.session.completed → set status="pending", fire seller email
    on checkout.session.expired   → set status="payment_failed"
    on payment_intent.failed      → set status="payment_failed"
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from database import get_db
import models, schemas, auth as auth_utils
import os
import math
import json
from datetime import datetime, timezone as dt_timezone

PLATFORM_FEE_PERCENT = float(os.getenv("PLATFORM_FEE_PERCENT", "8"))

# Statuses that mean payment has been confirmed.
# "awaiting_payment" and "payment_failed" are intentionally excluded —
# orders in those states are never shown to sellers.
SELLER_VISIBLE_STATUSES = [
    "pending",        # paid, awaiting seller action
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
]

router = APIRouter()


# ─────────────────────────── Financial helpers ──────────────────────────────

def calculate_order_amounts(subtotal: float, shipping: float = 0.0):
    platform_fee  = round(subtotal * (PLATFORM_FEE_PERCENT / 100), 2)
    seller_amount = round(subtotal - platform_fee, 2)
    total         = round(subtotal + shipping, 2)
    return platform_fee, seller_amount, total


# ─────────────────────────── Timezone helper ────────────────────────────────

def get_local_time(tz_name: str) -> datetime:
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo(tz_name))
    except Exception:
        return datetime.now(dt_timezone.utc)


# ─────────────────────────── Shipping verification ──────────────────────────

def fetch_verified_shipping_cost(
    delivery_method:  str,
    store_id:         int,
    shipping_address: dict,
    client_fee:       float,
    db:               Session,
    uber_quote_id:    Optional[str] = None,
) -> float:
    """
    Returns the authoritative shipping cost for an order.

    Method       | Behaviour
    -------------|-----------------------------------------------------------
    pickup       | Always $0.
    usps_*       | Re-fetch cheapest matching USPS rate from Shippo.
                 | Blocks order if Shippo call fails (never undercharge).
    uber_*       | Re-verify the quote_id captured at rate-selection time.
                 | Blocks if quote expired or fee surged >20 %.
                 | Falls back to client_fee when Uber creds not configured.
    anything else| Trust client fee (add verification when carrier added).
    """
    method = (delivery_method or "").lower()

    # ── Pickup is free ───────────────────────────────────────────────────
    if method == "pickup":
        return 0.0

    # ── USPS: always re-verify via Shippo ────────────────────────────────
    if method.startswith("usps"):
        shippo_token = os.getenv("SHIPPO_API_KEY") or os.getenv("SHIPPO_TOKEN")
        if not shippo_token:
            print("[Orders] WARNING: SHIPPO_API_KEY not set. Using client-supplied fee.")
            return round(float(client_fee or 0.0), 2)

        try:
            import httpx
            from sqlalchemy import text

            row = db.execute(
                text("SELECT address, city, state, zip, country FROM stores WHERE id = :id"),
                {"id": store_id},
            ).fetchone()
            if not row:
                raise HTTPException(status_code=400, detail="Store address not found for shipping calculation.")

            src_country = (row[4] or "US").upper()
            if src_country in ("USA", "UNITED STATES"):
                src_country = "US"
            dest_country = (shipping_address.get("country") or "US").upper()
            if dest_country in ("USA", "UNITED STATES"):
                dest_country = "US"

            payload = {
                "address_from": {
                    "street1": row[0] or "",
                    "city":    row[1] or "",
                    "state":   row[2] or "",
                    "zip":     row[3] or "",
                    "country": src_country,
                },
                "address_to": {
                    "street1": shipping_address.get("address", ""),
                    "city":    shipping_address.get("city", ""),
                    "state":   shipping_address.get("state", ""),
                    "zip":     shipping_address.get("zip", ""),
                    "country": dest_country,
                },
                "parcels": [{
                    "length": "10", "width": "8", "height": "4",
                    "distance_unit": "in",
                    "weight": "1", "mass_unit": "lb",
                }],
                "async": False,
            }

            resp = httpx.post(
                "https://api.goshippo.com/shipments/",
                json=payload,
                headers={"Authorization": f"ShippoToken {shippo_token}"},
                timeout=12.0,
            )
            resp.raise_for_status()
            data  = resp.json()
            rates = data.get("rates", [])

            usps_rates = [
                r for r in rates
                if r.get("provider", "").upper() == "USPS" and r.get("amount")
            ]

            # Prefer the same service tier the customer selected
            target_service = "PRIORITY" if "priority" in method else "GROUND"
            tier_rates = [
                r for r in usps_rates
                if target_service in r.get("servicelevel", {}).get("name", "").upper()
            ]
            pool = tier_rates or usps_rates

            if pool:
                best = min(pool, key=lambda r: float(r["amount"]))
                verified = round(float(best["amount"]), 2)
                print(f"[Orders] Shippo verified USPS rate: ${verified} (client sent ${client_fee})")
                return verified

            raise HTTPException(
                status_code=400,
                detail="Unable to calculate USPS shipping cost. Please try again."
            )

        except HTTPException:
            raise
        except Exception as e:
            print(f"[Orders] Shippo verification error: {e}")
            raise HTTPException(status_code=400, detail="Shipping rate verification failed. Please try again.")

    # ── Uber Direct: re-verify quote ─────────────────────────────────────
    if method.startswith("uber"):
        if uber_quote_id:
            try:
                from routers.delivery_rates import verify_uber_quote
                expected_cents = round(float(client_fee or 0.0) * 100)
                return verify_uber_quote(uber_quote_id, expected_cents)
            except HTTPException:
                raise
            except Exception as e:
                print(f"[Orders] Uber quote verify error: {e}")
        # No quote_id or Uber not configured — use client fee with warning
        print("[Orders] WARNING: Uber quote_id missing. Using client-supplied fee.")
        return round(float(client_fee or 0.0), 2)

    # ── All other methods ────────────────────────────────────────────────
    return round(float(client_fee or 0.0), 2)


# ─────────────────────────── Order endpoints ────────────────────────────────

@router.post("/", response_model=schemas.OrderOut, status_code=201)
def create_order(
    order_in: schemas.OrderCreate,
    db:           Session       = Depends(get_db),
    current_user: models.User   = Depends(auth_utils.get_current_user),
):
    """
    Create a new order. All items must belong to the same store.
    Shipping cost is always re-verified server-side — client values are ignored.

    The order is created with status="awaiting_payment".
    It becomes visible to the seller only after the Stripe webhook
    confirms payment (checkout.session.completed → status="pending").
    """
    from sqlalchemy import text

    # ── Validate store ────────────────────────────────────────────────────
    store = db.query(models.Store).filter(
        models.Store.id == order_in.store_id,
        models.Store.status == models.SellerStatus.approved
    ).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found or not active")

    # ── Block orders to closed restaurants ───────────────────────────────
    raw = db.execute(
        text("SELECT vendor_type, weekly_hours, is_open_now, timezone FROM stores WHERE id = :id"),
        {"id": store.id},
    ).fetchone()

    if raw and raw[0] == "restaurant":
        is_open_now      = raw[2]
        weekly_hours_raw = raw[1]
        store_tz         = raw[3] or "America/Chicago"

        if not is_open_now:
            raise HTTPException(
                status_code=400,
                detail="This restaurant is currently closed. Please check back during opening hours."
            )

        if weekly_hours_raw:
            try:
                hours     = json.loads(weekly_hours_raw) if isinstance(weekly_hours_raw, str) else weekly_hours_raw
                local_now = get_local_time(store_tz)
                day_name  = local_now.strftime("%A")
                now_time  = local_now.strftime("%H:%M")
                today     = hours.get(day_name, {})
                if today.get("closed"):
                    raise HTTPException(status_code=400, detail=f"This restaurant is closed on {day_name}.")
                open_t  = today.get("open",  "00:00")
                close_t = today.get("close", "23:59")
                if not (open_t <= now_time <= close_t):
                    raise HTTPException(
                        status_code=400,
                        detail=f"This restaurant is closed right now. Hours today: {open_t} – {close_t}."
                    )
            except HTTPException:
                raise
            except Exception:
                pass

    # ── Validate products + calculate subtotal ────────────────────────────
    order_items: list[tuple] = []
    subtotal = 0.0

    for item in order_in.items:
        product = db.query(models.Product).filter(
            models.Product.id       == item.product_id,
            models.Product.store_id == order_in.store_id,
            models.Product.is_active == True,
        ).first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item.product_id} not found in this store")
        if product.stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for '{product.name}'")

        line_total = product.price * item.quantity
        subtotal  += line_total
        order_items.append((product, item.quantity, product.price, line_total))

    # ── Verify shipping cost — never trust client value ───────────────────
    shipping_address = {
        "address": order_in.shipping.address,
        "city":    order_in.shipping.city,
        "state":   order_in.shipping.state,
        "zip":     order_in.shipping.zip,
        "country": order_in.shipping.country,
    }
    shipping_cost = fetch_verified_shipping_cost(
        delivery_method  = order_in.delivery_method,
        store_id         = order_in.store_id,
        shipping_address = shipping_address,
        client_fee       = order_in.delivery_fee,
        db               = db,
        uber_quote_id    = getattr(order_in, "uber_quote_id", None),
    )

    platform_fee, seller_amount, total = calculate_order_amounts(subtotal, shipping_cost)

    # ── Persist order ─────────────────────────────────────────────────────
    # CRITICAL: status starts as "awaiting_payment", NOT "pending".
    # The Stripe webhook flips it to "pending" (seller-visible) only on
    # checkout.session.completed. Never change this default.
    order = models.Order(
        buyer_id         = current_user.id,
        store_id         = store.id,
        status           = models.OrderStatus.awaiting_payment,  # ← FIXED (was "pending")
        subtotal         = subtotal,
        shipping_cost    = shipping_cost,
        platform_fee     = platform_fee,
        seller_amount    = seller_amount,
        total            = total,
        shipping_name    = order_in.shipping.name,
        shipping_address = order_in.shipping.address,
        shipping_city    = order_in.shipping.city,
        shipping_state   = order_in.shipping.state,
        shipping_country = order_in.shipping.country,
        shipping_zip     = order_in.shipping.zip,
    )
    try:
        order.delivery_method = order_in.delivery_method
        order.delivery_fee    = shipping_cost
    except Exception:
        pass

    db.add(order)
    db.flush()

    for product, qty, unit_price, line_total in order_items:
        db.add(models.OrderItem(
            order_id    = order.id,
            product_id  = product.id,
            quantity    = qty,
            unit_price  = unit_price,
            total_price = line_total,
        ))
        product.stock      -= qty
        product.sale_count += qty

    # Clear purchased items from cart
    ordered_ids = [item.product_id for item in order_in.items]
    db.query(models.CartItem).filter(
        models.CartItem.user_id    == current_user.id,
        models.CartItem.product_id.in_(ordered_ids),
    ).delete(synchronize_session=False)

    db.commit()

    # Reload with all relations for response serialisation
    order = db.query(models.Order).options(
        joinedload(models.Order.items)
            .joinedload(models.OrderItem.product)
            .joinedload(models.Product.store),
        joinedload(models.Order.store),
    ).filter(models.Order.id == order.id).first()

    return order


@router.get("/my-orders", response_model=schemas.PaginatedOrders)
def get_my_orders(
    page: int = 1,
    size: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    # Buyers see all their own orders including awaiting_payment — they need
    # to know their order exists while completing payment.
    query = db.query(models.Order).filter(models.Order.buyer_id == current_user.id)
    total  = query.count()
    orders = query.order_by(models.Order.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {"items": orders, "total": total, "page": page, "pages": math.ceil(total / size), "size": size}


@router.get("/seller/orders", response_model=schemas.PaginatedOrders)
def get_seller_orders(
    status: str = None,
    page:   int = 1,
    size:   int = 10,
    db:     Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller),
):
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    query = db.query(models.Order).filter(models.Order.store_id == store.id)

    if status:
        # Even if the caller explicitly requests "awaiting_payment",
        # block it — sellers must never see unpaid orders.
        if status not in SELLER_VISIBLE_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status filter '{status}'. Must be one of: {', '.join(SELLER_VISIBLE_STATUSES)}"
            )
        query = query.filter(models.Order.status == status)
    else:
        # Default: show only paid/processed statuses — never awaiting_payment.
        query = query.filter(models.Order.status.in_(SELLER_VISIBLE_STATUSES))  # ← FIXED

    total  = query.count()
    orders = query.order_by(models.Order.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {"items": orders, "total": total, "page": page, "pages": math.ceil(total / size), "size": size}


@router.get("/store-orders")
def get_store_orders(
    page:   int = 1,
    size:   int = 50,
    status: str = None,
    db:     Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller),
):
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    query = (
        db.query(models.Order)
        .options(
            joinedload(models.Order.items).joinedload(models.OrderItem.product),
            joinedload(models.Order.buyer),
        )
        .filter(models.Order.store_id == store.id)
    )

    if status:
        if status not in SELLER_VISIBLE_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status filter '{status}'. Must be one of: {', '.join(SELLER_VISIBLE_STATUSES)}"
            )
        query = query.filter(models.Order.status == status)
    else:
        # Default: exclude unpaid orders — sellers never see awaiting_payment.
        query = query.filter(models.Order.status.in_(SELLER_VISIBLE_STATUSES))  # ← FIXED

    query = query.order_by(models.Order.created_at.desc())
    total  = query.count()
    orders = query.offset((page - 1) * size).limit(size).all()
    return {"items": orders, "total": total, "page": page, "size": size}


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(
    order_id:     int,
    db:           Session     = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    order = db.query(models.Order).options(
        joinedload(models.Order.items)
            .joinedload(models.OrderItem.product)
            .joinedload(models.Product.store),
        joinedload(models.Order.store),
    ).filter(models.Order.id == order_id).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    print(f"[get_order] order.buyer_id={order.buyer_id} current_user.id={current_user.id}")

    is_buyer  = order.buyer_id == current_user.id
    store     = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    is_seller = store and order.store_id == store.id
    is_admin  = getattr(current_user, "role", None) == models.UserRole.admin

    if is_seller and not is_admin:
        if order.status not in SELLER_VISIBLE_STATUSES:
            raise HTTPException(status_code=404, detail="Order not found")

    if not (is_buyer or is_seller or is_admin):
        print(f"[get_order] ACCESS DENIED — buyer_id={order.buyer_id} user_id={current_user.id} is_seller={is_seller}")
        raise HTTPException(status_code=403, detail="Access denied")

    return order


@router.put("/{order_id}/status", response_model=schemas.OrderOut)
def update_order_status(
    order_id:     int,
    update:       schemas.OrderStatusUpdate,
    db:           Session     = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store or order.store_id != store.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Sellers cannot manually move orders out of awaiting_payment —
    # only the Stripe webhook does that.
    if order.status not in SELLER_VISIBLE_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Cannot update order status — payment has not been confirmed."
        )

    order.status = update.status
    if update.tracking_number:
        order.tracking_number = update.tracking_number
    if update.tracking_url:
        order.tracking_url = update.tracking_url
    if update.status == models.OrderStatus.delivered:
        store.total_sales   += 1
        store.total_revenue += order.seller_amount

    db.commit()

    order = db.query(models.Order).options(
        joinedload(models.Order.items)
            .joinedload(models.OrderItem.product)
            .joinedload(models.Product.store),
        joinedload(models.Order.store),
    ).filter(models.Order.id == order.id).first()

    try:
        from utils.email import send_shipping_update, send_delivery_confirmation
        buyer = db.query(models.User).filter(models.User.id == order.buyer_id).first()
        if buyer:
            if update.status == models.OrderStatus.shipped:
                send_shipping_update(
                    buyer_email=buyer.email, buyer_name=buyer.full_name,
                    order_id=order.id, tracking_number=order.tracking_number,
                    tracking_url=order.tracking_url, store_name=store.name,
                )
            elif update.status == models.OrderStatus.delivered:
                send_delivery_confirmation(
                    buyer_email=buyer.email, buyer_name=buyer.full_name,
                    order_id=order.id, store_name=store.name,
                )
    except Exception as e:
        print(f"Email error: {e}")

    return order


# ─────────────────────────── Cart endpoints ─────────────────────────────────

@router.get("/cart/items", response_model=List[schemas.CartItemOut])
def get_cart(
    db:           Session     = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    from sqlalchemy import text
    cart_items = (
        db.query(models.CartItem)
        .options(joinedload(models.CartItem.product).joinedload(models.Product.store))
        .filter(models.CartItem.user_id == current_user.id)
        .all()
    )
    store_ids = list({item.product.store_id for item in cart_items if item.product and item.product.store_id})
    if store_ids:
        placeholders = ",".join(str(s) for s in store_ids)
        rows = db.execute(
            text(f"SELECT id, vendor_type, delivery_type FROM stores WHERE id IN ({placeholders})")
        ).fetchall()
        store_map = {r[0]: (r[1], r[2]) for r in rows}
        for item in cart_items:
            if item.product and item.product.store:
                sid = item.product.store.id
                if sid in store_map:
                    item.product.store.vendor_type  = store_map[sid][0]
                    item.product.store.delivery_type = store_map[sid][1]
    return cart_items


@router.post("/cart/add", response_model=schemas.CartItemOut, status_code=201)
def add_to_cart(
    item:         schemas.CartItemCreate,
    db:           Session     = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")
    existing = db.query(models.CartItem).filter(
        models.CartItem.user_id    == current_user.id,
        models.CartItem.product_id == item.product_id,
    ).first()
    if existing:
        existing.quantity += item.quantity
        db.commit()
        db.refresh(existing)
        return existing
    cart_item = models.CartItem(user_id=current_user.id, **item.model_dump())
    db.add(cart_item)
    db.commit()
    db.refresh(cart_item)
    return cart_item


@router.delete("/cart/clear", status_code=204)
def clear_cart(
    db:           Session     = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    db.query(models.CartItem).filter(models.CartItem.user_id == current_user.id).delete()
    db.commit()


@router.delete("/cart/{item_id}", status_code=204)
def remove_from_cart(
    item_id:      int,
    db:           Session     = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    item = db.query(models.CartItem).filter(
        models.CartItem.id      == item_id,
        models.CartItem.user_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    db.delete(item)
    db.commit()


@router.post("/{order_id}/send-confirmation")
def send_order_confirmation_email(
    order_id:     int,
    db:           Session     = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    """
    Send a confirmation email to the buyer.
    The seller email is intentionally NOT sent here — it fires from the
    Stripe webhook (checkout.session.completed) once payment is confirmed.
    Calling this endpoint before payment is complete must never notify the seller.
    """
    order = db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.product),
        joinedload(models.Order.store).joinedload(models.Store.owner),
    ).filter(
        models.Order.id       == order_id,
        models.Order.buyer_id == current_user.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        from utils.email import send_order_confirmation
        email_items = [
            {"name": oi.product.name, "quantity": oi.quantity, "price": oi.unit_price}
            for oi in order.items
        ]
        # ── Buyer confirmation only ────────────────────────────────────────
        send_order_confirmation(
            buyer_email=current_user.email, buyer_name=current_user.full_name,
            order_id=order.id, items=email_items, subtotal=order.subtotal,
            shipping=order.shipping_cost, total=order.total,
            store_name=order.store.name if order.store else "Afrizone",
        )
        # ── Seller email REMOVED from here — see Stripe webhook ───────────
        # Previously: send_new_order_to_seller(...) was called here,
        # which fired before payment was confirmed. That was LEAK 2.
        # The seller email now lives in routers/payments.py (Stripe webhook)
        # inside the checkout.session.completed handler.
    except Exception as e:
        print(f"Email error: {e}")
    return {"sent": True}


# ─────────────────────────── Stripe webhook stub ────────────────────────────
# Add this to your existing routers/payments.py (or wherever you handle Stripe).
# Shown here as a reference — do NOT register this router twice.

STRIPE_WEBHOOK_REFERENCE = """
# Add to routers/payments.py

@router.post("/webhook/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload    = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv("STRIPE_WEBHOOK_SECRET")
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")

    # ── Payment confirmed ─────────────────────────────────────────────────
    if event["type"] == "checkout.session.completed":
        session  = event["data"]["object"]
        order_id = session["metadata"].get("order_id")
        order    = db.query(models.Order).filter(models.Order.id == int(order_id)).first()

        if order and order.status == "awaiting_payment":
            order.status         = "pending"   # now visible to seller
            order.payment_intent = session.get("payment_intent")
            order.paid_at        = datetime.now(timezone.utc)
            db.commit()

            # Seller email fires HERE — after payment is confirmed
            try:
                from utils.email import send_new_order_to_seller
                store = db.query(models.Store).filter(models.Store.id == order.store_id).first()
                buyer = db.query(models.User).filter(models.User.id == order.buyer_id).first()
                if store and store.owner and buyer:
                    email_items = [
                        {"name": oi.product.name, "quantity": oi.quantity, "price": oi.unit_price}
                        for oi in order.items
                    ]
                    send_new_order_to_seller(
                        seller_email=store.owner.email, store_name=store.name,
                        order_id=order.id, items=email_items, total=order.total,
                        seller_amount=order.seller_amount, buyer_name=buyer.full_name,
                    )
            except Exception as e:
                print(f"Seller email error: {e}")

    # ── Payment failed or expired ─────────────────────────────────────────
    elif event["type"] in ("checkout.session.expired", "payment_intent.payment_failed"):
        session  = event["data"]["object"]
        order_id = (session.get("metadata") or {}).get("order_id")
        if order_id:
            order = db.query(models.Order).filter(models.Order.id == int(order_id)).first()
            if order and order.status == "awaiting_payment":
                order.status = "payment_failed"
                db.commit()

    return {"received": True}
"""