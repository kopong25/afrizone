from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from database import get_db
import models, auth as auth_utils
from datetime import datetime, timezone

router = APIRouter()

class MessageCreate(BaseModel):
    body: str
    store_id: int = None
    order_id: int = None

class ConversationStart(BaseModel):
    seller_id: int
    body: str
    store_id: int = None
    order_id: int = None

@router.get("/")
def get_my_conversations(db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    if current_user.role in [models.UserRole.seller, models.UserRole.admin]:
        store = db.query(models.Store).filter(models.Store.owner_id == current_user.id).first()
        if store:
            convs = db.query(models.Conversation).filter(models.Conversation.seller_id == current_user.id).order_by(models.Conversation.last_message_at.desc()).all()
        else:
            convs = []
    else:
        convs = db.query(models.Conversation).filter(models.Conversation.buyer_id == current_user.id).order_by(models.Conversation.last_message_at.desc()).all()

    result = []
    for c in convs:
        last_msg = c.messages[-1] if c.messages else None
        unread = sum(1 for m in c.messages if not m.is_read and m.sender_id != current_user.id)
        result.append({
            "id": c.id, "buyer": {"id": c.buyer.id, "name": c.buyer.full_name},
            "seller": {"id": c.seller.id, "name": c.seller.full_name},
            "store": {"id": c.store.id, "name": c.store.name} if c.store else None,
            "order_id": c.order_id,
            "last_message": last_msg.body[:60] if last_msg else "",
            "last_message_at": c.last_message_at,
            "unread_count": unread,
        })
    return result

@router.post("/start")
def start_conversation(data: ConversationStart, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    try:
        # Validate seller exists
        seller = db.query(models.User).filter(models.User.id == data.seller_id).first()
        if not seller:
            raise HTTPException(status_code=404, detail="Seller not found")

        # Prevent messaging yourself
        if current_user.id == data.seller_id:
            raise HTTPException(status_code=400, detail="You cannot message yourself")

        # Find or create conversation
        existing = db.query(models.Conversation).filter(
            models.Conversation.buyer_id == current_user.id,
            models.Conversation.seller_id == data.seller_id,
        ).first()

        if not existing:
            existing = models.Conversation(
                buyer_id=current_user.id,
                seller_id=data.seller_id,
                store_id=data.store_id if data.store_id else None,
                order_id=data.order_id if data.order_id else None,
            )
            db.add(existing)
            db.flush()

        msg = models.Message(
            conversation_id=existing.id,
            sender_id=current_user.id,
            body=data.body
        )
        db.add(msg)
        existing.last_message_at = datetime.now(timezone.utc)
        db.commit()
        return {"conversation_id": existing.id}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"[Messages Error] {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start conversation: {str(e)}")

@router.get("/{conversation_id}")
def get_messages(conversation_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    conv = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.buyer_id != current_user.id and conv.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    # Mark messages as read
    for m in conv.messages:
        if m.sender_id != current_user.id:
            m.is_read = True
    db.commit()
    return {
        "id": conv.id,
        "buyer": {"id": conv.buyer.id, "name": conv.buyer.full_name},
        "seller": {"id": conv.seller.id, "name": conv.seller.full_name},
        "store": {"id": conv.store.id, "name": conv.store.name} if conv.store else None,
        "order_id": conv.order_id,
        "messages": [{"id": m.id, "sender_id": m.sender_id, "sender_name": m.sender.full_name, "body": m.body, "is_read": m.is_read, "created_at": m.created_at} for m in conv.messages],
    }

@router.post("/{conversation_id}/send")
def send_message(conversation_id: int, data: MessageCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    conv = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Not found")
    if conv.buyer_id != current_user.id and conv.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    msg = models.Message(conversation_id=conversation_id, sender_id=current_user.id, body=data.body)
    db.add(msg)
    conv.last_message_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)
    return {"id": msg.id, "sender_id": msg.sender_id, "body": msg.body, "created_at": msg.created_at}

@router.get("/unread/count")
def unread_count(db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    convs = db.query(models.Conversation).filter(
        (models.Conversation.buyer_id == current_user.id) | (models.Conversation.seller_id == current_user.id)
    ).all()
    count = sum(
        sum(1 for m in c.messages if not m.is_read and m.sender_id != current_user.id)
        for c in convs
    )
    return {"count": count}