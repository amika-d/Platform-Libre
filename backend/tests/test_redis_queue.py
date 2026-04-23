# tests/test_redis_queue.py
import asyncio
import logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

async def main():
    from arq import create_pool
    from arq.connections import RedisSettings
    from src.core.config import settings

    redis = await create_pool(RedisSettings.from_dsn(settings.REDIS_URI))

    job = await redis.enqueue_job("send_email_task", {
        "campaign_id":   "test-redis-001",
        "email":         "neo.techagent47@gmail.com",
        "prospect_name": "Neo",
        "company":       "Bitz and Beyond",
        "variant_used":  "A",
        "touch": {
            "subject": "Redis queue test — {first_name} at {company}",
            "body":    "Hi {first_name}, this came through the Redis queue. It works!",
            "cta":     "Reply to confirm →",
        },
    })

    print(f"✅ Job queued: {job.job_id}")
    await redis.close()

asyncio.run(main())