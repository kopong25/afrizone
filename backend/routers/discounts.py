from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, auth as auth_utils
from datetime import datetime, timezone

router = APIRouter()

@router.get("/seller", response_model=List[schemas.DiscountCodeOut])
def get_my_codes(db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.require_seller)):
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return db.query(models.DiscountCode).filter(models.DiscountCode.store_id == store.id).order_by(models.DiscountCode.created_at.desc()).all()

@router.post("/seller", response_model=schemas.DiscountCodeOut, status_code=201)
def create_code(data: schemas.DiscountCodeCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.require_seller)):
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    existing = db.query(models.DiscountCode).filter(models.DiscountCode.code == data.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Code already exists")
    code = models.DiscountCode(store_id=store.id, **{**data.model_dump(), "code": data.code.upper()})
    db.add(code)
    db.commit()
    db.refresh(code)
    return code

@router.delete("/seller/{code_id}", status_code=204)
def delete_code(code_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.require_seller)):
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    code = db.query(models.DiscountCode).filter(models.DiscountCode.id == code_id, models.DiscountCode.store_id == store.id).first()
    if not code:
        raise HTTPException(status_code=404, detail="Code not found")
    db.delete(code)
    db.commit()

@router.post("/apply")
def apply_code(data: schemas.ApplyDiscountRequest, db: Session = Depends(get_db)):
    code = db.query(models.DiscountCode).filter(
        models.DiscountCode.code == data.code.upper(),
        models.DiscountCode.is_active == True
    ).first()
    if not code:
        raise HTTPException(status_code=404, detail="Invalid discount code")
    if code.expires_at and code.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This code has expired")
    if code.max_uses and code.uses_count >= code.max_uses:
        raise HTTPException(status_code=400, detail="This code has reached its usage limit")
    if data.subtotal < code.min_order_amount:
        raise HTTPException(status_code=400, detail=f"Minimum order of ${code.min_order_amount:.2f} required")
    if code.discount_type == "percent":
        discount_amount = round(data.subtotal * (code.discount_value / 100), 2)
    else:
        discount_amount = min(code.discount_value, data.subtotal)
    return {
        "code": code.code,
        "discount_type": code.discount_type,
        "discount_value": code.discount_value,
        "discount_amount": discount_amount,
        "new_total": round(data.subtotal - discount_amount, 2),
        "description": code.description,
    }