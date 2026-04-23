from __future__ import annotations
import logging
import httpx
from src.core.config import settings
from src.db.linkedin import (
    insert_linkedin_prospect,
    mark_invite_failed,
    mark_dm_sent,
    mark_dm_failed,
    mark_invite_accepted,
)

logger = logging.getLogger(__name__)

UNIPILE_BASE    = settings.UNIPILE_DSN
UNIPILE_HEADERS = {
    "X-API-KEY":      settings.UNIPILE_API_KEY,
    "accept":         "application/json",
    "content-type":   "application/json",
}


def _slug_from_url(linkedin_url: str) -> str:
    """https://www.linkedin.com/in/pamali-rodrigo-42a181209// → pamali-rodrigo-42a181209"""
    return linkedin_url.rstrip("/").split("/")[-1]


async def _get_provider_id(slug: str) -> str:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{UNIPILE_BASE}/api/v1/users/{slug}",
            headers=UNIPILE_HEADERS,
            params={"account_id": settings.UNIPILE_ACCOUNT_ID},
        )
        resp.raise_for_status()
        return resp.json()["provider_id"]


async def _send_invite(provider_id: str) -> None:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{UNIPILE_BASE}/api/v1/users/invite",
            headers=UNIPILE_HEADERS,
            json={
                "account_id": settings.UNIPILE_ACCOUNT_ID,
                "provider_id": provider_id,
            },
        )
        resp.raise_for_status()


async def _send_message(provider_id: str, text: str) -> str:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{UNIPILE_BASE}/api/v1/chats",
            headers=UNIPILE_HEADERS,
            json={
                "account_id":    settings.UNIPILE_ACCOUNT_ID,
                "attendees_ids": [provider_id],
                "text":          text,
            },
        )
        resp.raise_for_status()
        return resp.json().get("id", "")


# ── task 1: enqueued by producer ──────────────────────────────────────────────

async def send_linkedin_invite_task(ctx: dict, payload: dict) -> dict:
    campaign_id   = payload["campaign_id"]
    linkedin_url  = payload["linkedin_url"]
    profile_name  = payload.get("profile_name", "")
    company       = payload.get("company", "")
    variant_used  = payload.get("variant_used", "A")
    message_text  = payload.get("message_text", "")
    row_id        = payload.get("row_id")          # already inserted by launch_campaign_node

    logger.info("🔗 send_linkedin_invite_task | campaign=%s url=%s", campaign_id, linkedin_url)

    slug = _slug_from_url(linkedin_url)

    try:
        provider_id = await _get_provider_id(slug)
        await _send_invite(provider_id=provider_id)
    except httpx.HTTPStatusError as exc:
        # 🚨 THIS extracts Unipile's actual error message!
        err_detail = exc.response.text
        err = f"{str(exc)} | Body: {err_detail}"
        logger.error("❌ invite failed | row=%s err=%s", row_id, err)
        await mark_invite_failed(linkedin_url=linkedin_url, error=err)
        return {"success": False, "row_id": row_id, "error": err_detail}
    except Exception as exc:
        err = str(exc)
        logger.error("❌ invite failed | row=%s err=%s", row_id, err)
        await mark_invite_failed(linkedin_url=linkedin_url, error=err)
        return {"success": False, "row_id": row_id, "error": err}

    logger.info("✅ invite sent | row=%s", row_id)
    return {"success": True, "row_id": row_id}


# ── task 2: called by webhook, NOT enqueued ───────────────────────────────────

async def send_linkedin_followup_dm(
    *,
    provider_id:  str,
    message_text: str,
    row_id:       int,
) -> dict:
    try:
        chat_id = await _send_message(provider_id=provider_id, text=message_text)
        await mark_dm_sent(row_id=row_id)
        logger.info("✅ DM sent | row=%s chat_id=%s", row_id, chat_id)
        return {"success": True, "row_id": row_id, "chat_id": chat_id}
    except Exception as exc:
        err = str(exc)
        logger.error("❌ DM failed | row=%s err=%s", row_id, err)
        await mark_dm_failed(row_id=row_id)
        return {"success": False, "error": err}
    
    


async def send_pending_dms_cron(ctx: dict) -> dict:
    from src.db.linkedin import get_accepted_no_dm

    rows = await get_accepted_no_dm()
    if not rows:
        logger.info("⏰ send_pending_dms_cron — nothing to send")
        return {"sent": 0, "failed": 0}

    sent, failed = 0, 0
    for row in rows:
        try:
            slug        = _slug_from_url(row["linkedin_url"])
            provider_id = await _get_provider_id(slug)
            result      = await send_linkedin_followup_dm(
                provider_id=provider_id,
                message_text=row["message_text"],
                row_id=row["id"],
            )
            if result["success"]:
                sent += 1
            else:
                failed += 1
        except Exception as exc:
            logger.error("❌ pending DM failed | row=%s err=%s", row["id"], exc)
            failed += 1

    logger.info("⏰ send_pending_dms_cron | sent=%s failed=%s", sent, failed)
    return {"sent": sent, "failed": failed}