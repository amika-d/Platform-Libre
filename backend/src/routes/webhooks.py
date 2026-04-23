# src/api/webhooks.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime
import logging
from src.db.outreach import update_reply, update_status
from src.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


class OutreachStatus(BaseModel):
    campaign_id: str
    target_url:  str
    status:      str
    error_msg:   str | None = None


@router.post("/campaign-status")
async def campaign_status_update(payload: OutreachStatus):
    print(
        f"🔔 [Webhook] {payload.campaign_id} | "
        f"{payload.target_url} → {payload.status.upper()}"
    )
    if payload.error_msg:
        print(f"   Error: {payload.error_msg}")
    # TODO: write to Postgres outreach_status table
    return {"success": True}

#---------------- Resend email events ----------------#

_EVENT_MAP: dict[str, tuple[str, str | None]] = {
    "email.sent":       ("sent",    None),
    "email.delivered":  ("sent",    None),          # treat delivered same as sent
    "email.opened":     ("opened",  "opened_at"),
    "email.replied":    ("replied", "replied_at"),
    "email.bounced":    ("bounced", None),
    "email.complained": ("bounced", None),
}
 
@router.post("/resend-events")
async def resend_webhook(request: Request):
    """
    Resend sends a JSON body shaped like:
    {
      "type": "email.opened",
      "data": {
        "email_id": "re_xxxxxxxxxx",
        ...
      }
    }
    """
  
    
    from src.core.config import settings
    import svix
    svix_id        = request.headers.get("svix-id", "")
    svix_timestamp = request.headers.get("svix-timestamp", "")
    svix_signature = request.headers.get("svix-signature", "")
    raw_body = await request.body()
    wh = svix.Webhook(settings.RESEND_WEBHOOK_SECRET)
    try:
        wh.verify(raw_body, {
            "svix-id":        svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

 
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
 
    event_type = body.get("type", "")
    data       = body.get("data", {})
    resend_id  = data.get("email_id") or data.get("id", "")
 
    logger.info("📩 Resend webhook | event=%s resend_id=%s", event_type, resend_id)
 
    if not resend_id:
        logger.warning("Resend webhook missing email_id — skipping")
        return {"success": True, "skipped": True}
 
    mapping = _EVENT_MAP.get(event_type)
    if not mapping:
        logger.info("Unhandled Resend event type: %s — ignoring", event_type)
        return {"success": True, "skipped": True}
 
    status, timestamp_field = mapping
 
    try:
        await update_status(
            resend_id=resend_id,
            status=status,
            field=timestamp_field,
        )
        logger.info("✅ DB updated | resend_id=%s status=%s", resend_id, status)
    except Exception as exc:
        logger.error("❌ DB update failed | resend_id=%s err=%s", resend_id, exc)
        # Return 200 anyway — Resend retries on non-2xx, causing duplicate events
        return {"success": False, "error": str(exc)}
 
    return {"success": True, "event": event_type, "resend_id": resend_id}

#---------------- Cloudflare Email Worker (reply tracking) ----------------#

class EmailReply(BaseModel):
    tracking_id: str | None = None
    from_email:  str
    to_email:    str
    received_at: str | None = None
    body:       str | None = None
    subject:    str | None = None

@router.post("/email-reply")
async def email_reply_webhook(payload: EmailReply):
    logger.info(
        "📨 Reply received | tracking_id=%s from=%s",
        payload.tracking_id, payload.from_email
    )
    if not payload.tracking_id:
        logger.warning("No tracking_id found in reply — skipping")
        return {"success": True, "skipped": True}

    try:
        row_id = int(payload.tracking_id)  # tracking_id is the row id
    except ValueError:
        logger.warning("Invalid tracking_id (not an int): %s", payload.tracking_id)
        return {"success": False, "error": "invalid tracking_id"}

    try:
        await update_reply(row_id=row_id, body=payload.body, subject=payload.subject)
        logger.info("✅ DB updated with reply | row_id=%s", row_id)
    except Exception as exc:
        logger.error("❌ DB update failed | id=%s err=%s", row_id, exc)
        return {"success": False, "error": str(exc)}

    return {"success": True, "tracking_id": payload.tracking_id}


from src.workers.linkedin.linkedin_tasks import send_linkedin_followup_dm
from src.db.linkedin import mark_invite_accepted, mark_replied


class UnipileRelationEvent(BaseModel):
    event:                  str
    account_id:             str
    account_type:           str
    user_full_name:         str | None = None
    user_provider_id:       str
    user_public_identifier: str
    user_profile_url:       str | None = None


@router.post("/unipile-new-relation")
async def unipile_new_relation(payload: UnipileRelationEvent):
    logger.info("🤝 new relation | %s", payload.user_public_identifier)

    linkedin_url = f"https://www.linkedin.com/in/{payload.user_public_identifier}/"
    row = await mark_invite_accepted(linkedin_url=linkedin_url)

    if not row:
        logger.warning("no pending invite for %s — skipping", payload.user_public_identifier)
        return {"success": True, "skipped": True}

    await send_linkedin_followup_dm(
        provider_id=payload.user_provider_id,
        message_text=row["message_text"],
        row_id=row["id"],
    )
    return {"success": True}


class UnipileMessageEvent(BaseModel):
    event:      str
    account_id: str
    chat_id:    str | None = None
    message_id: str | None = None
    sender_id:  str | None = None
    text:       str | None = None
    attendee:   dict | None = None   # unipile puts sender profile here


@router.post("/unipile-new-message")
async def unipile_new_message(payload: UnipileMessageEvent):
    logger.info("💬 new message | chat=%s", payload.chat_id)

    # only care about inbound — sender_id won't match our account
    if not payload.sender_id or payload.sender_id == settings.UNIPILE_ACCOUNT_ID:
        return {"success": True, "skipped": True}

    # get public identifier from attendee if present
    public_id = (payload.attendee or {}).get("public_identifier", "")
    if not public_id:
        return {"success": True, "skipped": True}

    linkedin_url = f"https://www.linkedin.com/in/{public_id}/"
    await mark_replied(linkedin_url=linkedin_url, reply_body=payload.text or "")
    return {"success": True}