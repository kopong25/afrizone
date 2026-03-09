from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, auth as auth_utils
import os
import math

PLATFORM_FEE_PERCENT = float(os.getenv("PLATFORM_FEE_PERCENT", "8"))

router = APIRouter()


def calculate_order_amounts(subtotal: float, shipping: float = 0.0):
    platform_fee = round(subtotal * (PLATFORM_FEE_PERCENT / 100), 2)
    seller_amount = round(subtotal - platform_fee, 2)
    total = round(subtotal + shipping, 2)
    return platform_fee, seller_amount, total


@router.post("/", response_model=schemas.OrderOut, status_code=201)
def create_order(
    order_in: schemas.OrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """Create a new order. All items must belong to the same store."""
    store = db.query(models.Store).filter(
        models.Store.id == order_in.store_id,
        models.Store.status == models.SellerStatus.approved
    ).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found or not active")

    # Validate products and calculate subtotal
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

    shipping_cost = 0.0  # TODO: integrate shipping calculator
    platform_fee, seller_amount, total = calculate_order_amounts(subtotal, shipping_cost)

    # Create order
    order = models.Order(
        buyer_id=current_user.id,
        store_id=store.id,
        subtotal=subtotal,
        shipping_cost=shipping_cost,
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
    db.add(order)
    db.flush()  # Get order.id before committing

    # Create order items and deduct stock
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

    db.commit()
    db.refresh(order)

    # Send email notifications (non-blocking)
    try:
        from utils.email import send_order_confirmation, send_new_order_to_seller
        email_items = [{"name": oi.product.name, "quantity": oi.quantity, "price": oi.unit_price} for oi in order.items]
        send_order_confirmation(
            buyer_email=current_user.email,
            buyer_name=current_user.full_name,
            order_id=order.id,
            items=email_items,
            subtotal=order.subtotal,
            shipping=order.shipping_cost,
            total=order.total,
            store_name=store.name,
        )
        send_new_order_to_seller(
            seller_email=store.owner.email,
            store_name=store.name,
            order_id=order.id,
            items=email_items,
            total=order.total,
            seller_amount=order.seller_amount,
            buyer_name=current_user.full_name,
        )
    except Exception as e:
        print(f"Email error: {e}")

    return order


@router.get("/my-orders", response_model=schemas.PaginatedOrders)
def get_my_orders(
    page: int = 1,
    size: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """Get all orders placed by the current buyer."""
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
    """Get all orders for the seller's store."""
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    query = db.query(models.Order).filter(models.Order.store_id == store.id)
    if status:
        query = query.filter(models.Order.status == status)

    total = query.count()
    orders = query.order_by(models.Order.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {"items": orders, "total": total, "page": page, "pages": math.ceil(total / size), "size": size}


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """Get a single order (buyer sees their own; seller sees their store's orders)."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check access rights
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
    """Seller updates order status (e.g., shipped, delivered)."""
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

    # Update store stats when delivered
    if update.status == models.OrderStatus.delivered:
        store.total_sales += 1
        store.total_revenue += order.seller_amount

    db.commit()
    db.refresh(order)

    # Send status-change emails
    try:
        from utils.email import send_shipping_update, send_delivery_confirmation
        buyer = db.query(models.User).filter(models.User.id == order.buyer_id).first()
        if buyer:
            if update.status == models.OrderStatus.shipped:
                send_shipping_update(
                    buyer_email=buyer.email,
                    buyer_name=buyer.full_name,
                    order_id=order.id,
                    tracking_number=order.tracking_number,
                    tracking_url=order.tracking_url,
                    store_name=store.name,
                )
            elif update.status == models.OrderStatus.delivered:
                send_delivery_confirmation(
                    buyer_email=buyer.email,
                    buyer_name=buyer.full_name,
                    order_id=order.id,
                    store_name=store.name,
                )
    except Exception as e:
        print(f"Email error: {e}")

    return order




@router.get("/store-orders")
def get_store_orders(
    page: int = 1,
    size: int = 50,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    """Get all orders for the seller's store."""
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    query = db.query(models.Order).filter(models.Order.store_id == store.id)
    if status:
        query = query.filter(models.Order.status == status)
    query = query.order_by(models.Order.created_at.desc())

    total = query.count()
    orders = query.offset((page - 1) * size).limit(size).all()
    return {"items": orders, "total": total, "page": page, "size": size}

# ─── CART ───

@router.get("/cart/items", response_model=List[schemas.CartItemOut])
def get_cart(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    return db.query(models.CartItem).filter(models.CartItem.user_id == current_user.id).all()


@router.post("/cart/add", response_model=schemas.CartItemOut, status_code=201)
def add_to_cart(
    item: schemas.CartItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check if already in cart
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