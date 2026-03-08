from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, auth as auth_utils
import random, string

router = APIRouter()

def generate_code(user_id: int) -> str:
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"AZ{user_id}{suffix}"

@router.get("/my-code")
def get_my_referral_code(db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    ref = db.query(models.Referral).filter(
        models.Referral.referrer_id == current_user.id,
        models.Referral.referred_id == None
    ).first()
    if not ref:
        ref = models.Referral(referrer_id=current_user.id, code=generate_code(current_user.id))
        db.add(ref)
        db.commit()
        db.refresh(ref)
    referred = db.query(models.Referral).filter(
        models.Referral.referrer_id == current_user.id,
        models.Referral.referred_id != None
    ).count()
    return {"code": ref.code, "referrals_count": referred, "reward_per_referral": 10.0}

@router.post("/use/{code}")
def use_referral_code(code: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    ref = db.query(models.Referral).filter(
        models.Referral.code == code.upper(),
        models.Referral.referred_id == None,
        models.Referral.referrer_id != current_user.id,
    ).first()
    if not ref:
        raise HTTPException(status_code=404, detail="Invalid or already used referral code")
    new_ref = models.Referral(
        referrer_id=ref.referrer_id,
        referred_id=current_user.id,
        code=generate_code(current_user.id),
        status="completed",
        reward_amount=10.0,
    )
    db.add(new_ref)
    db.commit()
    return {"message": "Referral applied! The referrer will earn a $10 credit.", "referrer_id": ref.referrer_id}

@router.get("/stats")
def referral_stats(db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    refs = db.query(models.Referral).filter(
        models.Referral.referrer_id == current_user.id,
        models.Referral.referred_id != None,
    ).all()
    total_earned = sum(r.reward_amount for r in refs)
    return {"total_referrals": len(refs), "total_earned": total_earned, "referrals": [{"id": r.id, "status": r.status, "reward": r.reward_amount, "created_at": r.created_at} for r in refs]}