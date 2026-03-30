"""
Ads management router for Afrizone.
Admin can create/edit/delete ads and mark up to 4 as featured.
Featured ads appear in the homepage carousel.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
import models
import auth as auth_utils
from utils.cloudinary import upload_image

router = APIRouter(tags=["ads"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class AdCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    cta_text: Optional[str] = "Shop Now"
    cta_url: Optional[str] = "/"
    image_url: Optional[str] = None
    emoji: Optional[str] = "⚡"
    bg_color: Optional[str] = "#006B3F"
    accent_color: Optional[str] = "#FCD116"
    is_featured: Optional[bool] = False
    sort_order: Optional[int] = 0

class AdUpdate(AdCreate):
    pass

class AdOut(AdCreate):
    id: int
    class Config:
        from_attributes = True


# ── Image upload — passes UploadFile directly to your existing util ───────────

@router.post("/upload-image")
async def upload_ad_image(
    file: UploadFile = File(...),
    current_user=Depends(auth_utils.get_current_user),
):
    """Admin uploads an image for a carousel ad. Returns { image_url }."""
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admins only")

    # Pass the UploadFile directly — matches your existing upload_image signature
    url = await upload_image(file, folder="afrizone/ads")
    return {"image_url": url}


# ── Public — homepage carousel ────────────────────────────────────────────────

@router.get("/featured", response_model=List[AdOut])
def get_featured_ads(db: Session = Depends(get_db)):
    """Public. Returns up to 4 featured ads for the carousel."""
    return (
        db.query(models.Ad)
        .filter(models.Ad.is_featured == True)
        .order_by(models.Ad.sort_order.asc(), models.Ad.id.asc())
        .limit(4)
        .all()
    )


# ── Admin CRUD ────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[AdOut])
def list_all_ads(
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_user),
):
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admins only")
    return db.query(models.Ad).order_by(models.Ad.sort_order.asc()).all()


@router.post("/", response_model=AdOut)
def create_ad(
    payload: AdCreate,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_user),
):
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admins only")
    if payload.is_featured:
        count = db.query(models.Ad).filter(models.Ad.is_featured == True).count()
        if count >= 4:
            raise HTTPException(status_code=400, detail="Max 4 featured ads. Unfeature one first.")
    ad = models.Ad(**payload.dict())
    db.add(ad)
    db.commit()
    db.refresh(ad)
    return ad


@router.put("/{ad_id}", response_model=AdOut)
def update_ad(
    ad_id: int,
    payload: AdUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_user),
):
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admins only")
    ad = db.query(models.Ad).filter(models.Ad.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    if payload.is_featured and not ad.is_featured:
        count = db.query(models.Ad).filter(models.Ad.is_featured == True).count()
        if count >= 4:
            raise HTTPException(status_code=400, detail="Max 4 featured ads. Unfeature one first.")
    for k, v in payload.dict().items():
        setattr(ad, k, v)
    db.commit()
    db.refresh(ad)
    return ad


@router.delete("/{ad_id}")
def delete_ad(
    ad_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_user),
):
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admins only")
    ad = db.query(models.Ad).filter(models.Ad.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    db.delete(ad)
    db.commit()
    return {"message": "Ad deleted"}


@router.patch("/{ad_id}/feature", response_model=AdOut)
def toggle_feature(
    ad_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_user),
):
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admins only")
    ad = db.query(models.Ad).filter(models.Ad.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    if not ad.is_featured:
        count = db.query(models.Ad).filter(models.Ad.is_featured == True).count()
        if count >= 4:
            raise HTTPException(status_code=400, detail="Max 4 featured ads. Unfeature one first.")
    ad.is_featured = not ad.is_featured
    db.commit()
    db.refresh(ad)
    return ad
