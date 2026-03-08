from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, auth as auth_utils

router = APIRouter()

@router.get("/product/{product_id}", response_model=List[schemas.VariantOut])
def get_variants(product_id: int, db: Session = Depends(get_db)):
    return db.query(models.ProductVariant).filter(
        models.ProductVariant.product_id == product_id,
        models.ProductVariant.is_active == True
    ).all()

@router.post("/product/{product_id}", response_model=schemas.VariantOut, status_code=201)
def create_variant(product_id: int, data: schemas.VariantCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.require_seller)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store or product.store_id != store.id:
        raise HTTPException(status_code=403, detail="Not your product")
    variant = models.ProductVariant(product_id=product_id, **data.model_dump())
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant

@router.delete("/{variant_id}", status_code=204)
def delete_variant(variant_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.require_seller)):
    variant = db.query(models.ProductVariant).filter(models.ProductVariant.id == variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(variant)
    db.commit()