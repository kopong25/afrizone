from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, auth as auth_utils

router = APIRouter()


@router.get("/stats", response_model=schemas.PlatformStats)
def get_platform_stats(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth_utils.require_admin)
):
    """Platform-wide statistics for the admin dashboard."""
    total_revenue = db.query(models.Order).filter(
        models.Order.status == models.OrderStatus.delivered
    ).with_entities(models.Order.platform_fee).all()

    return {
        "total_users": db.query(models.User).count(),
        "total_sellers": db.query(models.Store).count(),
        "total_products": db.query(models.Product).filter(models.Product.is_active == True).count(),
        "total_orders": db.query(models.Order).count(),
        "total_revenue": sum(r[0] for r in total_revenue),
        "pending_sellers": db.query(models.Store).filter(
            models.Store.status == models.SellerStatus.pending
        ).count(),
    }


@router.get("/sellers/pending", response_model=List[schemas.StoreOut])
def get_pending_sellers(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth_utils.require_admin)
):
    return db.query(models.Store).filter(models.Store.status == models.SellerStatus.pending).all()


@router.put("/sellers/{store_id}/approve", response_model=schemas.StoreOut)
def approve_seller(
    store_id: int,
    approval: schemas.SellerApproval,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth_utils.require_admin)
):
    store = db.query(models.Store).filter(models.Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    store.status = approval.status
    db.commit()
    db.refresh(store)

    try:
        from utils.email import send_seller_approved
        send_seller_approved(store.owner.email, store.owner.full_name, store.name)
    except Exception as e:
        print(f"Email error: {e}")

    return store


@router.get("/users", response_model=List[schemas.UserOut])
def list_users(
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth_utils.require_admin)
):
    return db.query(models.User).offset(skip).limit(limit).all()


@router.put("/users/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth_utils.require_admin)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return {"message": "User deactivated"}


@router.put("/products/{product_id}/feature")
def feature_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth_utils.require_admin)
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_featured = not product.is_featured
    db.commit()
    return {"is_featured": product.is_featured}


@router.get("/analytics")
def admin_analytics(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_admin)
):
    """Platform-wide analytics for admin dashboard."""
    from datetime import datetime, timedelta, timezone
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Platform totals
    total_users    = db.query(models.User).count()
    total_stores   = db.query(models.Store).count()
    total_products = db.query(models.Product).count()
    total_orders   = db.query(models.Order).filter(models.Order.status != models.OrderStatus.cancelled).count()
    total_revenue  = db.query(models.Order).filter(models.Order.status != models.OrderStatus.cancelled).all()
    gmv            = sum(o.total for o in total_revenue)
    platform_fees  = sum(o.platform_fee for o in total_revenue)

    # Period stats
    period_orders = db.query(models.Order).filter(
        models.Order.created_at >= since,
        models.Order.status != models.OrderStatus.cancelled,
    ).all()
    period_gmv = sum(o.total for o in period_orders)
    period_fees = sum(o.platform_fee for o in period_orders)

    # Daily chart
    from datetime import timedelta
    daily = {}
    for i in range(days):
        day = (datetime.now(timezone.utc) - timedelta(days=days - i - 1)).strftime("%Y-%m-%d")
        daily[day] = {"date": day, "gmv": 0.0, "orders": 0, "fees": 0.0}
    for o in period_orders:
        day = o.created_at.strftime("%Y-%m-%d")
        if day in daily:
            daily[day]["gmv"] += o.total
            daily[day]["orders"] += 1
            daily[day]["fees"] += o.platform_fee

    # Top sellers by revenue
    all_stores = db.query(models.Store).all()
    store_revenues = []
    for s in all_stores:
        rev = sum(o.seller_amount for o in s.orders if o.status != models.OrderStatus.cancelled and o.created_at >= since)
        store_revenues.append({
            "id": s.id, "name": s.name, "city": s.city, "country": s.country,
            "revenue": rev, "orders": len([o for o in s.orders if o.created_at >= since]),
            "avg_rating": s.avg_rating,
        })
    top_sellers = sorted(store_revenues, key=lambda x: x["revenue"], reverse=True)[:10]

    # Top products
    from sqlalchemy import func
    top_products_raw = db.query(
        models.OrderItem.product_id,
        func.sum(models.OrderItem.total_price).label("revenue"),
        func.sum(models.OrderItem.quantity).label("units"),
    ).join(models.Order).filter(
        models.Order.created_at >= since,
        models.Order.status != models.OrderStatus.cancelled,
    ).group_by(models.OrderItem.product_id).order_by(func.sum(models.OrderItem.total_price).desc()).limit(10).all()

    top_products = []
    for row in top_products_raw:
        p = db.query(models.Product).filter(models.Product.id == row.product_id).first()
        if p:
            top_products.append({"id": p.id, "name": p.name, "store": p.store.name if p.store else "", "revenue": float(row.revenue), "units": int(row.units)})

    # New users per day
    new_users = db.query(models.User).filter(models.User.created_at >= since).count()

    return {
        "period_days": days,
        "all_time": {"gmv": round(gmv, 2), "platform_fees": round(platform_fees, 2), "total_users": total_users, "total_stores": total_stores, "total_products": total_products, "total_orders": total_orders},
        "period": {"gmv": round(period_gmv, 2), "fees": round(period_fees, 2), "orders": len(period_orders), "new_users": new_users},
        "daily_chart": list(daily.values()),
        "top_sellers": top_sellers,
        "top_products": top_products,
    }