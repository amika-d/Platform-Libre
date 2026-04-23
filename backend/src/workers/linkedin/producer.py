# src/workers/linkedin/producer.py
"""
"""
from __future__ import annotations
import logging
from arq import create_pool
from arq.connections import RedisSettings
from src.core.config import settings

logger = logging.getLogger(__name__)

_pool = None


async def get_redis_pool():
    global _pool
    if _pool is None:
        _pool = await create_pool(
            RedisSettings.from_dsn(settings.REDIS_URI),
            default_queue_name="arq:queue:linkedin"
        )
    return _pool


async def push_linkedin_job(payload: dict) -> str:
    pool  = await get_redis_pool()
    job   = await pool.enqueue_job("send_linkedin_invite_task", payload)
    logger.info("📨 queued linkedin job | id=%s url=%s", job.job_id, payload.get("linkedin_url"))
    return job.job_id