"""
src/db/outreach.py
Single source of truth for reading/writing outreach_status rows.
Uses psycopg3 (psycopg_pool) cursor syntax — NOT asyncpg.
"""
import logging
from datetime import datetime, timezone
from typing import Any

from src.db.database import get_pool

logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── write operations ──────────────────────────────────────────────────────────

async def insert_prospect(
    *,
    campaign_id:           str,
    email:                 str,
    prospect_name:         str = "",
    company:               str = "",
    variant_used:          str = "A",
    touch_number:          int = 1,
    cycle_number_campaign: int = 1,
) -> int:
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO outreach_status
                    (campaign_id, prospect_name, email, company,
                     variant_used, touch_number, cycle_number_campaign, status, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'queued', %s)
                RETURNING id
                """,
                (campaign_id, prospect_name, email, company,
                 variant_used, touch_number, cycle_number_campaign, _now()),
            )
            row = await cur.fetchone()
            row_id = row[0]
    logger.info("📝 insert_prospect | id=%s cycle=%s", row_id, cycle_number_campaign)
    return row_id


async def mark_sent(*, row_id: int, resend_id: str) -> None:
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE outreach_status
                   SET status    = 'sent',
                       resend_id = %s,
                       sent_at   = %s
                 WHERE id = %s
                """,
                (resend_id, _now(), row_id),
            )
    logger.info("📤 mark_sent | id=%s resend_id=%s", row_id, resend_id)


async def mark_error(*, row_id: int, error_msg: str) -> None:
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE outreach_status
                   SET status    = 'error',
                       error_msg = %s
                 WHERE id = %s
                """,
                (error_msg, row_id),
            )
    logger.info("❌ mark_error | id=%s msg=%s", row_id, error_msg)


async def update_status(
    *,
    resend_id: str,
    status:    str,
    field:     str | None = None,
) -> None:
    """Webhook-driven update. field is a trusted internal string — safe to interpolate."""
    timestamp_clause = f", {field} = NOW()" if field else ""
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                f"""
                UPDATE outreach_status
                   SET status = %s {timestamp_clause}
                 WHERE resend_id = %s
                   AND status != %s
                """,
                (status, resend_id, status),
            )
    logger.info("🔄 update_status | resend_id=%s → %s", resend_id, status)


# ── scheduler queries ─────────────────────────────────────────────────────────

async def get_due_followups(*, touch_number: int, after_days: int) -> list[dict[str, Any]]:
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, campaign_id, prospect_name, email, company,
                       variant_used, touch_number
                  FROM outreach_status
                 WHERE touch_number = %s
                   AND status IN ('sent', 'opened')
                   AND sent_at < NOW() - (%s || ' days')::INTERVAL
                 ORDER BY sent_at
                """,
                (touch_number, str(after_days)),
            )
            cols = [d.name for d in cur.description]
            rows = await cur.fetchall()

    result = [dict(zip(cols, row)) for row in rows]
    logger.info("🔍 get_due_followups | touch=%s after=%s days → %s rows",
                touch_number, after_days, len(result))
    return result


# ── read operations ───────────────────────────────────────────────────────────

async def get_campaign_stats(campaign_id: str) -> dict[str, Any]:
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT status, COUNT(*) AS cnt
                  FROM outreach_status
                 WHERE campaign_id = %s
                 GROUP BY status
                """,
                (campaign_id,),
            )
            rows = await cur.fetchall()

    stats = {row[0]: row[1] for row in rows}
    logger.info("📊 get_campaign_stats | campaign=%s stats=%s", campaign_id, stats)
    return stats


async def update_reply(*, row_id: int, body: str | None = None, subject: str | None = None) -> None:
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE outreach_status
                   SET status       = 'replied',
                       replied_at   = NOW(),
                       reply_body   = %s,
                       reply_subject = %s
                 WHERE id = %s
                   AND status != 'replied'
                """,
                (body, subject, row_id),
            )
            if cur.rowcount == 0:
                logger.warning("⚠️ update_reply matched 0 rows | id=%s", row_id)
            else:
                logger.info("🔄 update_reply | id=%s → replied", row_id)

async def get_live_queue(*, campaign_id: str | None = None, limit: int = 100) -> dict[str, Any]:
    """Return queue rows plus aggregate status counters for live UI consumption."""
    where_clause = ""
    params: tuple[Any, ...]

    if campaign_id:
        where_clause = "WHERE campaign_id = %s"
        params = (campaign_id, max(1, min(limit, 200)))
    else:
        params = (max(1, min(limit, 200)),)

    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                f"""
                SELECT id,
                       campaign_id,
                       prospect_name,
                       email,
                       company,
                       channel,
                       status,
                       variant_used,
                       touch_number,
                       created_at,
                       sent_at,
                       opened_at,
                       replied_at,
                       error_msg
                  FROM outreach_status
                  {where_clause}
                 ORDER BY created_at DESC
                 LIMIT %s
                """,
                params,
            )
            cols = [d.name for d in cur.description]
            rows = [dict(zip(cols, row)) for row in await cur.fetchall()]

        async with conn.cursor() as cur:
            if campaign_id:
                await cur.execute(
                    """
                    SELECT status, COUNT(*) AS cnt
                      FROM outreach_status
                     WHERE campaign_id = %s
                     GROUP BY status
                    """,
                    (campaign_id,),
                )
            else:
                await cur.execute(
                    """
                    SELECT status, COUNT(*) AS cnt
                      FROM outreach_status
                     GROUP BY status
                    """
                )
            counts = {status: count for status, count in await cur.fetchall()}

    logger.info(
        "📦 get_live_queue | campaign=%s rows=%s",
        campaign_id or "all",
        len(rows),
    )
    return {
        "items": rows,
        "stats": {
            "queued": int(counts.get("queued", 0)),
            "sent": int(counts.get("sent", 0)),
            "opened": int(counts.get("opened", 0)),
            "replied": int(counts.get("replied", 0)),
            "bounced": int(counts.get("bounced", 0)),
            "error": int(counts.get("error", 0)),
            "total": int(sum(counts.values())),
        },
    }


async def get_variant_stats(campaign_id: str, cycle: int = 1) -> dict[str, dict]:
    """
    Returns per-variant open/reply rates computed from outreach_status.
    Used by process_feedback_node instead of user-typed metrics.

    Returns:
        {
            "A": {"sent": 10, "opened": 4, "replied": 2, "open_rate": 40.0, "reply_rate": 20.0},
            "B": {"sent": 10, "opened": 2, "replied": 1, "open_rate": 20.0, "reply_rate": 10.0},
        }
    """
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT
                    variant_used,
                    COUNT(*)                                          AS sent,
                    COUNT(*) FILTER (WHERE status = 'opened')        AS opened,
                    COUNT(*) FILTER (WHERE status = 'replied')       AS replied
                FROM outreach_status
                WHERE campaign_id = %s
                  AND touch_number = 1
                  AND cycle_number_campaign = %s
                GROUP BY variant_used
                """,
                (campaign_id, cycle),
            )
            rows = await cur.fetchall()

    stats = {}
    for row in rows:
        variant, sent, opened, replied = row
        if not variant:
            continue
        stats[variant] = {
            "sent":       sent,
            "opened":     opened,
            "replied":    replied,
            "open_rate":  round(opened  / sent * 100, 1) if sent else 0,
            "reply_rate": round(replied / sent * 100, 1) if sent else 0,
        }
    logger.info("📊 get_variant_stats | campaign=%s cycle=%s → %s", campaign_id, cycle, stats)
    return stats

async def get_replies(campaign_id: str) -> list[dict]:
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT prospect_name, email, company, replied_at
                  FROM outreach_status
                 WHERE campaign_id = %s
                   AND status = 'replied'
                 ORDER BY replied_at DESC
                """,
                (campaign_id,),
            )
            cols = [d.name for d in cur.description]
            rows = await cur.fetchall()
    return [dict(zip(cols, row)) for row in rows]


async def get_replied_prospects(campaign_id: str, cycle: int) -> list[dict[str, Any]]:
    async with get_pool().connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT prospect_name, email, company, variant_used
                  FROM outreach_status
                 WHERE campaign_id = %s
                   AND cycle_number_campaign = %s
                   AND status = 'replied'
                   AND touch_number = 1
                 ORDER BY replied_at DESC
                """,
                (campaign_id, cycle),
            )
            cols = [d.name for d in cur.description]
            rows = await cur.fetchall()
    result = [dict(zip(cols, row)) for row in rows]
    logger.info("📬 get_replied_prospects | campaign=%s cycle=%s → %s", campaign_id, cycle, len(result))
    return result
