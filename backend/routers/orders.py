"""
routers/orders.py
─────────────────
All order, cart, and delivery-fee endpoints.

AMAZON-STANDARD SHIPPING FIX:
  Shipping is calculated ONCE — at cart/estimate time via /shipping/estimate.
  The verified rate + rate_id are sent by the frontend when placing the order.
  create_order() trusts the client-supplied shipping_cost + shippo_rate_id.
  There is NO second Shippo call here. The /shipping/estimate endpoint already
  verified the rate against real parcel dimensions and the real destination.

  Old flow (broken):
    /shipping/estimate → $13.48 shown to customer
    create_order()     → re-calls Shippo → $10.01 saved to order   ← MISMATCH
    /payments/checkout → charges $20.00 (subtotal only)             ← SHIPPING DROPPED

  New flow (Amazon standard):
    /shipping/estimate → $13.48 + rate_id returned, saved in cart state
    create_order()     → trusts $13.48, saves rate_id, total = $30.01
    /payments/checkout → charges order.total = $30.01               ← CORRECT

  Uber Direct quotes are still re-verified server-side because they expire
  and can surge — that is a quote-ID lookup, not a fresh rate calculation.

CRITICAL BUG FIX — 4 leak points patched:
  LEAK 1: create_order() sets status="awaiting_payment" (was "pending").
  LEAK 2: send-confirmation endpoint no longer emails the seller.
  LEAK 3: get_seller_orders() filters out non-paid statuses.
  LEAK 4: get_store_orders() filters out non-paid statuses.

ROUTE ORDER FIX:
  Cart endpoints and send-confirmation MUST come before /{order_id}
  otherwise FastAPI matches "cart" as an order_id and returns 404.
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

SELLER_VISIBLE_STATUSES = [
    "pending",
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


# ─────────────────────────── Shipping resolver ──────────────────────────────
# AMAZON STANDARD: resolve_shipping_cost() does NOT call Shippo.
# The rate was already fetched and shown to the customer by /shipping/estimate.
# We trust that verified amount here. The shippo_rate_id is stored on the order
# so the seller's label creation uses the exact same rate — no new Shippo call.
#
# Uber Direct is the only exception: quotes expire and can surge, so we do a
# lightweight quote-ID lookup (not a fresh rate fetch) to confirm the price
# hasn't changed since the customer selected it.
# ────────────────────────────────────────────────────────────────────────────

def resolve_shipping_cost(
    delivery_method: str,
    client_fee:      float,
    uber_quote_id:   Optional[str] = None,
) -> float:
    """
    Return the shipping cost to save on the order.

    - pickup  → always $0
    - usps    → trust client_fee (already verified by /shipping/estimate)
    - uber    → re-verify quote_id because Uber quotes expire and can surge
    - other   → trust client_fee
    """
    method = (delivery_method or "").lower()

    if method == "pickup":
        return 0.0

    if method.startswith("uber"):
        if uber_quote_id:
            try:
                from routers.uber_direct import verify_uber_quote
                expected_cents = round(float(client_fee or 0.0) * 100)
                verified = verify_uber_quote(uber_quote_id, expected_cents)
                print(f"[Orders] Uber quote verified: ${verified} (client sent ${client_fee})")
                return verified
            except HTTPException:
                raise
            except Exception as e:
                print(f"[Orders] Uber quote verify error: {e}")
        print("[Orders] WARNING: Uber quote_id missing. Using client-supplied fee.")
        return round(float(client_fee or 0.0), 2)

    # USPS / any other carrier — trust the rate already shown to the customer
    verified = round(float(client_fee or 0.0), 2)
    print(f"[Orders] Shipping locked at checkout rate: ${verified} method={method}")
    return verified


# ─────────────────────────── Order creation ─────────────────────────────────

@router.post("/", response_model=schemas.OrderOut, status_code=201)
def create_order(
    order_in: schemas.OrderCreate,
    db:           Session       = Depends(get_db),
    current_user: models.User   = Depends(auth_utils.get_current_user),
):
    from sqlalchemy import text

    store = db.query(models.Store).filter(
        models.Store.id == order_in.store_id,
        models.Store.status == models.SellerStatus.approved
    ).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found or not active")

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

    order_items: list[tuple] = []
    subtotal = 0.0

    for item in order_in.items:
        product = db.query(models.Product).filter(
            models.Product.id        == item.product_id,
            models.Product.store_id  == order_in.store_id,
            models.Product.is_active == True,
        ).first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item.product_id} not found in this store")
        if product.stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for '{product.name}'")

        line_total = product.price * item.quantity
        subtotal  += line_total
        order_items.append((product, item.quantity, product.price, line_total))

    # ── AMAZON STANDARD: one shipping calculation, done at estimate time ──
    # resolve_shipping_cost() trusts the client-supplied fee for USPS.
    # No second Shippo API call is made here.
    shipping_cost = resolve_shipping_cost(
        delivery_method = order_in.delivery_method,
        client_fee      = order_in.delivery_fee,
        uber_quote_id   = getattr(order_in, "uber_quote_id", None),
    )

    platform_fee, seller_amount, total = calculate_order_amounts(subtotal, shipping_cost)

    # total = subtotal + shipping — this is what Stripe must charge
    print(f"[Orders] Order totals: subtotal=${subtotal} shipping=${shipping_cost} total=${total}")

    order = models.Order(
        buyer_id         = current_user.id,
        store_id         = store.id,
        status           = models.OrderStatus.awaiting_payment,
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

    # Store the locked Shippo rate_id so label creation uses the same rate
    # and the seller is never charged a different amount than the customer paid
    try:
        order.delivery_method = order_in.delivery_method
        order.delivery_fee    = shipping_cost
    except Exception:
        pass

    try:
        # shippo_rate_id is sent by the frontend after /shipping/estimate
        # If your OrderCreate schema doesn't have this field yet, add it as Optional[str]
        if getattr(order_in, "shippo_rate_id", None):
            order.shippo_rate_id = order_in.shippo_rate_id
            print(f"[Orders] Locked Shippo rate_id={order_in.shippo_rate_id} for order")
    except Exception:
        pass

    try:
        if getattr(order_in, "shipping_method", None):
            order.shipping_method = order_in.shipping_method
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

    ordered_ids = [item.product_id for item in order_in.items]
    db.query(models.CartItem).filter(
        models.CartItem.user_id    == current_user.id,
        models.CartItem.product_id.in_(ordered_ids),
    ).delete(synchronize_session=False)

    db.commit()

    order = db.query(models.Order).options(
        joinedload(models.Order.items)
            .joinedload(models.OrderItem.product)
            .joinedload(models.Product.store),
        joinedload(models.Order.store),
    ).filter(models.Order.id == order.id).first()

    return order


# ─────────────────────────── Named order routes ──────────────────────────────

@router.get("/my-orders", response_model=schemas.PaginatedOrders)
def get_my_orders(
    page: int = 1,
    size: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
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
        if status not in SELLER_VISIBLE_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status filter '{status}'. Must be one of: {', '.join(SELLER_VISIBLE_STATUSES)}"
            )
        query = query.filter(models.Order.status == status)
    else:
        query = query.filter(models.Order.status.in_(SELLER_VISIBLE_STATUSES))

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
        query = query.filter(models.Order.status.in_(SELLER_VISIBLE_STATUSES))

    query = query.order_by(models.Order.created_at.desc())
    total  = query.count()
    orders = query.offset((page - 1) * size).limit(size).all()
    return {"items": orders, "total": total, "page": page, "size": size}


# ─────────────────────────── Cart endpoints ─────────────────────────────────
# IMPORTANT: These MUST be defined before /{order_id} routes.
# FastAPI matches top-to-bottom — if /{order_id} comes first,
# "cart" gets matched as an order_id and returns 404.

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
                    item.product.store.vendor_type   = store_map[sid][0]
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
    Send a confirmation email to the buyer only.
    Seller email fires from the Stripe webhook after payment is confirmed.
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
        send_order_confirmation(
            buyer_email=current_user.email, buyer_name=current_user.full_name,
            order_id=order.id, items=email_items, subtotal=order.subtotal,
            shipping=order.shipping_cost, total=order.total,
            store_name=order.store.name if order.store else "Afrizone",
        )
    except Exception as e:
        print(f"Email error: {e}")
    return {"sent": True}


# ─────────────────────────── Wildcard routes — MUST BE LAST ─────────────────
# Any route with /{order_id} must come after all named routes above.
# If placed earlier, FastAPI will match "cart", "my-orders" etc. as IDs.

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
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        schemas.OrderOut.model_validate(order)
    except Exception as e:
        print(f"[get_order] SERIALIZATION ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"Serialization failed: {str(e)}")

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