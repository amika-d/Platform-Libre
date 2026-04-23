"""
src/main.py  (updated)
Changes from original:
  - import set_pool from src.db.database
  - call set_pool(pool) right after pool.open() so workers/routes can use get_pool()
  - webhook router now also handles /resend-events
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from psycopg_pool import AsyncConnectionPool

from src.core.config import settings
from src.routes.analyse import router as analyse_router
# from src.routes.history import router as history_router
from src.routes.webhooks import router as webhooks_router
from src.routes.outreach import router as outreach_router

from src.db.database import init_db, set_pool          # ← added set_pool
from src.agents.graph import get_compiled_graph

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting up: Connecting to Postgres...")

    pool = AsyncConnectionPool(
        conninfo=settings.POSTGRES_URI,
        max_size=20,
        kwargs={"autocommit": True},
    )
    await pool.open()
    app.state.db_pool = pool
    set_pool(pool)                                      # ← wire the global pool

    try:
        await init_db()
        logger.info("✅ Custom DB initialization complete.")
    except Exception as e:
        logger.error("❌ Failed to run init_db: %s", e)

    try:
        app.state.agent = await get_compiled_graph(pool)
        logger.info("✅ LangGraph Agent compiled and ready.")
    except Exception as e:
        logger.error("❌ Failed to compile LangGraph Agent: %s", e)

    yield

    logger.info("🛑 Shutting down: Closing Postgres connections...")
    await pool.close()


app = FastAPI(title="Hackathon Agent", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyse_router,  prefix="/v1")
# app.include_router(history_router,  prefix="/v1")
app.include_router(webhooks_router, prefix="/v1")
app.include_router(outreach_router, prefix="/v1")
app


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/health/llm")
async def health_llm():
    try:
        from src.core.llm import call_llm
        reply = await call_llm(
            [{"role": "user", "content": "reply with the word ready"}],
            max_tokens=5,
        )
        return {"status": "ok", "reply": reply}
    except Exception as e:
        logger.error("LLM Health Check Failed: %s", e)
        return {"status": "error", "detail": str(e)}


@app.get("/")
async def root():
    return {
        "service": "Growth Intelligence Agent",
        "endpoints": {
            "analyse":        "GET  /v1/analyse/stream",
            "approve":        "POST /v1/analyse/approve",
            "resend_webhook": "POST /v1/webhooks/resend-events",
            "health":         "GET  /health",
            "docs":           "GET  /docs",
        },
    }