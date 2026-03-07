from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, auth as auth_utils

router = APIRouter()


@router.get("/product/{product_id}", response_model=List[schemas.ReviewOut])
def get_product_reviews(product_id: int, db: Session = Depends(get_db)):
    return db.query(models.Review).filter(
        models.Review.product_id == product_id
    ).order_by(models.Review.created_at.desc()).all()


@router.post("/", response_model=schemas.ReviewOut, status_code=201)
def create_review(
    review_in: schemas.ReviewCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """Submit a product review. User must have purchased the product."""
    product = db.query(models.Product).filter(models.Product.id == review_in.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check for duplicate review
    existing = db.query(models.Review).filter(
        models.Review.user_id == current_user.id,
        models.Review.product_id == review_in.product_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this product")

    # Check if verified purchase
    purchased = db.query(models.OrderItem).join(models.Order).filter(
        models.Order.buyer_id == current_user.id,
        models.OrderItem.product_id == review_in.product_id,
        models.Order.status == models.OrderStatus.delivered
    ).first()

    review = models.Review(
        user_id=current_user.id,
        is_verified_purchase=bool(purchased),
        **review_in.model_dump()
    )
    db.add(review)
    db.flush()

    # Recalculate product avg rating
    all_reviews = db.query(models.Review).filter(models.Review.product_id == product.id).all()
    product.avg_rating = round(sum(r.rating for r in all_reviews) / len(all_reviews), 2)
    product.review_count = len(all_reviews)

    db.commit()
    db.refresh(review)
    return review


@router.delete("/{review_id}", status_code=204)
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id != current_user.id and current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")
    db.delete(review)
    db.commit()


@router.get("/store/{store_id}", response_model=List[schemas.ReviewOut])
def get_store_reviews(store_id: int, db: Session = Depends(get_db)):
    """Get all reviews for a store's products."""
    return db.query(models.Review).join(models.Product).filter(
        models.Product.store_id == store_id
    ).order_by(models.Review.created_at.desc()).limit(20).all()


@router.post("/{review_id}/helpful")
def mark_helpful(review_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.helpful_count = (review.helpful_count or 0) + 1
    db.commit()
    return {"helpful_count": review.helpful_count}