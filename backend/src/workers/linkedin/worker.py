# src/workers/linkedin/worker.py
from __future__ import annotations
import logging
from arq import cron
from arq.connections import RedisSettings
from src.core.config import settings
from src.workers.linkedin.linkedin_tasks import send_linkedin_invite_task, send_pending_dms_cron

logger = logging.getLogger(__name__)


class WorkerSettings:
    queue_name     = "arq:queue:linkedin"
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URI)
    functions      = [send_linkedin_invite_task]
    cron_jobs      = [
        cron(send_pending_dms_cron, second=0),   # every minute — change second={0,10,20,30,40,50} for every 10s
    ]
    max_jobs       = 3
    job_timeout    = 60
    keep_result    = 3600

    @staticmethod
    async def on_startup(ctx: dict) -> None:
        from psycopg_pool import AsyncConnectionPool
        from src.db.database import set_pool, init_db

        pool = AsyncConnectionPool(
            conninfo=settings.POSTGRES_URI,
            min_size=1,
            max_size=5,
            kwargs={"autocommit": True},
            open=False,
        )
        await pool.open()
        set_pool(pool)
        await init_db()
        ctx["db_pool"] = pool
        logger.info("🟢 LinkedIn worker started")

    @staticmethod
    async def on_shutdown(ctx: dict) -> None:
        pool = ctx.get("db_pool")
        if pool:
            await pool.close()
        logger.info("🔴 LinkedIn worker stopped")