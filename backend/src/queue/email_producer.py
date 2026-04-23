"""
src/queue/email_producer.py
Called from campaign launch flow to enqueue email send tasks.

Usage:
    from src.queue.email_producer import enqueue_email_outreach

    await enqueue_email_outreach(
        campaign_id="camp_abc123",
        email="prospect@company.com",
        prospect_name="Sarah Connor",
        company="Acme Corp",
        variant_used="A",
        touch=variant["touch_1"],   # dict with subject / body / cta
    )
"""
from __future__ import annotations

import logging
from arq import create_pool
from arq.connections import RedisSettings

from src.core.config import settings

logger = logging.getLogger(__name__)


async def enqueue_email_outreach(
    *,
    campaign_id:   str,
    email:         str,
    prospect_name: str,
    company:       str,
    variant_used:  str,
    touch:         dict,       # {"subject": ..., "body": ..., "cta": ...}
) -> str:
    """Enqueue a single send_email_task job. Returns the ARQ job id."""
    redis = await create_pool(RedisSettings.from_dsn(settings.REDIS_URI))

    job = await redis.enqueue_job(
        "send_email_task",
        {
            "campaign_id":   campaign_id,
            "email":         email,
            "prospect_name": prospect_name,
            "company":       company,
            "variant_used":  variant_used,
            "touch":         touch,
        },
    )

    await redis.close()
    logger.info("📬 Enqueued send_email_task | job=%s to=%s", job.job_id, email)
    return job.job_id