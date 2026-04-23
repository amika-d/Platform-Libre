from arq import create_pool
from arq.connections import RedisSettings
from src.core.config import settings

async def push_linkedin_task(task_name: str, payload: dict):
    """Pushes a payload to Redis for the background worker."""
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URI)
    redis_pool = await create_pool(redis_settings)
    
    job = await redis_pool.enqueue_job(task_name, payload)
    print(f"[Queue] 📥 Enqueued task '{task_name}' | Job ID: {job.job_id}")
    
    await redis_pool.close()