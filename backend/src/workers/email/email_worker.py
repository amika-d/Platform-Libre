# src/workers/email/email_worker.py
from arq import cron
from arq.connections import RedisSettings
from src.core.config import settings
from src.workers.email.email_tasks import (
    send_email_task,
    send_followup_touch_2,
    send_followup_touch_3,
)
import logging

logger = logging.getLogger(__name__)


class WorkerSettings:
    queue_name     = "arq:queue:email"
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URI)
    functions      = [send_email_task]
    cron_jobs      = [
        cron(send_followup_touch_2, hour=9, minute=0),
        cron(send_followup_touch_3, hour=9, minute=30),
    ]
    max_jobs    = 1
    job_timeout = 60
    keep_result = 3600

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
        logger.info("🟢 Email worker started — DB pool ready")

    @staticmethod
    async def on_shutdown(ctx: dict) -> None:
        pool = ctx.get("db_pool")
        if pool:
            await pool.close()
        logger.info("🔴 Email worker stopped")