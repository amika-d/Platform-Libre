# run_linkedin_worker.py (root level)
import logging
import asyncio
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)

print("🟡 Starting LinkedIn worker...")

from src.workers.linkedin.worker import WorkerSettings
from arq import run_worker

if __name__ == "__main__":
    # Python 3.10+ requires explicit event loop creation
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        run_worker(WorkerSettings)
    except KeyboardInterrupt:
        print("\n🔴 LinkedIn worker stopped.")
    finally:
        loop.close()