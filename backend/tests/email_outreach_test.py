"""
tests/email_outreach_test.py
Smoke test — runs against your live Docker Postgres + Redis.
Sends one real email via Resend and checks the DB row updates.

Run:
    uv run tests/email_outreach_test.py
"""
import asyncio
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


async def main():
    # ── 1. Boot DB pool ───────────────────────────────────────────────────────
    from psycopg_pool import AsyncConnectionPool
    from src.core.config import settings
    from src.db.database import set_pool, init_db

    pool = AsyncConnectionPool(
        conninfo=settings.POSTGRES_URI,
        min_size=1,                        # ← must be <= max_size
        max_size=3,
        kwargs={"autocommit": True},
        open=False,                        # ← don't open in constructor
    )
    await pool.open()
    set_pool(pool)
    await init_db()
    logger.info("✅ DB pool ready")

    # ── 2. Call send_email_task directly (no Redis needed) ────────────────────
    from src.workers.email.email_tasks import send_email_task

    payload = {
        "campaign_id":   "test_camp_001",
        "email":         "neo.techagent47@gmail.com",   
        "prospect_name": "Sarah Connor",
        "company":       "Acme Corp",
        "variant_used":  "A",
        "touch": {
            "subject": "Quick question for {first_name} at {company}",
            "body": (
                "Hi {first_name},\n\n"
                "I noticed {company} is scaling fast — wanted to share something "
                "that helped similar teams cut their outreach time by 40%.\n\n"
                "Worth a 15 min chat?"
            ),
            "cta": "Book a slot here →",
        },
    }

    result = await send_email_task({}, payload)
    logger.info("send_email_task result: %s", result)

    # ── 3. Check DB row ───────────────────────────────────────────────────────
    from src.db.outreach import get_campaign_stats
    stats = await get_campaign_stats("test_camp_001")
    logger.info("Campaign stats: %s", stats)

    assert stats.get("sent", 0) >= 1, "Expected at least 1 sent row in DB!"
    logger.info("✅ PASS — row visible in Postgres. Open pgAdmin to confirm.")

    await pool.close()


if __name__ == "__main__":
    asyncio.run(main())