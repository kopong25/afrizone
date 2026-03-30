"""
Web Push Notification router for Afrizone.
Sellers subscribe to push notifications and receive alerts when orders arrive.
"""

import os, json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
import models, auth as auth_utils

router = APIRouter()

VAPID_PUBLIC_KEY  = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_CLAIMS      = {"sub": "mailto:support@afrizoneshop.com"}


# ── Save push subscription ─────────────────────────────────────

@router.post("/subscribe")
def subscribe(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    """Save browser push subscription for a user."""
    subscription = payload.get("subscription")
    if not subscription:
        raise HTTPException(status_code=400, detail="subscription required")

    sub_json = json.dumps(subscription)

    # Upsert: one subscription per user
    try:
        db.execute(text("""
            INSERT INTO push_subscriptions (user_id, subscription, updated_at)
            VALUES (:uid, :sub, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET subscription = :sub, updated_at = NOW()
        """), {"uid": current_user.id, "sub": sub_json})
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"subscribed": True}


@router.delete("/unsubscribe")
def unsubscribe(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    db.execute(text("DELETE FROM push_subscriptions WHERE user_id = :uid"), {"uid": current_user.id})
    db.commit()
    return {"unsubscribed": True}


@router.get("/vapid-public-key")
def get_vapid_public_key():
    """Return VAPID public key for browser subscription."""
    return {"public_key": VAPID_PUBLIC_KEY}


# ── Send notification to a user ───────────────────────────────

def send_push_to_user(user_id: int, title: str, body: str, url: str, db: Session):
    """Send a push notification to a specific user. Called internally."""
    if not VAPID_PUBLIC_KEY or not VAPID_PRIVATE_KEY:
        print("[Push] VAPID keys not configured — skipping push notification")
        return False

    row = db.execute(
        text("SELECT subscription FROM push_subscriptions WHERE user_id = :uid"),
        {"uid": user_id}
    ).fetchone()

    if not row:
        return False

    try:
        from pywebpush import webpush, WebPushException
        subscription_info = json.loads(row[0])

        webpush(
            subscription_info=subscription_info,
            data=json.dumps({
                "title": title,
                "body":  body,
                "url":   url,
                "icon":  "/icons/icon-192x192.png",
                "badge": "/icons/icon-72x72.png",
            }),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS,
        )
        return True
    except Exception as e:
        print(f"[Push] Failed to send to user {user_id}: {e}")
        # Remove invalid subscription
        if "410" in str(e) or "404" in str(e):
            db.execute(text("DELETE FROM push_subscriptions WHERE user_id = :uid"), {"uid": user_id})
            db.commit()
        return False
