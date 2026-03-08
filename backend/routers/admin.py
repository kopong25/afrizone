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