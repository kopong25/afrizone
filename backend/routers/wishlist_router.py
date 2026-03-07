from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, auth as auth_utils

router = APIRouter()

@router.get("/", response_model=List[schemas.WishlistItemOut])
def get_wishlist(db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    return db.query(models.WishlistItem).filter(models.WishlistItem.user_id == current_user.id).all()

@router.post("/{product_id}")
def toggle_wishlist(product_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    existing = db.query(models.WishlistItem).filter(
        models.WishlistItem.user_id == current_user.id,
        models.WishlistItem.product_id == product_id
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"wishlisted": False}
    item = models.WishlistItem(user_id=current_user.id, product_id=product_id)
    db.add(item)
    db.commit()
    return {"wishlisted": True}

@router.get("/ids")
def get_wishlist_ids(db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    items = db.query(models.WishlistItem.product_id).filter(models.WishlistItem.user_id == current_user.id).all()
    return [i[0] for i in items]