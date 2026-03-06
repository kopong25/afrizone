from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models, schemas, auth as auth_utils
import stripe
import os

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

router = APIRouter()


# ─── STRIPE CONNECT: Seller Onboarding ───

@router.post("/seller/connect")
def create_stripe_account(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    """Start Stripe Express onboarding for a seller."""
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    # Create Stripe Express account if not already done
    if not store.stripe_account_id:
        account = stripe.Account.create(
            type="express",
            country="US",
            email=current_user.email,
            capabilities={"card_payments": {"requested": True}, "transfers": {"requested": True}},
        )
        store.stripe_account_id = account.id
        db.commit()

    # Generate onboarding link
    account_link = stripe.AccountLink.create(
        account=store.stripe_account_id,
        refresh_url=f"{FRONTEND_URL}/seller/dashboard?stripe=refresh",
        return_url=f"{FRONTEND_URL}/seller/dashboard?stripe=success",
        type="account_onboarding",
    )
    return {"onboarding_url": account_link.url}


@router.get("/seller/connect/status")
def check_stripe_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    """Check if seller has completed Stripe Connect onboarding."""
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store or not store.stripe_account_id:
        return {"connected": False}

    account = stripe.Account.retrieve(store.stripe_account_id)
    is_complete = account.details_submitted and account.charges_enabled

    if is_complete and not store.stripe_onboarding_complete:
        store.stripe_onboarding_complete = True
        db.commit()

    return {
        "connected": is_complete,
        "charges_enabled": account.charges_enabled,
        "payouts_enabled": account.payouts_enabled,
    }


# ─── CHECKOUT: Create Payment Intent ───

@router.post("/checkout", response_model=schemas.CheckoutResponse)
def create_checkout(
    checkout: schemas.CheckoutSession,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """Create a Stripe PaymentIntent for an order."""
    order = db.query(models.Order).filter(
        models.Order.id == checkout.order_id,
        models.Order.buyer_id == current_user.id,
        models.Order.status == models.OrderStatus.pending
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found or already paid")

    store = db.query(models.Store).filter(models.Store.id == order.store_id).first()
    if not store.stripe_account_id or not store.stripe_onboarding_complete:
        raise HTTPException(status_code=400, detail="Store payment account not set up")

    # Amount in cents
    amount_cents = int(order.total * 100)
    platform_fee_cents = int(order.platform_fee * 100)

    payment_intent = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency=order.currency.lower(),
        application_fee_amount=platform_fee_cents,  # Afrizone keeps this
        transfer_data={"destination": store.stripe_account_id},
        metadata={
            "order_id": order.id,
            "buyer_id": current_user.id,
            "store_id": store.id,
        },
    )

    order.stripe_payment_intent_id = payment_intent.id
    db.commit()

    return {
        "client_secret": payment_intent.client_secret,
        "payment_intent_id": payment_intent.id,
    }


# ─── STRIPE WEBHOOK: Handle payment events ───

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None)
):
    """Stripe sends events here when payments succeed/fail."""
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    db = next(get_db())
    try:
        if event["type"] == "payment_intent.succeeded":
            pi = event["data"]["object"]
            order_id = int(pi["metadata"].get("order_id", 0))
            order = db.query(models.Order).filter(models.Order.id == order_id).first()
            if order:
                order.status = models.OrderStatus.paid
                order.stripe_charge_id = pi.get("latest_charge")
                # Create payout record for seller
                payout = models.Payout(
                    store_id=order.store_id,
                    order_id=order.id,
                    amount=order.seller_amount,
                    currency=order.currency,
                    status=models.PayoutStatus.pending,
                )
                db.add(payout)
                db.commit()

        elif event["type"] == "payment_intent.payment_failed":
            pi = event["data"]["object"]
            order_id = int(pi["metadata"].get("order_id", 0))
            order = db.query(models.Order).filter(models.Order.id == order_id).first()
            if order:
                order.status = models.OrderStatus.cancelled
                db.commit()
    finally:
        db.close()

    return {"received": True}


# ─── SELLER PAYOUTS ───

@router.get("/seller/payouts", response_model=List[schemas.PayoutOut])
def get_seller_payouts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    """Get payout history for the seller."""
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    return db.query(models.Payout).filter(
        models.Payout.store_id == store.id
    ).order_by(models.Payout.created_at.desc()).all()


# ─── SUBSCRIPTION ───

SUBSCRIPTION_PRICES = {
    "basic": "price_basic_id_from_stripe",       # Replace with your Stripe Price IDs
    "standard": "price_standard_id_from_stripe",
    "premium": "price_premium_id_from_stripe",
}

@router.post("/subscribe/{tier}")
def create_subscription(
    tier: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    """Create a Stripe subscription for the seller's chosen tier."""
    if tier not in SUBSCRIPTION_PRICES:
        raise HTTPException(status_code=400, detail="Invalid tier. Choose: basic, standard, premium")

    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    # Create Stripe Checkout Session for subscription
    session = stripe.checkout.Session.create(
        customer_email=current_user.email,
        payment_method_types=["card"],
        line_items=[{"price": SUBSCRIPTION_PRICES[tier], "quantity": 1}],
        mode="subscription",
        success_url=f"{FRONTEND_URL}/seller/dashboard?subscription=success&tier={tier}",
        cancel_url=f"{FRONTEND_URL}/seller/dashboard?subscription=cancelled",
        metadata={"store_id": store.id, "tier": tier},
    )
    return {"checkout_url": session.url}
