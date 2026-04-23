"""
src/db/linkedin.py
CRUD for linkedin_outreach table.
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from typing import Any

from src.db.database import get_pool

logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── write ─────────────────────────────────────────────────────────────────────

async def insert_linkedin_prospect(
    *,
    campaign_id:   str,
    linkedin_url:  str,
    profile_name:  str = "",
    company:       str = "",
    variant_used:  str = "A",
    outreach_id:   int | None = None,
    message_text:  str = "",
) -> int:
    # normalise — ensure www. prefix
    linkedin_url = linkedin_url.replace(
        "https://linkedin.com/", "https://www.linkedin.com/"
    )
    
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO linkedin_outreach
                    (campaign_id, linkedin_url, profile_name, company,
                     variant_used, outreach_id, message_text,
                     invite_status, invite_sent_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending', %s)
                ON CONFLICT (linkedin_url) DO NOTHING
                RETURNING id
                """,
                (campaign_id, linkedin_url, profile_name, company,
                 variant_used, outreach_id, message_text, _now()),
            )
            row = await cur.fetchone()
            if row is None:
                # conflict — fetch existing id
                await cur.execute(
                    "SELECT id FROM linkedin_outreach WHERE linkedin_url = %s",
                    (linkedin_url,),
                )
                row = await cur.fetchone()
            row_id = row[0]

    logger.info("📝 insert_linkedin_prospect | id=%s url=%s", row_id, linkedin_url)
    return row_id


async def mark_invite_failed(*, linkedin_url: str, error: str) -> None:
    # normalise — ensure www. prefix
    linkedin_url = linkedin_url.replace(
        "https://linkedin.com/", "https://www.linkedin.com/"
    )
    
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE linkedin_outreach
                   SET invite_status = 'failed'
                 WHERE linkedin_url = %s
                """,
                (linkedin_url,),
            )
    logger.info("❌ mark_invite_failed | url=%s err=%s", linkedin_url, error)


async def mark_invite_accepted(*, linkedin_url: str) -> int | None:
    """Returns the row id so we can queue the DM immediately."""
    
    # normalise — ensure www. prefix
    linkedin_url = linkedin_url.replace(
        "https://linkedin.com/", "https://www.linkedin.com/"
    )
    
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE linkedin_outreach
                   SET invite_status = 'accepted',
                       accepted_at   = %s
                 WHERE linkedin_url  = %s
                   AND invite_status = 'pending'
                RETURNING id, message_text, profile_name
                """,
                (_now(), linkedin_url),
            )
            row = await cur.fetchone()

    if row:
        logger.info("✅ mark_invite_accepted | id=%s url=%s", row[0], linkedin_url)
        return {"id": row[0], "message_text": row[1], "profile_name": row[2]}
    return None


async def mark_dm_sent(*, row_id: int) -> None:
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE linkedin_outreach
                   SET message_status  = 'sent',
                       message_sent_at = %s
                 WHERE id = %s
                """,
                (_now(), row_id),
            )
    logger.info("📤 mark_dm_sent | id=%s", row_id)


async def mark_dm_failed(*, row_id: int) -> None:
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE linkedin_outreach
                   SET message_status = 'failed'
                 WHERE id = %s
                """,
                (row_id,),
            )
    logger.info("❌ mark_dm_failed | id=%s", row_id)


async def mark_replied(*, linkedin_url: str, reply_body: str) -> None:
    # normalise — ensure www. prefix
    linkedin_url = linkedin_url.replace(
        "https://linkedin.com/", "https://www.linkedin.com/"
    )
    
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE linkedin_outreach
                   SET reply_body  = %s,
                       replied_at  = %s
                 WHERE linkedin_url = %s
                   AND replied_at IS NULL
                """,
                (reply_body, _now(), linkedin_url),
            )
    logger.info("💬 mark_replied | url=%s", linkedin_url)


# ── read ──────────────────────────────────────────────────────────────────────

async def get_pending_invites(campaign_id: str | None = None) -> list[dict[str, Any]]:
    """All pending invites — used by connection poller to check acceptance."""
    query = """
        SELECT id, linkedin_url, profile_name, company, campaign_id, message_text
          FROM linkedin_outreach
         WHERE invite_status = 'pending'
    """
    params: list = []
    if campaign_id:
        query += " AND campaign_id = %s"
        params.append(campaign_id)

    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(query, params)
            cols = [d.name for d in cur.description]
            rows = await cur.fetchall()

    return [dict(zip(cols, row)) for row in rows]


async def get_accepted_no_dm() -> list[dict[str, Any]]:
    """Accepted invites where DM not yet sent."""
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, linkedin_url, profile_name, company,
                       campaign_id, message_text
                  FROM linkedin_outreach
                 WHERE invite_status  = 'accepted'
                   AND message_status = 'not_sent'
                """
            )
            cols = [d.name for d in cur.description]
            rows = await cur.fetchall()

    return [dict(zip(cols, row)) for row in rows]


async def get_dm_sent_urls() -> list[str]:
    """All linkedin_urls where DM was sent — used by reply poller."""
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT linkedin_url
                  FROM linkedin_outreach
                 WHERE message_status = 'sent'
                   AND replied_at IS NULL
                """
            )
            rows = await cur.fetchall()

    return [r[0] for r in rows]


async def get_campaign_linkedin_stats(campaign_id: str) -> dict[str, Any]:
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT
                    COUNT(*)                                              AS total,
                    COUNT(*) FILTER (WHERE invite_status = 'accepted')   AS accepted,
                    COUNT(*) FILTER (WHERE invite_status = 'failed')     AS failed,
                    COUNT(*) FILTER (WHERE message_status = 'sent')      AS dm_sent,
                    COUNT(*) FILTER (WHERE replied_at IS NOT NULL)       AS replied
                  FROM linkedin_outreach
                 WHERE campaign_id = %s
                """,
                (campaign_id,),
            )
            row = await cur.fetchone()

    keys = ["total", "accepted", "failed", "dm_sent", "replied"]
    return dict(zip(keys, row))