# run_worker.py (root level)
import asyncio
import logging
from arq import run_worker
from src.workers.email.email_worker import WorkerSettings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)

if __name__ == "__main__":
    try:
        run_worker(WorkerSettings)
    except KeyboardInterrupt:
        print("\n🔴 Worker stopped.")
