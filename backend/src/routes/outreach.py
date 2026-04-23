from fastapi import APIRouter, Query, Request, HTTPException
from pydantic import BaseModel
import logging

from src.db.outreach import get_live_queue
from src.state.agent_state import DEFAULT_APPROVED_PROSPECTS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/outreach", tags=["Outreach"])


class LaunchCampaignRequest(BaseModel):
    thread_id: str
    selected_variant: str  # 'A' or 'B'


def _state_get(values, key, default=None):
    if isinstance(values, dict):
        return values.get(key, default)
    return getattr(values, key, default)


def _normalize_prospects(items):
    normalized = []
    for item in items or []:
        if isinstance(item, dict):
            normalized.append(item)
            continue
        if isinstance(item, str):
            normalized.append({"name": item, "email": "", "company": "", "linkedin_url": ""})
    return normalized


@router.get("/queue")
async def outreach_queue(
    session_id: str | None = Query(default=None, description="Optional session/campaign id filter"),
    limit: int = Query(default=100, ge=1, le=200),
):
    """Return live outreach queue rows and summary stats for the UI."""
    data = await get_live_queue(campaign_id=session_id, limit=limit)
    return {
        "session_id": session_id,
        "items": data["items"],
        "stats": data["stats"],
    }


@router.post("/launch")
async def launch_campaign(req: LaunchCampaignRequest, request: Request):
    """
    Launch a campaign with the selected email variant.
    Reads the agent state, filters the selected variant, and calls launch_campaign_node.
    """
    try:
        logger.info(f"🚀 Launch campaign POST /v1/outreach/launch for thread {req.thread_id}")
        
        # Get agent from app state
        agent = getattr(request.app.state, "agent", None)
        if not agent:
            raise HTTPException(status_code=500, detail="Agent not initialized")
        
        # Get checkpoint state
        config = {"configurable": {"thread_id": req.thread_id}}
        snapshot = await agent.aget_state(config)
        if not snapshot or not hasattr(snapshot, "values"):
            logger.warning(f"No checkpoint found for {req.thread_id}")
            raise HTTPException(status_code=404, detail="Session checkpoint not found")
        
        state_obj = snapshot.values
        logger.info(f"State object type: {type(state_obj).__name__}")
        
        # Rebuild state dict from attributes, don't rely on .get() on State objects
        state_dict = {}
        
        # Essential fields
        for field in ["query", "session_id", "campaign_id", "cycle_number", "product_context", "target_segment", 
                      "response_text", "_loop_count", "next_action", "tool_input"]:
            val = _state_get(state_obj, field, None)
            if val is not None:
                state_dict[field] = val
        
        # Get approved_prospects (required)
        approved_prospects = _normalize_prospects(_state_get(state_obj, "approved_prospects", []))
        if not approved_prospects:
            logger.warning(
                f"No approved prospects in session {req.thread_id}; applying default fallback"
            )
            approved_prospects = [*DEFAULT_APPROVED_PROSPECTS]
        state_dict["approved_prospects"] = approved_prospects
        
        # Get drafted_variants and filter to selected variant
        drafted_variants_raw = _state_get(state_obj, "drafted_variants", {})
        logger.info(f"drafted_variants type: {type(drafted_variants_raw).__name__}")
        
        # Safely extract email_sequence from drafted_variants
        variants_list = []
        if drafted_variants_raw:
            # Try accessing as dict
            try:
                if isinstance(drafted_variants_raw, dict):
                    email_seq = drafted_variants_raw.get("email_sequence", {})
                else:
                    # Try as object attribute
                    email_seq = getattr(drafted_variants_raw, "email_sequence", {})
            except AttributeError:
                logger.warning(f"Could not access email_sequence from drafted_variants type {type(drafted_variants_raw)}")
                email_seq = {}
            
            # Extract variants
            try:
                if isinstance(email_seq, dict):
                    variants_list = email_seq.get("variants", [])
                else:
                    # Try as object attribute  
                    variants_list = getattr(email_seq, "variants", [])
            except AttributeError:
                logger.warning(f"Could not access variants from email_seq type {type(email_seq)}")
                variants_list = []
        
        logger.info(f"Found {len(variants_list)} variants")
        if not variants_list:
            raise HTTPException(status_code=400, detail="No email variants available")
        
        # Find selected variant
        selected_variant = None
        for v in variants_list:
            v_id = v.get("id") if isinstance(v, dict) else getattr(v, "id", None)
            if v_id == req.selected_variant:
                selected_variant = v
                break
        
        if not selected_variant:
            raise HTTPException(status_code=400, detail=f"Variant {req.selected_variant} not found")
        
        logger.info(f"✅ Found selected variant {req.selected_variant}")
        
        # Create clean state dict for launch_campaign_node
        state_dict["drafted_variants"] = {
            "email_sequence": {
                "variants": [selected_variant]
            }
        }
        state_dict["next_action"] = "launch_campaign"
        state_dict["_loop_count"] = 0
        
        # Call launch_campaign_node
        logger.info(f"Calling launch_campaign_node...")
        from src.agents.nodes.launch_campaign_node import launch_campaign_node
        result = await launch_campaign_node(state_dict)
        
        logger.info(f"✅ Campaign launch completed")
        
        return {
            "status": "success",
            "message": f"Campaign launched with Variant {req.selected_variant}",
            "campaign_id": state_dict.get("campaign_id", ""),
            "prospects_queued": len(approved_prospects),
        }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        tb_str = traceback.format_exc()
        logger.error(f"❌ Campaign launch failed: {type(e).__name__}: {str(e)}\n{tb_str}", exc_info=True)
        raise HTTPException(status_code=500, detail=tb_str)
