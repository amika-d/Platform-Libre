import json
import asyncio
import logging
from typing import Any
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from src.state.agent_state import create_initial_state, DEFAULT_APPROVED_PROSPECTS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analyse", tags=["Analyse Flow"])

class AnalyseRequest(BaseModel):
    query: str
    session_id: str
    use_mock: bool = False  # Optional: inject mock research data for testing


class ChatRequest(BaseModel):
    message: str
    thread_id: str


class ApproveRequest(BaseModel):
    thread_id: str
    approved: bool = True
    prospects: list[str] = []


def _thread_config(thread_id: str) -> dict[str, Any]:
    return {"configurable": {"thread_id": thread_id}}


async def _has_checkpoint(agent: Any, config: dict[str, Any]) -> bool:
    """Returns True if a checkpoint already exists for this thread."""
    try:
        snapshot = await agent.aget_state(config)
    except Exception:
        return False

    values = getattr(snapshot, "values", None)
    return bool(values)


async def _build_invoke_input(agent: Any, query: str, session_id: str, config: dict[str, Any]) -> dict[str, Any]:
    """
    Build the smallest safe input for a new turn.
    - New thread: provide full initial state.
    - Existing thread: provide incremental turn input only.
    """
    if await _has_checkpoint(agent, config):
        approved_prospects = []
        snapshot = await agent.aget_state(config)
        values = getattr(snapshot, "values", None)
        if values is not None:
            if isinstance(values, dict):
                approved_prospects = values.get("approved_prospects", []) or []
            else:
                approved_prospects = getattr(values, "approved_prospects", []) or []
        
        print(f"DEBUG [_build_invoke_input] Found {len(approved_prospects)} approved prospects in checkpoint")

        normalized = []
        for item in approved_prospects:
            if isinstance(item, dict):
                normalized.append(item)
            elif isinstance(item, str):
                normalized.append({"name": item, "email": "", "company": "", "linkedin_url": ""})

        return {
            "query": query,
            "session_id": session_id,
            "_loop_count": 0,
            "next_action": "",
            "tool_input": {},
            "response_text": "",
            "approved_prospects": normalized,
        }

    return create_initial_state(query, session_id)


def _state_get(values: Any, key: str, default: Any = None) -> Any:
    if values is None:
        return default
    if isinstance(values, dict):
        return values.get(key, default)
    return getattr(values, key, default)

async def _agent_sse_generator(agent, query: str, session_id: str, use_mock: bool, request: Request):
    """Executes the LangGraph agent and yields SSE formatted state updates."""
    heartbeat_seconds = 15
    stream_completed = False

    def _sse(payload: dict) -> str:
        return f"data: {json.dumps(payload)}\n\n"
    config = _thread_config(session_id)
    state = await _build_invoke_input(agent, query, session_id, config)
    

    pending_next = None
    try:
        # 3. Stream execution with heartbeat while waiting for next graph output
        stream_iter = agent.astream(state, config, stream_mode="updates").__aiter__()

        while True:
            if await request.is_disconnected():
                logger.info("Client disconnected during session %s. Aborting stream.", session_id)
                return

            if pending_next is None:
                pending_next = asyncio.create_task(stream_iter.__anext__())

            done, _ = await asyncio.wait({pending_next}, timeout=heartbeat_seconds)
            if not done:
                # Keep intermediaries/connections alive during long-running agent steps.
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
                    
                # Extract thinking/research events from domain results in state update
                research_domains = ["market", "competitor", "channel", "intent", "adjacent", "contextual", "positioning", "win_loss"]
                
                # Check if this update contains domain research results
                for domain in research_domains:
                    if domain in state_update and isinstance(state_update[domain], dict):
                        domain_data = state_update[domain]
                        # Emit thinking event for this domain
                        thinking_payload = {
                            "type": "thinking",
                            "domain": domain,
                            "status": f"Analyzed {domain} research",
                        }
                        
                        # Include domain-specific findings
                        if "findings" in domain_data:
                            thinking_payload["summary"] = domain_data["findings"]
                        
                        # Emit thinking event
                        yield _sse(thinking_payload)
                        await asyncio.sleep(0.05)
                
                # Also emit synthesis-level thinking if present
                if state_update.get("summary") and state_update.get("top_opportunities"):
                    synthesis_thinking = {
                        "type": "thinking",
                        "domain": "synthesis",
                        "status": "Synthesized research findings",
                        "summary": state_update.get("summary", ""),
                        "opportunities": state_update.get("top_opportunities", []),
                        "risks": state_update.get("top_risks", []),
                    }
                    yield _sse(synthesis_thinking)
                    await asyncio.sleep(0.05)
                
                payload = {
                    "node": node_name,
                    "action": state_update.get("next_action", ""),
                    "text": state_update.get("response_text", ""),
                }

                # Attach Ephemeral UI Widgets
                if payload["action"] == "show_options":
                    payload["widget"] = state_update.get("tool_input", {})

                # Attach Generated JSON Assets
                if state_update.get("last_generated"):
                    last = state_update["last_generated"]
                    # Try to get drafted_variants from update, fallback to full state
                    drafted = state_update.get("drafted_variants")
                    if not drafted:
                        full_snapshot = await agent.aget_state(config)
                        drafted = _state_get(full_snapshot.values, "drafted_variants", {})
                    
                    key_alias = {
                        "email": "email_sequence",
                        "linkedin": "linkedin_posts",
                        "battle": "battle_card",
                        "email_and_linkedin_sequence": "email_sequence",
                        "linkedin_sequence": "email_sequence",
                    }
                    asset_key = last if last in drafted else key_alias.get(last, "")
                    if asset_key and asset_key in (drafted or {}):
                        payload["asset"] = {asset_key: drafted[asset_key]}

                # Attach Direct Research Q&A
                if payload["node"] == "answer_from_research" and state_update.get("research_answer"):
                    payload["text"] = state_update["research_answer"]
                    payload["source"] = state_update.get("answer_source", "")

                # Attach Pending Prospects for Approval Step
                if payload["action"] and any(approval_keyword in payload["action"].lower() for approval_keyword in ["wait_for_prospect_approval", "approve_prospects", "show_prospects"]):
                    pending = _state_get(state_update, "pending_prospects", []) or _state_get(state_update, "displayed_prospects", []) or []
                    if pending:
                        if "asset" not in payload:
                            payload["asset"] = {}
                        payload["asset"]["pending_prospects"] = pending

                # Attach Competitive Map for visualization
                if state_update.get("competitive_map"):
                    if "asset" not in payload:
                        payload["asset"] = {}
                    payload["asset"]["competitive_map"] = state_update["competitive_map"]

                # Attach Citations ONLY if it is a research-related node, to avoid leaking them to "hi" messages
                citations = None
                if payload.get("node") in ["run_research", "answer_from_research", "supervisor", "research_supervisor"]:
                    citations = state_update.get("citations") or state_update.get("drafted_variants", {}).get("top_citations")
                if citations:
                    if "asset" not in payload:
                        payload["asset"] = {}
                    
                    sources = []
                    for idx, c in enumerate(citations):
                        source_domain = c.get("source", "")
                        url = c.get("url", "")
                        if (not source_domain or source_domain.lower() == "google") and url:
                            try:
                                from urllib.parse import urlparse
                                source_domain = urlparse(url).netloc.replace("www.", "")
                            except:
                                source_domain = "Website" if not source_domain else source_domain
                        # Handle case where source_domain might be very long or empty
                        if not source_domain:
                            source_domain = "Website"
                        sources.append({"id": f"cit-{idx}", "domain": source_domain, "url": url})
                    payload["asset"]["sources"] = sources

                # Emit SSE chunk
                yield _sse(payload)

                # Non-blocking yield for event loop stability
                await asyncio.sleep(0.05)

        if stream_completed and not await request.is_disconnected():
            yield _sse({"done": True, "status": "complete"})

    except asyncio.CancelledError:
        logger.info("SSE stream task cancelled for session %s", session_id)
        raise
    except Exception as e:
        logger.error(f"Graph execution failed for session {session_id}: {e}", exc_info=True)
        if not await request.is_disconnected():
            yield _sse({"error": "Execution interrupted", "detail": str(e)})
            yield _sse({"done": True, "status": "error"})
    finally:
        if pending_next is not None and not pending_next.done():
            pending_next.cancel()


@router.post("/stream")
async def stream_analysis(
    request: Request,
    body: AnalyseRequest
):
    """
    Initiates a Server-Sent Events (SSE) stream for the agentic growth loop.
    Frontend should connect to this using POST with JSON body: {query, session_id, use_mock}
    
    Returns: Server-sent events stream of state updates and generated assets
    
    Uses LangGraph checkpointer to persist state by thread_id (session_id).
    """
    query = body.query.strip()
    session_id = body.session_id.strip()
    
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty or whitespace.")
    
    if not session_id or len(session_id) < 3:
        raise HTTPException(status_code=400, detail="Session ID must be at least 3 characters.")
    
    # Get compiled graph from app startup using app state
    agent = getattr(request.app.state, "agent", None)
    if not agent:
        raise HTTPException(status_code=500, detail="Agent not initialized. Server may still be starting up.")
        
    logger.info(f"Initiating stream for session: {session_id} | Query: '{query}' | Use Mock: {body.use_mock}")
    
    return StreamingResponse(
        _agent_sse_generator(agent, query, session_id, body.use_mock, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no" # Prevents Nginx/Proxies from buffering the stream
        }
    )


@router.post("/chat")
async def chat(body: ChatRequest, request: Request):
    """
    Non-streaming chat endpoint backed by LangGraph checkpoint sessions.
    Frontend should pass a stable thread_id per campaign/session.
    """
    message = body.message.strip()
    thread_id = body.thread_id.strip()

    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty or whitespace.")

    if not thread_id or len(thread_id) < 3:
        raise HTTPException(status_code=400, detail="Thread ID must be at least 3 characters.")

    agent = getattr(request.app.state, "agent", None)
    if not agent:
        raise HTTPException(status_code=500, detail="Agent not initialized. Server may still be starting up.")

    config = _thread_config(thread_id)
    invoke_input = await _build_invoke_input(agent, message, thread_id, config)
    result = await agent.ainvoke(invoke_input, config)

    return {
        "response": result.get("response_text"),
        "thinking": result.get("thinking"),
        "action": result.get("next_action"),
        "state": {
            "research_done": bool(result.get("summary")),
            "assets_generated": list(result.get("drafted_variants", {}).keys()),
            "pending_prospects": len(result.get("pending_prospects", [])),
        },
    }


@router.post("/approve")
async def approve(body: ApproveRequest, request: Request):
    """
    Resume a paused approval gate using thread_id.
    Expects the graph to be interrupted at wait_for_prospect_approval.
    """
    thread_id = body.thread_id.strip()
    if not thread_id or len(thread_id) < 3:
        raise HTTPException(status_code=400, detail="Thread ID must be at least 3 characters.")

    agent = getattr(request.app.state, "agent", None)
    if not agent:
        raise HTTPException(status_code=500, detail="Agent not initialized. Server may still be starting up.")

    config = _thread_config(thread_id)
    approval_list = body.prospects if body.approved else []

    snapshot = await agent.aget_state(config)
    values = getattr(snapshot, "values", None)
    pending = _state_get(values, "pending_prospects", []) or _state_get(values, "displayed_prospects", []) or []

    if body.approved:
        if not pending:
            approved_prospects = [*DEFAULT_APPROVED_PROSPECTS]
        elif not approval_list:
            approved_prospects = pending
        else:
            approved_prospects = [
                p for p in pending
                if isinstance(p, dict)
                and (
                    any(str(p.get("linkedin_url", "")).strip().lower() == str(a).strip().lower() for a in approval_list) or
                    any(str(p.get("name", "")).strip().lower() == str(a).strip().lower() for a in approval_list)
                )
            ]
            if not approved_prospects:
                approved_prospects = []
    else:
        approved_prospects = []

    await agent.aupdate_state(
        config,
        {
            "approval_list": approval_list,
            "approved_prospects": approved_prospects,
            "approval_status": "approved" if body.approved else "rejected",
            "requires_human_approval": False,
        },
    )
    result = await agent.ainvoke(None, config)

    return {
        "response": result.get("response_text"),
        "action": result.get("next_action"),
        "state": {
            "approved_count": len(result.get("approved_prospects", [])),
            "pending_prospects": len(result.get("pending_prospects", [])),
            "outreach_status": result.get("outreach_status", []),
        },
    }


@router.get("/mock-state")
async def get_mock_state():
    """
    Returns mock state data for frontend testing and development.
    Includes pre-populated research data so frontend can prototype without backend calls.
    
    Returns:
      - mock_research: Pre-populated research findings
      - initial_state: Sample initial state with campaign context
    """
    mock_research = {
        "summary": (
            "Lilian (Vector Agents AI SDR) operates in a crowded AI SDR market. "
            "Key gap: competitors focus on volume outreach; Lilian's async-native "
            "architecture enables personalisation at scale. VP Sales at Series B "
            "companies cite 'reply rate decay' as top pain point after 2 weeks."
        ),
        "top_opportunities": [
            "Lead with reply-rate decay angle — resonates with VP Sales at Series B",
            "Competitor Amplemarket has no async personalisation — direct gap to exploit",
            "Q1 budget cycles mean SDR tool decisions happening now",
        ],
        "top_risks": [
            "Buyers conflate AI SDR with spam — messaging must lead with quality not volume",
            "Apollo dominates awareness — Lilian needs sharp contrast positioning",
        ],
        "confirmed_hypotheses": [],
        "failed_angles": [],
    }
    
    initial_state = {
        "query": "",
        "session_id": "demo-session-001",
        "conversation_history": [],
        "next_action": "",
        "tool_input": {},
        "_loop_count": 0,
        
        # Research — pre-populated
        **mock_research,
        
        # Campaign identity
        "campaign_id": "demo-campaign-001",
        "cycle_number": 1,
        "product_context": "Lilian — AI SDR by Vector Agents (vectoragents.ai)",
        "target_segment": "VP Sales at Series B SaaS companies",
        
        # Generation outputs (empty for fresh state)
        "drafted_variants": {},
        "last_generated": "",
        "last_refined": "",
        "research_answer": "",
        "answer_source": "",
        
        # Agent UX
        "response_text": "",
        "thinking": "",
    }
    
    return {
        "mock_research": mock_research,
        "initial_state": initial_state,
        "description": "Use this data for frontend testing. initial_state has pre-populated research so you can test generation nodes without waiting for research."
    }