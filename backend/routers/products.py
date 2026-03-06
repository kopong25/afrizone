from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional
from database import get_db
import models, schemas, auth as auth_utils
from utils.cloudinary import upload_image
from slugify import slugify
import math

router = APIRouter()


@router.get("/", response_model=schemas.PaginatedProducts)
def list_products(
    q: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = None,
    country_of_origin: Optional[str] = None,
    store_id: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    featured: Optional[bool] = None,
    sort: str = "created_at",   # created_at | price_asc | price_desc | rating | popular
    page: int = 1,
    size: int = 24,
    db: Session = Depends(get_db)
):
    """Browse & search all active products with filters and pagination."""
    query = db.query(models.Product).filter(
        models.Product.is_active == True,
        models.Product.stock > 0
    )

    # Full-text search
    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                models.Product.name.ilike(search),
                models.Product.description.ilike(search),
            )
        )

    # Filters
    if category:
        cat = db.query(models.Category).filter(models.Category.slug == category).first()
        if cat:
            query = query.filter(models.Product.category_id == cat.id)
    if country_of_origin:
        query = query.filter(models.Product.country_of_origin == country_of_origin)
    if store_id:
        query = query.filter(models.Product.store_id == store_id)
    if min_price:
        query = query.filter(models.Product.price >= min_price)
    if max_price:
        query = query.filter(models.Product.price <= max_price)
    if featured is not None:
        query = query.filter(models.Product.is_featured == featured)

    # Sorting
    sort_map = {
        "created_at": models.Product.created_at.desc(),
        "price_asc": models.Product.price.asc(),
        "price_desc": models.Product.price.desc(),
        "rating": models.Product.avg_rating.desc(),
        "popular": models.Product.sale_count.desc(),
    }
    query = query.order_by(sort_map.get(sort, models.Product.created_at.desc()))

    total = query.count()
    items = query.offset((page - 1) * size).limit(size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": math.ceil(total / size),
        "size": size,
    }


@router.get("/categories", response_model=List[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    """Get all product categories."""
    return db.query(models.Category).filter(models.Category.parent_id == None).all()


@router.get("/{slug}", response_model=schemas.ProductOut)
def get_product(slug: str, db: Session = Depends(get_db)):
    """Get a single product by slug (public)."""
    product = db.query(models.Product).filter(
        models.Product.slug == slug,
        models.Product.is_active == True
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    # Increment view count
    product.view_count += 1
    db.commit()
    db.refresh(product)
    return product


# ──── SELLER: Manage their own products ────

@router.get("/seller/mine", response_model=List[schemas.ProductOut])
def get_my_products(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    """Get all products belonging to the logged-in seller."""
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return db.query(models.Product).filter(models.Product.store_id == store.id).all()


@router.post("/seller/create", response_model=schemas.ProductOut, status_code=201)
def create_product(
    product_in: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    """Create a new product listing."""
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    if store.status != models.SellerStatus.approved:
        raise HTTPException(status_code=403, detail="Store must be approved before listing products")

    # Check listing limits per tier
    product_count = db.query(models.Product).filter(models.Product.store_id == store.id).count()
    limits = {models.SellerTier.basic: 50, models.SellerTier.standard: 200, models.SellerTier.premium: 99999}
    if product_count >= limits.get(store.tier, 50):
        raise HTTPException(status_code=403, detail=f"Product limit reached for your {store.tier} plan. Please upgrade.")

    slug = slugify(product_in.name)
    # Ensure unique slug
    existing = db.query(models.Product).filter(models.Product.slug == slug).first()
    if existing:
        slug = f"{slug}-{store.id}"

    product = models.Product(
        store_id=store.id,
        slug=slug,
        **product_in.model_dump()
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/seller/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: int,
    updates: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    """Update a product (seller must own it)."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store or product.store_id != store.id:
        raise HTTPException(status_code=403, detail="You don't own this product")

    for key, value in updates.model_dump(exclude_none=True).items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@router.post("/seller/{product_id}/images")
async def upload_product_images(
    product_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    """Upload up to 5 images for a product."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store or product.store_id != store.id:
        raise HTTPException(status_code=403, detail="You don't own this product")

    if len(files) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 images per product")

    urls = []
    for f in files:
        url = await upload_image(f, folder=f"afrizone/products/{product_id}")
        urls.append(url)

    product.images = (product.images or []) + urls
    db.commit()
    return {"images": product.images}


@router.delete("/seller/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    """Soft-delete a product (marks inactive)."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store or product.store_id != store.id:
        raise HTTPException(status_code=403, detail="You don't own this product")

    product.is_active = False
    db.commit()
