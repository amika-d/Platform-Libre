from __future__ import annotations

import logging
from typing import Any, Callable

import httpx
from src.core.config import settings
from src.db.outreach import (
    get_due_followups,
    insert_prospect,
    mark_error,
    mark_sent,
)
from src.workers.email.personaliser import personalise_touch

logger = logging.getLogger(__name__)

RESEND_SEND_URL = "https://api.resend.com/emails"


async def _send_via_resend(
    *,
    to: str,
    subject: str,
    body: str,
    resend_row_id: int | None = None,
) -> str:
    """
    POSTs to Resend /emails. Returns the Resend message id.

    reply_to is set to your EMAIL_FROM so replies land in your inbox AND
    Resend can detect them if you also enable inbound routing on that domain.
    Without inbound routing, open tracking works but reply tracking won't fire.
    """
    payload: dict[str, Any] = {
        "from": settings.EMAIL_FROM,
        "to": [to],
        "subject": subject,
        "html": body.replace("\n", "<br>"),
        "reply_to": f"track+{resend_row_id}@bitzandbeyond.com",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            RESEND_SEND_URL,
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["id"]


# ── helper: process follow-ups (DRY abstraction) ──────────────────────────────

async def _process_followup_batch(
    touch_number: int,
    after_days: int,
    subject: str,
    body_generator: Callable[[dict[str, Any]], str],
) -> dict[str, int]:
    """
    Generic helper to process and send follow-up touches to avoid duplicating
    the DB insertion and error handling logic across multiple tasks.
    """
    logger.info(f"⏰ send_followup_touch_{touch_number} — checking...")
    due_rows = await get_due_followups(touch_number=touch_number - 1, after_days=after_days)
    sent_count = 0

    for row in due_rows:
        new_row_id = None
        email = row["email"]
        
        try:
            body = body_generator(row)
            
            # 1. Insert the new row for this touch
            new_row_id = await insert_prospect(
                campaign_id=row["campaign_id"],
                email=email,
                prospect_name=row.get("prospect_name", ""),
                company=row.get("company", ""),
                variant_used=row.get("variant_used", "A"),
                touch_number=touch_number,
            )
            
            # 2. Attempt to send
            resend_id = await _send_via_resend(
                to=email,
                subject=subject,
                body=body,
                resend_row_id=new_row_id,
            )
            
            # 3. Mark as successful
            await mark_sent(row_id=new_row_id, resend_id=resend_id)
            sent_count += 1
            logger.info(f"📤 touch_{touch_number} sent | email={email}")

        except Exception as exc:
            err_msg = str(exc)
            logger.error(f"❌ touch_{touch_number} failed | email={email} err={err_msg}")
            # Ensure we mark the newly inserted row as errored if the send failed
            if new_row_id is not None:
                await mark_error(row_id=new_row_id, error_msg=err_msg)

    logger.info(f"✅ touch_{touch_number} complete | sent={sent_count}")
    return {"sent": sent_count}


# ── task 1: send touch_1 ──────────────────────────────────────────────────────

async def send_email_task(ctx: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    campaign_id   = payload.get("campaign_id", "")
    email         = payload.get("email", "")
    prospect_name = payload.get("prospect_name", "")
    company       = payload.get("company", "")
    variant_used  = payload.get("variant_used", "A")
    raw_touch     = payload.get("touch", {})
    row_id        = payload.get("row_id")

    if not campaign_id or not email:
        logger.error("❌ send_email_task invalid payload | campaign_id=%s email=%s payload=%s", campaign_id, email, payload)
        return {"success": False, "error": "invalid payload: campaign_id/email required"}

    logger.info("📧 send_email_task | campaign=%s to=%s", campaign_id, email)

    touch = personalise_touch(raw_touch, name=prospect_name, company=company)

    try:
        resend_id = await _send_via_resend(
            to=email,
            subject=touch["subject"],
            body=touch["body"],
            resend_row_id=row_id,
        )
    except Exception as exc:
        err = str(exc)
        logger.error("❌ Resend failed | row=%s err=%s", row_id, err)
        await mark_error(row_id=row_id, error_msg=err)
        return {"success": False, "row_id": row_id, "error": err}

    await mark_sent(row_id=row_id, resend_id=resend_id)
    logger.info("✅ Sent | row=%s resend_id=%s", row_id, resend_id)
    return {"success": True, "row_id": row_id, "resend_id": resend_id}


# ── task 2: touch_2 after 3 days ──────────────────────────────────────────────

async def send_followup_touch_2(ctx: dict[str, Any]) -> dict[str, int]:
    def _generate_body(row: dict[str, Any]) -> str:
        name = row.get("prospect_name") or "there"
        return (
            f"Hi {name},\n\n"
            f"Just following up — did my last email land at a bad time?\n\n"
            f"Happy to keep it to 15 mins if that's easier."
        )

    return await _process_followup_batch(
        touch_number=2,
        after_days=3,
        subject="Re: Following up",
        body_generator=_generate_body,
    )


# ── task 3: touch_3 after 6 days ──────────────────────────────────────────────

async def send_followup_touch_3(ctx: dict[str, Any]) -> dict[str, int]:
    def _generate_body(row: dict[str, Any]) -> str:
        name = row.get("prospect_name") or "there"
        return (
            f"Hi {name},\n\n"
            f"I'll leave this as my last note — if timing ever works out, "
            f"my calendar's always open.\n\nWishing you the best either way."
        )

    return await _process_followup_batch(
        touch_number=3,
        after_days=6,
        subject="Leaving this here",
        body_generator=_generate_body,
    )