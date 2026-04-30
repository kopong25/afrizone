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

    if order.status not in [models.OrderStatus.awaiting_payment]:
        if order.status in [models.OrderStatus.pending, models.OrderStatus.paid]:
            raise HTTPException(status_code=400, detail="This order has already been paid.")
        raise HTTPException(status_code=400, detail=f"Order cannot be checked out (status: {order.status})")

    # Return existing payment intent if already created (customer refreshed page etc.)
    if order.stripe_payment_intent_id:
        try:
            pi = stripe.PaymentIntent.retrieve(order.stripe_payment_intent_id)
            if pi.status not in ("canceled", "succeeded"):
                return {
                    "client_secret":     pi.client_secret,
                    "payment_intent_id": pi.id,
                    # FIX 1: always return amount_cents so checkout.js dev warning works
                    "amount_cents":      pi.amount,
                }
        except Exception as e:
            print(f"[Checkout] Failed to retrieve existing PaymentIntent: {e}")

    store = db.query(models.Store).filter(models.Store.id == order.store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found for this order")

    # ── AMAZON STANDARD: order.total is the single source of truth ────────
    # order.total = subtotal + shipping_cost, set once in orders.py at order
    # creation time using the rate the customer was shown in the cart.
    # We never recalculate shipping here. We charge exactly what was quoted.
    # ──────────────────────────────────────────────────────────────────────
    order_total        = order.total or 0
    order_platform_fee = order.platform_fee or 0

    # FIX 2: if order.total is somehow 0 or None, fall back to subtotal + shipping_cost
    # (both are locked on the order row — no new Shippo call is made)
    if order_total <= 0:
        subtotal      = order.subtotal or sum(
            (i.unit_price or 0) * (i.quantity or 1) for i in (order.items or [])
        )
        shipping      = order.shipping_cost or 0
        order_total   = round(subtotal + shipping, 2)
        print(f"[Checkout] order.total was 0 — rebuilt from locked fields: subtotal=${subtotal} + shipping=${shipping} = ${order_total}")

    if order_total <= 0:
        raise HTTPException(status_code=400, detail="Order total is $0 — cannot process payment")

    if order_platform_fee <= 0:
        order_platform_fee = round(order_total * (PLATFORM_FEE_PERCENT / 100), 2)
        print(f"[Checkout] order.platform_fee was missing — recalculated: ${order_platform_fee:.2f}")

    print(
        f"[Checkout] order_id={order.id} "
        f"subtotal=${order.subtotal:.2f} "
        f"shipping=${order.shipping_cost:.2f} "
        f"total=${order_total:.2f} "          # should equal subtotal + shipping
        f"fee=${order_platform_fee:.2f} "
        f"store={store.id} stripe_acct={store.stripe_account_id} "
        f"onboarded={store.stripe_onboarding_complete}"
    )

    shipping_details = None
    if order.shipping_address and order.shipping_state:
        shipping_details = {
            "address": {
                "line1":       order.shipping_address or "",
                "city":        order.shipping_city    or "",
                "state":       order.shipping_state   or "",
                "postal_code": order.shipping_zip     or "",
                "country":     "US",
            },
            "name": order.shipping_name or "Customer",
        }

    # FIX 3: tax applies to subtotal only, not shipping cost.
    # Charging tax on shipping is incorrect — shipping is not taxable in most US states.
    AZ_TAX_RATE = 0.086
    print(f"[Checkout] shipping_state='{order.shipping_state}' shipping_city='{order.shipping_city}'")
    tax_amount = 0.0
    if order.shipping_state and order.shipping_state.upper() in ["AZ", "ARIZONA"]:
        taxable_amount = order.subtotal or 0          # tax on product price only
        tax_amount     = round(taxable_amount * AZ_TAX_RATE, 2)
        print(f"[Checkout] AZ tax: ${tax_amount:.2f} (on subtotal ${taxable_amount:.2f}, not on shipping)")

    taxed_total        = round(order_total + tax_amount, 2)
    amount_cents       = int(taxed_total * 100)
    platform_fee_cents = int(order_platform_fee * 100)

    print(f"[Checkout] Charging Stripe: ${taxed_total:.2f} ({amount_cents} cents)")

    kwargs = dict(
        amount=amount_cents,
        currency="usd",
        metadata={
            "order_id":        str(order.id),
            "buyer_id":        str(current_user.id),
            "store_id":        str(store.id),
            "subtotal":        str(order.subtotal or 0),
            "shipping_cost":   str(order.shipping_cost or 0),
            "tax_amount":      str(tax_amount),
        },
        automatic_payment_methods={"enabled": True},
    )

    if shipping_details:
        kwargs["shipping"] = shipping_details

    if store.stripe_account_id and store.stripe_onboarding_complete:
        kwargs["application_fee_amount"] = platform_fee_cents
        kwargs["transfer_data"]          = {"destination": store.stripe_account_id}
        print(f"[Checkout] Using Connect transfer → {store.stripe_account_id}")
    else:
        kwargs["metadata"]["payout_status"] = "held_pending_seller_connect"
        print(f"[Checkout] Seller not connected — holding full payment in Afrizone account")

    try:
        payment_intent = stripe.PaymentIntent.create(**kwargs)
    except stripe.error.StripeError as e:
        print(f"[Checkout] Stripe error: {e}")
        raise HTTPException(status_code=502, detail=f"Stripe error: {e.user_message or str(e)}")

    order.stripe_payment_intent_id = payment_intent.id
    db.commit()

    print(f"[Checkout] PaymentIntent created: {payment_intent.id} amount={amount_cents}¢")
    return {
        "client_secret":     payment_intent.client_secret,
        "payment_intent_id": payment_intent.id,
        # FIX 1: returned so checkout.js dev warning can verify amount matches order.total
        "amount_cents":      amount_cents,
    }


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

            if order and order.status == models.OrderStatus.awaiting_payment:
                order.status           = models.OrderStatus.pending
                order.stripe_charge_id = pi.get("latest_charge")

                try:
                    tax_cents = pi.get("amount_details", {}).get("tip", {}).get("amount", 0) or 0
                except Exception:
                    tax_cents = 0
                if tax_cents:
                    order.tax_amount = round(tax_cents / 100, 2)
                    print(f"[Webhook] Tax collected: ${order.tax_amount:.2f} for order #{order.id}")

                store = db.query(models.Store).filter(models.Store.id == order.store_id).first()

                payout = models.Payout(
                    store_id=order.store_id, order_id=order.id,
                    amount=order.seller_amount, currency="USD",
                    status=models.PayoutStatus.pending,
                )
                db.add(payout)
                db.commit()

                try:
                    from utils.email import send_order_confirmation, send_new_order_to_seller
                    email_items = [
                        {"name": i.product.name, "quantity": i.quantity, "price": i.unit_price}
                        for i in order.items
                    ]
                    buyer = db.query(models.User).filter(models.User.id == order.buyer_id).first()
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
                    try:
                        from routers.push_notifications import send_push_to_user
                        if store and store.owner_id:
                            send_push_to_user(
                                user_id=store.owner_id,
                                title=f"🛒 New Order #{order.id}",
                                body=f"{buyer.full_name if buyer else 'Customer'} ordered ${order.total:.2f} — tap to view",
                                url="/seller/orders",
                                db=db
                            )
                    except Exception as pe:
                        print(f"Push error: {pe}")
                except Exception as e:
                    print(f"Email error: {e}")

            elif order and order.status == models.OrderStatus.pending:
                print(f"[Webhook] payment_intent.succeeded for already-paid order #{order_id} — skipping")

        elif etype == "payment_intent.payment_failed":
            pi = event["data"]["object"]
            order_id = int(pi["metadata"].get("order_id", 0))
            order = db.query(models.Order).filter(models.Order.id == order_id).first()
            if order and order.status == models.OrderStatus.awaiting_payment:
                order.status = models.OrderStatus.payment_failed
                db.commit()
                print(f"[Webhook] Payment failed for order #{order_id}")

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