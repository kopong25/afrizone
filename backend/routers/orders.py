from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from database import get_db
import models, schemas, auth as auth_utils
import os
import math
import json
from datetime import datetime, timezone as dt_timezone

PLATFORM_FEE_PERCENT = float(os.getenv("PLATFORM_FEE_PERCENT", "8"))

router = APIRouter()


def calculate_order_amounts(subtotal: float, shipping: float = 0.0):
    platform_fee = round(subtotal * (PLATFORM_FEE_PERCENT / 100), 2)
    seller_amount = round(subtotal - platform_fee, 2)
    total = round(subtotal + shipping, 2)
    return platform_fee, seller_amount, total


def get_local_time(tz_name: str) -> datetime:
    """Return current time in the given timezone using stdlib zoneinfo (Python 3.9+)."""
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo(tz_name))
    except Exception:
        return datetime.now(dt_timezone.utc)


def fetch_verified_shipping_cost(
    delivery_method: str,
    store_id: int,
    shipping_address: dict,
    client_fee: float,
    db: Session,
) -> float:
    """
    Returns the authoritative shipping cost for an order.

    Rules:
    - pickup:   always $0, no external call needed.
    - usps_*:   always re-fetch from Shippo. Client value is ignored.
    - uber_*:   trust the client fee for now (Uber quotes are session-scoped;
                server-side re-verification requires storing the quote_id and
                calling Uber's quote confirmation endpoint — add that when ready).
    - anything else: trust client fee (same caveat as Uber).

    Raises HTTPException 400 if Shippo call fails and we cannot determine
    a safe rate, so the order is blocked rather than undercharged.
    """
    method = (delivery_method or "").lower()

    # ── Pickup is always free ─────────────────────────────────────────────
    if method == "pickup":
        return 0.0

    # ── USPS: re-verify via Shippo server-side ────────────────────────────
    if method.startswith("usps"):
        try:
            import httpx
            shippo_token = os.getenv("SHIPPO_API_KEY") or os.getenv("SHIPPO_TOKEN")
            if not shippo_token:
                # No Shippo key configured — fall back to client value with a warning
                print("[Orders] WARNING: SHIPPO_API_KEY not set. Using client-supplied delivery_fee.")
                return round(float(client_fee or 0.0), 2)

            # Look up store's origin address
            from sqlalchemy import text
            row = db.execute(
                text("SELECT address, city, state, zip, country FROM stores WHERE id = :id"),
                {"id": store_id}
            ).fetchone()

            if not row:
                raise HTTPException(status_code=400, detail="Store address not found for shipping calculation.")

            store_address = row[0] or ""
            store_city    = row[1] or ""
            store_state   = row[2] or ""
            store_zip     = row[3] or ""
            store_country = (row[4] or "US").upper()
            if store_country in ("USA", "UNITED STATES"):
                store_country = "US"

            dest_country = (shipping_address.get("country") or "US").upper()
            if dest_country in ("USA", "UNITED STATES"):
                dest_country = "US"

            payload = {
                "address_from": {
                    "street1": store_address,
                    "city":    store_city,
                    "state":   store_state,
                    "zip":     store_zip,
                    "country": store_country,
                },
                "address_to": {
                    "street1": shipping_address.get("address", ""),
                    "city":    shipping_address.get("city", ""),
                    "state":   shipping_address.get("state", ""),
                    "zip":     shipping_address.get("zip", ""),
                    "country": dest_country,
                },
                "parcels": [{
                    "length": "10",
                    "width":  "8",
                    "height": "4",
                    "distance_unit": "in",
                    "weight": "1",
                    "mass_unit": "lb",
                }],
                "async": False,
            }

            resp = httpx.post(
                "https://api.goshippo.com/shipments/",
                json=payload,
                headers={
                    "Authorization": f"ShippoToken {shippo_token}",
                    "Content-Type":  "application/json",
                },
                timeout=10.0,
            )
            resp.raise_for_status()
            data = resp.json()

            rates = data.get("rates", [])
            # Find cheapest USPS Priority Mail rate
            usps_rates = [
                r for r in rates
                if r.get("provider", "").upper() == "USPS"
                and "PRIORITY" in r.get("servicelevel", {}).get("name", "").upper()
                and r.get("amount")
            ]
            if not usps_rates:
                # Fall back to any USPS rate
                usps_rates = [r for r in rates if r.get("provider", "").upper() == "USPS" and r.get("amount")]

            if usps_rates:
                best = min(usps_rates, key=lambda r: float(r["amount"]))
                verified_rate = round(float(best["amount"]), 2)
                print(f"[Orders] Shippo verified USPS rate: ${verified_rate} (client sent ${client_fee})")
                return verified_rate

            # Shippo returned no USPS rates — block order rather than undercharge
            raise HTTPException(
                status_code=400,
                detail="Unable to calculate shipping cost. Please try again or contact support."
            )

        except HTTPException:
            raise
        except Exception as e:
            print(f"[Orders] Shippo verification error: {e}")
            raise HTTPException(
                status_code=400,
                detail="Shipping rate verification failed. Please try again."
            )

    # ── Uber Direct / other: trust client fee ─────────────────────────────
    # TODO: verify Uber quotes server-side using stored quote_id when ready.
    return round(float(client_fee or 0.0), 2)


@router.post("/", response_model=schemas.OrderOut, status_code=201)
def create_order(
    order_in: schemas.OrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """Create a new order. All items must belong to the same store."""
    from sqlalchemy import text

    store = db.query(models.Store).filter(
        models.Store.id == order_in.store_id,
        models.Store.status == models.SellerStatus.approved
    ).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found or not active")

    # ── Block orders to closed restaurants ──────────────────────────────────
    raw = db.execute(
        text("SELECT vendor_type, weekly_hours, is_open_now, timezone FROM stores WHERE id = :id"),
        {"id": store.id}
    ).fetchone()

    if raw and raw[0] == "restaurant":
        is_open_now = raw[2]
        weekly_hours_raw = raw[1]
        store_tz = raw[3] or "America/Chicago"

        if not is_open_now:
            raise HTTPException(
                status_code=400,
                detail="This restaurant is currently closed. Please check back during opening hours."
            )

        if weekly_hours_raw:
            try:
                hours = json.loads(weekly_hours_raw) if isinstance(weekly_hours_raw, str) else weekly_hours_raw
                local_now = get_local_time(store_tz)
                day_name = local_now.strftime("%A")
                now_time = local_now.strftime("%H:%M")

                today = hours.get(day_name, {})
                if today.get("closed"):
                    raise HTTPException(
                        status_code=400,
                        detail=f"This restaurant is closed on {day_name}."
                    )
                open_time = today.get("open", "00:00")
                close_time = today.get("close", "23:59")
                if not (open_time <= now_time <= close_time):
                    raise HTTPException(
                        status_code=400,
                        detail=f"This restaurant is closed right now. Hours today: {open_time} – {close_time}."
                    )
            except HTTPException:
                raise
            except Exception:
                pass
    # ────────────────────────────────────────────────────────────────────────

    # ── Validate products and calculate subtotal ─────────────────────────
    order_items = []
    subtotal = 0.0
    for item in order_in.items:
        product = db.query(models.Product).filter(
            models.Product.id == item.product_id,
            models.Product.store_id == order_in.store_id,
            models.Product.is_active == True
        ).first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item.product_id} not found in this store")
        if product.stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for '{product.name}'")

        line_total = product.price * item.quantity
        subtotal += line_total
        order_items.append((product, item.quantity, product.price, line_total))

    # ── Verify shipping cost server-side — never trust client value ───────
    shipping_address = {
        "address": order_in.shipping.address,
        "city":    order_in.shipping.city,
        "state":   order_in.shipping.state,
        "zip":     order_in.shipping.zip,
        "country": order_in.shipping.country,
    }
    shipping_cost = fetch_verified_shipping_cost(
        delivery_method=order_in.delivery_method,
        store_id=order_in.store_id,
        shipping_address=shipping_address,
        client_fee=order_in.delivery_fee,
        db=db,
    )

    platform_fee, seller_amount, total = calculate_order_amounts(subtotal, shipping_cost)

    order = models.Order(
        buyer_id=current_user.id,
        store_id=store.id,
        subtotal=subtotal,
        shipping_cost=shipping_cost,       # ← verified server-side rate
        platform_fee=platform_fee,
        seller_amount=seller_amount,
        total=total,
        shipping_name=order_in.shipping.name,
        shipping_address=order_in.shipping.address,
        shipping_city=order_in.shipping.city,
        shipping_state=order_in.shipping.state,
        shipping_country=order_in.shipping.country,
        shipping_zip=order_in.shipping.zip,
    )
    try:
        order.delivery_method = order_in.delivery_method
        order.delivery_fee = shipping_cost  # ← store verified rate, not client value
    except Exception:
        pass
    db.add(order)
    db.flush()

    for product, qty, unit_price, line_total in order_items:
        db.add(models.OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=qty,
            unit_price=unit_price,
            total_price=line_total,
        ))
        product.stock -= qty
        product.sale_count += qty

    ordered_product_ids = [item.product_id for item in order_in.items]
    db.query(models.CartItem).filter(
        models.CartItem.user_id == current_user.id,
        models.CartItem.product_id.in_(ordered_product_ids)
    ).delete(synchronize_session=False)

    db.commit()

    order = db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.product).joinedload(models.Product.store),
        joinedload(models.Order.store),
    ).filter(models.Order.id == order.id).first()

    return order


@router.get("/my-orders", response_model=schemas.PaginatedOrders)
def get_my_orders(
    page: int = 1,
    size: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    query = db.query(models.Order).filter(models.Order.buyer_id == current_user.id)
    total = query.count()
    orders = query.order_by(models.Order.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {"items": orders, "total": total, "page": page, "pages": math.ceil(total / size), "size": size}


@router.get("/seller/orders", response_model=schemas.PaginatedOrders)
def get_seller_orders(
    status: str = None,
    page: int = 1,
    size: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    query = db.query(models.Order).filter(models.Order.store_id == store.id)
    if status:
        query = query.filter(models.Order.status == status)
    total = query.count()
    orders = query.order_by(models.Order.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {"items": orders, "total": total, "page": page, "pages": math.ceil(total / size), "size": size}


@router.get("/store-orders")
def get_store_orders(
    page: int = 1,
    size: int = 50,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    query = db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.product),
        joinedload(models.Order.buyer)
    ).filter(models.Order.store_id == store.id)
    if status:
        query = query.filter(models.Order.status == status)
    query = query.order_by(models.Order.created_at.desc())
    total = query.count()
    orders = query.offset((page - 1) * size).limit(size).all()
    return {"items": orders, "total": total, "page": page, "size": size}


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    is_buyer = order.buyer_id == current_user.id
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    is_seller = store and order.store_id == store.id
    is_admin = current_user.role == models.UserRole.admin
    if not (is_buyer or is_seller or is_admin):
        raise HTTPException(status_code=403, detail="Access denied")
    return order


@router.put("/{order_id}/status", response_model=schemas.OrderOut)
def update_order_status(
    order_id: int,
    update: schemas.OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store or order.store_id != store.id:
        raise HTTPException(status_code=403, detail="Access denied")
    order.status = update.status
    if update.tracking_number:
        order.tracking_number = update.tracking_number
    if update.tracking_url:
        order.tracking_url = update.tracking_url
    if update.status == models.OrderStatus.delivered:
        store.total_sales += 1
        store.total_revenue += order.seller_amount
    db.commit()
    order = db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.product).joinedload(models.Product.store),
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


# ─── CART ───────────────────────────────────────────────────────────────────

@router.get("/cart/items", response_model=List[schemas.CartItemOut])
def get_cart(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
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
        rows = db.execute(text(f"SELECT id, vendor_type, delivery_type FROM stores WHERE id IN ({placeholders})")).fetchall()
        store_map = {r[0]: (r[1], r[2]) for r in rows}
        for item in cart_items:
            if item.product and item.product.store:
                sid = item.product.store.id
                if sid in store_map:
                    item.product.store.vendor_type = store_map[sid][0]
                    item.product.store.delivery_type = store_map[sid][1]
    return cart_items


@router.post("/cart/add", response_model=schemas.CartItemOut, status_code=201)
def add_to_cart(
    item: schemas.CartItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")
    existing = db.query(models.CartItem).filter(
        models.CartItem.user_id == current_user.id,
        models.CartItem.product_id == item.product_id
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
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    db.query(models.CartItem).filter(models.CartItem.user_id == current_user.id).delete()
    db.commit()


@router.delete("/cart/{item_id}", status_code=204)
def remove_from_cart(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    item = db.query(models.CartItem).filter(
        models.CartItem.id == item_id,
        models.CartItem.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    db.delete(item)
    db.commit()


@router.post("/{order_id}/send-confirmation")
def send_order_confirmation_email(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    order = db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.product),
        joinedload(models.Order.store).joinedload(models.Store.owner),
    ).filter(
        models.Order.id == order_id,
        models.Order.buyer_id == current_user.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    try:
        from utils.email import send_order_confirmation, send_new_order_to_seller
        email_items = [{"name": oi.product.name, "quantity": oi.quantity, "price": oi.unit_price} for oi in order.items]
        send_order_confirmation(
            buyer_email=current_user.email, buyer_name=current_user.full_name,
            order_id=order.id, items=email_items, subtotal=order.subtotal,
            shipping=order.shipping_cost, total=order.total,
            store_name=order.store.name if order.store else "Afrizone",
        )
        seller_email = order.store.owner.email if order.store and order.store.owner else None
        if seller_email:
            send_new_order_to_seller(
                seller_email=seller_email, store_name=order.store.name,
                order_id=order.id, items=email_items, total=order.total,
                seller_amount=order.seller_amount, buyer_name=current_user.full_name,
            )
    except Exception as e:
        print(f"Email error: {e}")
    return {"sent": True}