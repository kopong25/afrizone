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
    """Get the current seller's store."""
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
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
    for key, value in updates.model_dump(exclude_none=True).items():
        setattr(store, key, value)
    db.commit()
    db.refresh(store)
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
