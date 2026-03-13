from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models, schemas, auth as auth_utils
import stripe, os

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
PLATFORM_FEE_PERCENT = float(os.getenv("PLATFORM_FEE_PERCENT", "8"))

router = APIRouter()


# ─── STRIPE CONNECT: Seller Onboarding ────────────────────────

@router.post("/seller/connect")
def create_stripe_account(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    if not store.stripe_account_id:
        account = stripe.Account.create(
            type="express",
            country="US",
            email=current_user.email,
            capabilities={"card_payments": {"requested": True}, "transfers": {"requested": True}},
        )
        store.stripe_account_id = account.id
        db.commit()

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
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store or not store.stripe_account_id:
        return {"connected": False, "charges_enabled": False, "payouts_enabled": False}
    try:
        account = stripe.Account.retrieve(store.stripe_account_id)
        is_complete = account.details_submitted and account.charges_enabled
        if is_complete and not store.stripe_onboarding_complete:
            store.stripe_onboarding_complete = True
            db.commit()
        return {"connected": is_complete, "charges_enabled": account.charges_enabled, "payouts_enabled": account.payouts_enabled}
    except Exception:
        return {"connected": False, "charges_enabled": False, "payouts_enabled": False}


# ─── CHECKOUT: Create Payment Intent ──────────────────────────

@router.post("/checkout")
def create_checkout(
    checkout: schemas.CheckoutSession,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    order = db.query(models.Order).filter(
        models.Order.id == checkout.order_id,
        models.Order.buyer_id == current_user.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in [models.OrderStatus.pending, models.OrderStatus.paid]:
        raise HTTPException(status_code=400, detail="Order already processed")

    # Return existing payment intent if already created
    if order.stripe_payment_intent_id:
        pi = stripe.PaymentIntent.retrieve(order.stripe_payment_intent_id)
        return {"client_secret": pi.client_secret, "payment_intent_id": pi.id}

    store = db.query(models.Store).filter(models.Store.id == order.store_id).first()
    amount_cents = int(order.total * 100)
    platform_fee_cents = int(order.platform_fee * 100)

    kwargs = dict(
        amount=amount_cents,
        currency="usd",
        metadata={"order_id": order.id, "buyer_id": current_user.id, "store_id": store.id},
        automatic_payment_methods={"enabled": True},
    )

    # Use Connect transfer only if seller has completed Stripe onboarding
    if store.stripe_account_id and store.stripe_onboarding_complete:
        kwargs["application_fee_amount"] = platform_fee_cents
        kwargs["transfer_data"] = {"destination": store.stripe_account_id}

    payment_intent = stripe.PaymentIntent.create(**kwargs)
    order.stripe_payment_intent_id = payment_intent.id
    db.commit()

    return {"client_secret": payment_intent.client_secret, "payment_intent_id": payment_intent.id}


# ─── WEBHOOK ──────────────────────────────────────────────────

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None)
):
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    db = next(get_db())
    try:
        etype = event["type"]

        if etype == "payment_intent.succeeded":
            pi = event["data"]["object"]
            order_id = int(pi["metadata"].get("order_id", 0))
            order = db.query(models.Order).filter(models.Order.id == order_id).first()
            if order and order.status == models.OrderStatus.pending:
                order.status = models.OrderStatus.paid
                order.stripe_charge_id = pi.get("latest_charge")
                store = db.query(models.Store).filter(models.Store.id == order.store_id).first()
                payout = models.Payout(
                    store_id=order.store_id, order_id=order.id,
                    amount=order.seller_amount, currency="USD",
                    status=models.PayoutStatus.pending,
                )
                db.add(payout)
                db.commit()
                # Email buyer confirmation + seller notification after payment confirmed
                try:
                    from utils.email import send_order_confirmation, send_new_order_to_seller
                    email_items = [{"name": i.product.name, "quantity": i.quantity, "price": i.unit_price} for i in order.items]
                    buyer = db.query(models.User).filter(models.User.id == order.buyer_id).first()
                    # Buyer confirmation
                    if buyer:
                        send_order_confirmation(
                            buyer_email=buyer.email,
                            buyer_name=buyer.full_name,
                            order_id=order.id,
                            items=email_items,
                            subtotal=order.subtotal,
                            shipping=order.shipping_cost,
                            total=order.total,
                            store_name=store.name if store else "Afrizone",
                        )
                    # Seller notification
                    seller_email = store.owner.email if store and store.owner else None
                    if seller_email:
                        send_new_order_to_seller(
                            seller_email=seller_email,
                            store_name=store.name,
                            order_id=order.id,
                            items=email_items,
                            total=order.total,
                            seller_amount=order.seller_amount,
                            buyer_name=buyer.full_name if buyer else "Customer",
                        )
                except Exception as e:
                    print(f"Email error: {e}")

        elif etype == "payment_intent.payment_failed":
            pi = event["data"]["object"]
            order_id = int(pi["metadata"].get("order_id", 0))
            order = db.query(models.Order).filter(models.Order.id == order_id).first()
            if order:
                order.status = models.OrderStatus.cancelled
                db.commit()

        elif etype == "account.updated":
            acct = event["data"]["object"]
            store = db.query(models.Store).filter(models.Store.stripe_account_id == acct["id"]).first()
            if store and acct.get("details_submitted") and acct.get("charges_enabled"):
                store.stripe_onboarding_complete = True
                db.commit()

        elif etype in ["customer.subscription.updated", "customer.subscription.deleted"]:
            sub = event["data"]["object"]
            store_id = int(sub["metadata"].get("store_id", 0))
            db_sub = db.query(models.Subscription).filter(models.Subscription.store_id == store_id).first()
            if db_sub:
                db_sub.status = "active" if sub["status"] == "active" else "cancelled"
                if etype == "customer.subscription.deleted":
                    db_sub.tier = "basic"
                    store = db.query(models.Store).filter(models.Store.id == store_id).first()
                    if store:
                        store.tier = models.SellerTier.basic
                db.commit()

    except Exception as e:
        print(f"Webhook error: {e}")
    finally:
        db.close()

    return {"received": True}


# ─── PAYOUTS ──────────────────────────────────────────────────

@router.get("/seller/payouts")
def get_seller_payouts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_seller)
):
    store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    payouts = db.query(models.Payout).filter(
        models.Payout.store_id == store.id
    ).order_by(models.Payout.created_at.desc()).all()
    return payouts