"""
src/db/database.py
Postgres connection pool + table bootstrap.
The pool is created in lifespan() and stored in app_state.
Workers use get_pool() which reads from the same app_state dict.
"""
import logging
from psycopg_pool import AsyncConnectionPool
from src.core.config import settings

logger = logging.getLogger(__name__)

# Shared pool reference — set by lifespan, read by workers/routes
_pool: AsyncConnectionPool | None = None


def set_pool(pool: AsyncConnectionPool) -> None:
    global _pool
    _pool = pool


def get_pool() -> AsyncConnectionPool:
    if _pool is None:
        raise RuntimeError("DB pool not initialised — call set_pool() in lifespan first.")
    return _pool


async def init_db() -> None:
    """Create all tables that don't exist yet. Safe to call on every startup."""
    async with get_pool().connection() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS outreach_status (
                id            SERIAL PRIMARY KEY,
                campaign_id   VARCHAR        NOT NULL,
                prospect_name VARCHAR,
                email         VARCHAR        NOT NULL,
                company       VARCHAR,
                channel       VARCHAR        DEFAULT 'email',
                status        VARCHAR        DEFAULT 'queued',
                variant_used  VARCHAR,
                touch_number  INTEGER        DEFAULT 1,
                resend_id     VARCHAR        UNIQUE,
                sent_at       TIMESTAMPTZ,
                opened_at     TIMESTAMPTZ,
                replied_at    TIMESTAMPTZ,
                error_msg     VARCHAR,
                created_at    TIMESTAMPTZ    DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_outreach_status_lookup
                ON outreach_status (status, touch_number, sent_at);

            CREATE INDEX IF NOT EXISTS idx_outreach_resend_id
                ON outreach_status (resend_id);

            CREATE TABLE IF NOT EXISTS linkedin_outreach (
                id              SERIAL PRIMARY KEY,
                campaign_id     VARCHAR NOT NULL,
                linkedin_url    VARCHAR NOT NULL UNIQUE,
                profile_name    VARCHAR,
                company         VARCHAR,
                variant_used    VARCHAR,
                outreach_id     INTEGER, -- optional reference to outreach_status
                message_text    TEXT,    -- the DM content to send after acceptance
                
                invite_status   VARCHAR DEFAULT 'pending', -- pending, accepted, failed
                invite_sent_at  TIMESTAMPTZ,
                accepted_at     TIMESTAMPTZ,
                
                message_status  VARCHAR DEFAULT 'not_sent', -- not_sent, sent, failed
                message_sent_at TIMESTAMPTZ,
                
                reply_body      TEXT,
                replied_at      TIMESTAMPTZ,
                
                created_at      TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_linkedin_status 
                ON linkedin_outreach (invite_status, message_status);
        """)
    logger.info("✅ database tables ready.")