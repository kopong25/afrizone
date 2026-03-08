from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, auth as auth_utils
import stripe, os

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
router = APIRouter()

PLANS = {
    "basic":    {"name": "Basic",    "price": 0,   "commission": 10, "products": 10,  "features": ["10 products", "10% commission", "Basic support"]},
    "standard": {"name": "Standard", "price": 29,  "commission": 7,  "products": 100, "features": ["100 products", "7% commission", "Email support", "Analytics", "Discount codes"]},
    "premium":  {"name": "Premium",  "price": 79,  "commission": 4,  "products": -1,  "features": ["Unlimited products", "4% commission", "Priority support", "Advanced analytics", "Featured listing", "Auto shipping labels"]},
}

STRIPE_PRICE_IDS = {
    "standard": os.getenv("STRIPE_STANDARD_PRICE_ID", ""),
    "premium":  os.getenv("STRIPE_PREMIUM_PRICE_ID", ""),
}

@router.get("/plans")
def get_plans():
    return PLANS

@router.get("/my-plan")
def get_my_plan(db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.require_seller)):
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    sub = db.query(models.Subscription).filter(models.Subscription.store_id == store.id).first()
    tier = sub.tier if sub else "basic"
    return {"tier": tier, "plan": PLANS.get(tier, PLANS["basic"]), "subscription": sub}

@router.post("/upgrade/{tier}")
def upgrade_plan(
    tier: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    if tier not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    if tier == "basic":
        sub = db.query(models.Subscription).filter(models.Subscription.store_id == store.id).first()
        if sub:
            sub.tier = "basic"
            sub.status = "cancelled"
        store.tier = models.SellerTier.basic
        db.commit()
        return {"message": "Downgraded to Basic"}

    price_id = STRIPE_PRICE_IDS.get(tier)
    if not price_id or not stripe.api_key:
        # Mock upgrade for testing
        sub = db.query(models.Subscription).filter(models.Subscription.store_id == store.id).first()
        if not sub:
            sub = models.Subscription(store_id=store.id)
            db.add(sub)
        sub.tier = tier
        sub.status = "active"
        store.tier = getattr(models.SellerTier, tier, models.SellerTier.basic)
        db.commit()
        return {"message": f"Upgraded to {tier.title()} (test mode)", "tier": tier}

    try:
        customer = stripe.Customer.create(email=current_user.email, name=current_user.full_name)
        session = stripe.checkout.Session.create(
            customer=customer.id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/seller/dashboard?upgraded=1",
            cancel_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/seller/subscription",
        )
        return {"checkout_url": session.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))