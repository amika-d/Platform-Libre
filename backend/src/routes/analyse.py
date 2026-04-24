import json
import asyncio
import logging
from typing import Any
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from src.state.agent_state import create_initial_state

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analyse", tags=["Analyse Flow"])


# ── Request Models ────────────────────────────────────────────────────────────

class AnalyseRequest(BaseModel):
    query: str
    session_id: str


class ApproveRequest(BaseModel):
    thread_id: str
    approved: bool = True
    prospects: list[str] = []


# ── Helpers ───────────────────────────────────────────────────────────────────

def _thread_config(thread_id: str) -> dict[str, Any]:
    return {"configurable": {"thread_id": thread_id}}


async def _has_checkpoint(agent: Any, config: dict[str, Any]) -> bool:
    try:
        snapshot = await agent.aget_state(config)
    except Exception:
        return False
    values = getattr(snapshot, "values", None)
    return bool(values)


async def _build_invoke_input(
    agent: Any, query: str, session_id: str, config: dict[str, Any]
) -> dict[str, Any]:
    """
    New thread  → full initial state.
    Existing    → incremental turn input only (approved_prospects carried forward).
    """
    if await _has_checkpoint(agent, config):
        snapshot = await agent.aget_state(config)
        values = getattr(snapshot, "values", None)

        approved_prospects = []
        if values is not None:
            raw = values.get("approved_prospects", []) if isinstance(values, dict) else getattr(values, "approved_prospects", [])
            for item in (raw or []):
                if isinstance(item, dict):
                    approved_prospects.append(item)
                elif isinstance(item, str):
                    approved_prospects.append({"name": item, "email": "", "company": "", "linkedin_url": ""})

        return {
            "query": query,
            "session_id": session_id,
            "_loop_count": 0,
            "next_action": "",
            "tool_input": {},
            "response_text": "",
            "approved_prospects": approved_prospects,
        }

    return create_initial_state(query, session_id)


def _state_get(values: Any, key: str, default: Any = None) -> Any:
    if values is None:
        return default
    if isinstance(values, dict):
        return values.get(key, default)
    return getattr(values, key, default)


def _domain_from(citation: dict) -> str:
    url = citation.get("url", "")
    src = citation.get("source", "")
    if url and (not src or src.lower() == "google"):
        try:
            from urllib.parse import urlparse
            return urlparse(url).netloc.replace("www.", "") or "Website"
        except Exception:
            return "Website"
    return src or "Website"


def _extract_asset(update: dict) -> dict | None:
    asset = {}

    # Generated content variants
    drafted = update.get("drafted_variants", {})
    last = update.get("last_generated", "")
    if last and drafted and last in drafted:
        asset[last] = drafted[last]

    # Prospects awaiting approval
    pending = update.get("pending_prospects") or update.get("displayed_prospects")
    if pending:
        asset["pending_prospects"] = pending

    # Competitive map
    if update.get("competitive_map"):
        asset["competitive_map"] = update["competitive_map"]

    # Citations / sources
    citations = update.get("citations")
    if citations:
        asset["sources"] = [
            {"id": f"cit-{i}", "domain": _domain_from(c), "url": c.get("url", "")}
            for i, c in enumerate(citations)
        ]

    return asset or None


# ── SSE Generator ─────────────────────────────────────────────────────────────

async def _agent_sse_generator(agent: Any, query: str, session_id: str, request: Request):
    """Runs the LangGraph agent and yields SSE-formatted state updates."""
    heartbeat_seconds = 15

    def _sse(payload: dict) -> str:
        return f"data: {json.dumps(payload)}\n\n"

    config = _thread_config(session_id)
    state = await _build_invoke_input(agent, query, session_id, config)

    pending_next = None
    stream_completed = False

    try:
        stream_iter = agent.astream(state, config, stream_mode="updates").__aiter__()

        while True:
            if await request.is_disconnected():
                logger.info("Client disconnected during session %s.", session_id)
                return

            if pending_next is None:
                pending_next = asyncio.create_task(stream_iter.__anext__())

            done, _ = await asyncio.wait({pending_next}, timeout=heartbeat_seconds)

            if not done:
                yield ": ping\n\n"
                continue

            try:
                output = pending_next.result()
            except StopAsyncIteration:
                stream_completed = True
                pending_next = None
                break
            finally:
                if pending_next is not None and pending_next.done():
                    pending_next = None

            for node_name, state_update in output.items():
                if not isinstance(state_update, dict):
                    continue

                payload = {
                    "node":   node_name,
                    "action": state_update.get("next_action", ""),
                    "text":   state_update.get("response_text", ""),
                    "asset":  _extract_asset(state_update),
                }

                yield _sse(payload)
                await asyncio.sleep(0.05)

        if stream_completed and not await request.is_disconnected():
            yield _sse({"done": True})

    except asyncio.CancelledError:
        logger.info("SSE stream cancelled for session %s.", session_id)
        raise
    except Exception as e:
        logger.error("Graph execution failed for session %s: %s", session_id, e, exc_info=True)
        if not await request.is_disconnected():
            yield _sse({"error": "Execution interrupted", "detail": str(e)})
            yield _sse({"done": True})
    finally:
        if pending_next is not None and not pending_next.done():
            pending_next.cancel()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/stream")
async def stream_analysis(request: Request, body: AnalyseRequest):
    """
    SSE stream for every user message — new sessions and follow-ups alike.
    Frontend always POSTs here with the same session_id to continue a thread.
    """
    query = body.query.strip()
    session_id = body.session_id.strip()

    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    if not session_id or len(session_id) < 3:
        raise HTTPException(status_code=400, detail="Session ID must be at least 3 characters.")

    agent = getattr(request.app.state, "agent", None)
    if not agent:
        raise HTTPException(status_code=500, detail="Agent not initialized.")

    logger.info("Stream started | session=%s | query='%s'", session_id, query)

    return StreamingResponse(
        _agent_sse_generator(agent, query, session_id, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/approve")
async def approve(body: ApproveRequest, request: Request):
    """
    Resumes the graph after the prospect approval interrupt.
    Call this once the user confirms or rejects the prospect list.
    """
    thread_id = body.thread_id.strip()
    if not thread_id or len(thread_id) < 3:
        raise HTTPException(status_code=400, detail="Thread ID must be at least 3 characters.")

    agent = getattr(request.app.state, "agent", None)
    if not agent:
        raise HTTPException(status_code=500, detail="Agent not initialized.")

    config = _thread_config(thread_id)

    snapshot = await agent.aget_state(config)
    values = getattr(snapshot, "values", None)
    pending = (
        _state_get(values, "pending_prospects", []) or
        _state_get(values, "displayed_prospects", []) or
        []
    )

    if body.approved:
        if not body.prospects:
            # No specific selection → approve all pending
            approved_prospects = pending
        else:
            approval_set = {s.strip().lower() for s in body.prospects}
            approved_prospects = [
                p for p in pending
                if isinstance(p, dict) and (
                    str(p.get("linkedin_url", "")).strip().lower() in approval_set or
                    str(p.get("name", "")).strip().lower() in approval_set
                )
            ]
    else:
        approved_prospects = []

    await agent.aupdate_state(
        config,
        {
            "approval_list":           body.prospects,
            "approved_prospects":      approved_prospects,
            "approval_status":         "approved" if body.approved else "rejected",
            "requires_human_approval": False,
        },
    )

    result = await agent.ainvoke(None, config)

    return {
        "response": result.get("response_text"),
        "action":   result.get("next_action"),
        "state": {
            "approved_count":   len(result.get("approved_prospects", [])),
            "pending_prospects": len(result.get("pending_prospects", [])),
            "outreach_status":  result.get("outreach_status", []),
        },
    }