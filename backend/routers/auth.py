from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from database import get_db
import models, schemas, auth as auth_utils
from slugify import slugify

router = APIRouter()


@router.post("/register", response_model=schemas.TokenResponse, status_code=201)
@limiter.limit("3/minute")
def register(request: Request, user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new buyer or seller account."""
    # Check email not already taken
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    if len(user_in.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

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
@limiter.limit("5/minute")
def login(request: Request, credentials: schemas.UserLogin, db: Session = Depends(get_db)):
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


# ── Password Reset ─────────────────────────────────────────────────────────────

@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, payload: dict, db: Session = Depends(get_db)):
    """Send password reset email. Always returns 200 to prevent email enumeration."""
    email = payload.get("email", "").strip().lower()
    user = db.query(models.User).filter(models.User.email == email).first()
    if user:
        # Invalidate any existing tokens
        db.query(models.PasswordResetToken).filter(
            models.PasswordResetToken.user_id == user.id,
            models.PasswordResetToken.used == False
        ).update({"used": True})
        db.commit()

        # Create new token — expires in 1 hour
        token = secrets.token_urlsafe(32)
        expires = datetime.now(timezone.utc) + timedelta(hours=1)
        db.add(models.PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires
        ))
        db.commit()

        reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
        try:
            from utils.email import send_password_reset
            send_password_reset(user.email, user.full_name, reset_url)
        except Exception as e:
            print(f"Reset email failed: {e}")

    # Always return same response — never reveal if email exists
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(payload: dict, db: Session = Depends(get_db)):
    """Reset password using token from email link."""
    token_str = payload.get("token", "")
    new_password = payload.get("new_password", "")

    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if len(new_password) > 128:
        raise HTTPException(status_code=400, detail="Password too long")

    token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == token_str,
        models.PasswordResetToken.used == False
    ).first()

    if not token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    # Check expiry
    now = datetime.now(timezone.utc)
    expires = token.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if now > expires:
        raise HTTPException(status_code=400, detail="Reset link has expired. Please request a new one.")

    # Update password and invalidate token
    token.user.hashed_password = auth_utils.hash_password(new_password)
    token.used = True
    db.commit()

    return {"message": "Password reset successfully. You can now log in."}


@router.get("/verify-reset-token/{token}")
def verify_reset_token(token: str, db: Session = Depends(get_db)):
    """Check if a reset token is valid before showing the form."""
    record = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == token,
        models.PasswordResetToken.used == False
    ).first()
    if not record:
        return {"valid": False, "reason": "Invalid or already used"}
    now = datetime.now(timezone.utc)
    expires = record.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if now > expires:
        return {"valid": False, "reason": "Expired"}
    return {"valid": True}