import asyncio
from arq import create_pool
from arq.connections import RedisSettings
from src.core.config import settings

async def main():
    pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URI))
    job = await pool.enqueue_job("send_linkedin_invite_task", {
        "campaign_id":  "test-001",
        "linkedin_url": "https://www.linkedin.com/in/FAKE-SLUG-DO-NOT-EXIST/",
        "profile_name": "Test User",
        "company":      "Test Co",
        "message_text": "Hey test",
        "row_id":       9999,
    })
    print(f"✅ Job enqueued: {job.job_id}")
    await pool.close()

asyncio.run(main())