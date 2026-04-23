# src/workers/email/producer.py
"""
Single place to push email jobs to Redis.
Import this in launch_campaign_node.
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
            default_queue_name="arq:queue:email"
        )
    return _pool


async def push_email_job(payload: dict) -> str:
    pool = await get_redis_pool()
    job  = await pool.enqueue_job("send_email_task", payload)
    logger.info("📨 queued email job | id=%s to=%s", job.job_id, payload.get("email"))
    print(f"[producer] job queued: {job.job_id}") 

    return job.job_id