from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from database import get_db
import models, schemas, auth as auth_utils
from slugify import slugify

router = APIRouter()


@router.post("/register", response_model=schemas.TokenResponse, status_code=201)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new buyer or seller account."""
    # Check email not already taken
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user = models.User(
        email=user_in.email,
        hashed_password=auth_utils.hash_password(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        country=user_in.country,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # If registering as seller, create an empty store (pending approval)
    if user_in.role == models.UserRole.seller:
        store = models.Store(
            owner_id=user.id,
            name=f"{user.full_name}'s Store",
            slug=slugify(f"{user.full_name}-store-{user.id}"),
            country=user_in.country or "USA",
            status=models.SellerStatus.pending,
        )
        db.add(store)
        db.commit()

    token = auth_utils.create_access_token({"sub": user.id})
    return {"access_token": token, "user": user}


@router.post("/login", response_model=schemas.TokenResponse)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Login with email and password."""
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not auth_utils.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = auth_utils.create_access_token({"sub": user.id})
    return {"access_token": token, "user": user}


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(auth_utils.get_current_user)):
    """Get the currently authenticated user's profile."""
    return current_user


@router.put("/me", response_model=schemas.UserOut)
def update_me(
    updates: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """Update current user's profile (name, phone, country)."""
    allowed = {"full_name", "phone", "country"}
    for key, value in updates.items():
        if key in allowed:
            setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password")
def change_password(
    data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """Change user password."""
    if not auth_utils.verify_password(data.get("current_password", ""), current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    new_password = data.get("new_password", "")
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    current_user.hashed_password = auth_utils.hash_password(new_password)
    db.commit()
    return {"message": "Password updated successfully"}