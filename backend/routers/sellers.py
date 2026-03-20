from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models, schemas, auth as auth_utils
from utils.cloudinary import upload_image
from slugify import slugify

router = APIRouter()


@router.get("/", response_model=List[schemas.StoreOut])
def list_stores(
    country: Optional[str] = None,
    business_type: Optional[str] = None,
    featured: Optional[bool] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Browse all approved stores. Filter by country, type, or featured."""
    q = db.query(models.Store).filter(models.Store.status == models.SellerStatus.approved)
    if country:
        q = q.filter(models.Store.country == country)
    if business_type:
        q = q.filter(models.Store.business_type == business_type)
    if featured is not None:
        q = q.filter(models.Store.is_featured == featured)
    return q.order_by(models.Store.is_featured.desc(), models.Store.total_sales.desc()).offset(skip).limit(limit).all()


@router.get("/my-store", response_model=schemas.StoreOut)
def get_my_store(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    """Get the current seller's store. Auto-creates one if missing."""
    from sqlalchemy import text
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        store = models.Store(
            owner_id=current_user.id,
            name=f"{current_user.full_name}'s Store",
            slug=slugify(f"{current_user.full_name}-store-{current_user.id}"),
            country="USA",
            status=models.SellerStatus.pending,
        )
        db.add(store)
        db.commit()
        db.refresh(store)
    # Patch enum fields directly from DB to bypass SQLAlchemy enum mapping issues
    row = db.execute(
        text("SELECT vendor_type, delivery_type FROM stores WHERE id = :id"),
        {"id": store.id}
    ).fetchone()
    if row:
        store.vendor_type = row[0]
        store.delivery_type = row[1]
    return store


@router.put("/my-store", response_model=schemas.StoreOut)
def update_my_store(
    updates: schemas.StoreUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    """Update seller's store info."""
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    data = updates.model_dump(exclude_none=True)

    # Enforce business rules: restaurant must use local_delivery, both, or pickup
    if data.get("vendor_type") == "restaurant":
        if "delivery_type" not in data:
            data["delivery_type"] = "local_delivery"
        elif data["delivery_type"] not in ("local_delivery", "both", "pickup"):
            data["delivery_type"] = "local_delivery"
    elif data.get("vendor_type") and data.get("vendor_type") != "restaurant":
        # Non-restaurant: if they were on local_delivery, switch back to shipping
        if store.delivery_type == "local_delivery" and "delivery_type" not in data:
            data["delivery_type"] = "shipping"

    for key, value in data.items():
        # Use raw SQL update for enum columns to avoid SQLAlchemy coercion issues
        if key in ("vendor_type", "delivery_type"):
            from sqlalchemy import text
            db.execute(
                text(f"UPDATE stores SET {key} = :{key} WHERE id = :id"),
                {key: value, "id": store.id}
            )
        else:
            setattr(store, key, value)

    db.commit()
    db.refresh(store)
    # Patch enum fields from raw SQL to bypass SQLAlchemy mapping issues
    from sqlalchemy import text as _text
    row = db.execute(_text("SELECT vendor_type, delivery_type FROM stores WHERE id = :id"), {"id": store.id}).fetchone()
    if row:
        store.vendor_type = row[0]
        store.delivery_type = row[1]
    return store


@router.post("/my-store/logo")
async def upload_store_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    """Upload store logo image."""
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    url = await upload_image(file, folder=f"afrizone/stores/{store.id}/logo")
    store.logo_url = url
    db.commit()
    return {"logo_url": url}


@router.post("/my-store/banner")
async def upload_store_banner(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    """Upload store banner image."""
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    url = await upload_image(file, folder=f"afrizone/stores/{store.id}/banner")
    store.banner_url = url
    db.commit()
    return {"banner_url": url}


@router.get("/{slug}", response_model=schemas.StoreOut)
def get_store(slug: str, db: Session = Depends(get_db)):
    """Get a single store by slug (public)."""
    store = db.query(models.Store).filter(
        models.Store.slug == slug,
        models.Store.status == models.SellerStatus.approved
    ).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store


@router.get("/{store_id}/products", response_model=List[schemas.ProductListOut])
def get_store_products(store_id: int, db: Session = Depends(get_db)):
    """Get all active products for a store (public)."""
    return db.query(models.Product).filter(
        models.Product.store_id == store_id,
        models.Product.is_active == True
    ).all()


@router.get("/my-store/analytics")
def get_store_analytics(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    """Seller analytics — revenue, orders, top products, daily breakdown."""
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import func

    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    since = datetime.now(timezone.utc) - timedelta(days=days)

    # All orders in period (eager load items + products)
    from sqlalchemy.orm import joinedload as _jl
    orders = db.query(models.Order).options(
        _jl(models.Order.items).joinedload(models.OrderItem.product)
    ).filter(
        models.Order.store_id == store.id,
        models.Order.created_at >= since,
        models.Order.status != models.OrderStatus.cancelled,
    ).all()

    # All-time stats
    all_orders = db.query(models.Order).filter(
        models.Order.store_id == store.id,
        models.Order.status != models.OrderStatus.cancelled,
    ).all()

    total_revenue = sum(o.seller_amount for o in orders)
    total_orders = len(orders)
    avg_order_value = total_revenue / total_orders if total_orders > 0 else 0

    # Status breakdown
    status_counts = {}
    for o in all_orders:
        s = str(o.status.value) if hasattr(o.status, "value") else str(o.status)
        status_counts[s] = status_counts.get(s, 0) + 1

    # Daily revenue for chart (last N days)
    daily = {}
    for i in range(days):
        day = (datetime.now(timezone.utc) - timedelta(days=days - i - 1)).strftime("%Y-%m-%d")
        daily[day] = {"date": day, "revenue": 0.0, "orders": 0}
    for o in orders:
        try:
            created = o.created_at
            if created.tzinfo is None:
                from datetime import timezone as _tz
                created = created.replace(tzinfo=_tz.utc)
            day = created.strftime("%Y-%m-%d")
        except Exception:
            continue
        if day in daily:
            daily[day]["revenue"] += o.seller_amount
            daily[day]["orders"] += 1

    # Top products by revenue
    item_stats = {}
    for o in orders:
        try:
            order_items = o.items
        except Exception:
            continue
        for item in order_items:
            pid = item.product_id
            if pid not in item_stats:
                item_stats[pid] = {
                    "id": pid,
                    "name": item.product.name if item.product else "Unknown",
                    "image": item.product.images[0] if item.product and item.product.images else None,
                    "revenue": 0.0,
                    "units": 0,
                    "orders": 0,
                }
            item_stats[pid]["revenue"] += item.total_price
            item_stats[pid]["units"] += item.quantity
            item_stats[pid]["orders"] += 1

    top_products = sorted(item_stats.values(), key=lambda x: x["revenue"], reverse=True)[:5]

    # Previous period for comparison
    prev_since = since - timedelta(days=days)
    prev_orders = db.query(models.Order).filter(
        models.Order.store_id == store.id,
        models.Order.created_at >= prev_since,
        models.Order.created_at < since,
        models.Order.status != models.OrderStatus.cancelled,
    ).all()
    prev_revenue = sum(o.seller_amount for o in prev_orders)
    prev_count = len(prev_orders)

    revenue_change = ((total_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
    orders_change = ((total_orders - prev_count) / prev_count * 100) if prev_count > 0 else 0

    return {
        "period_days": days,
        "summary": {
            "total_revenue": round(total_revenue, 2),
            "total_orders": total_orders,
            "avg_order_value": round(avg_order_value, 2),
            "total_products": db.query(models.Product).filter(models.Product.store_id == store.id, models.Product.is_active == True).count(),
            "avg_rating": store.avg_rating,
            "review_count": store.review_count,
            "revenue_change_pct": round(revenue_change, 1),
            "orders_change_pct": round(orders_change, 1),
        },
        "daily_chart": list(daily.values()),
        "top_products": top_products,
        "status_breakdown": status_counts,
    }

@router.get("/{store_id}/public", response_model=schemas.StoreOut)
def get_store_by_id(store_id: int, db: Session = Depends(get_db)):
    """Get store by ID (public) — includes vendor_type and delivery_type."""
    from sqlalchemy import text
    store = db.query(models.Store).filter(models.Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    # Patch enum fields via raw SQL
    row = db.execute(text("SELECT vendor_type, delivery_type FROM stores WHERE id = :id"), {"id": store.id}).fetchone()
    if row:
        store.vendor_type = row[0]
        store.delivery_type = row[1]
    return store
