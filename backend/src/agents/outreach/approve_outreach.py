# src/agents/outreach/approve_outreach.py
"""
Human approval workflow for outreach to discovered prospects.
Shows found prospects, waits for approval, then initiates outreach.
"""

from datetime import datetime
from src.state.agent_state import AgentState
from src.core.config import settings


async def show_prospects_node(state: AgentState) -> AgentState:
    """
    Display discovered prospects to user for review and approval.
    
    Expected state inputs:
    - candidate_prospects: List of prospects from search_prospects_node
    
    Returns state with:
    - displayed_prospects: Prospects shown to user
    - approval_status: "pending_review"
    """
    print("--- NODE: show_prospects ---")
    
    candidates = state.get("pending_prospects", []) or state.get("candidate_prospects", [])
    
    if not candidates:
        print("[show_prospects] No candidates to display")
        return {**state, "displayed_prospects": [], "approval_status": "no_candidates"}
    
    print(f"\n{'='*60}")
    print(f"PROSPECTS FOUND: {len(candidates)}")
    print(f"{'='*60}\n")
    
    for i, prospect in enumerate(candidates, 1):
        print(f"{i}. {prospect.get('name', 'Unknown')}")
        print(f"   Title:  {prospect.get('title', 'Unknown')}")
        print(f"   Company: {prospect.get('company', 'Unknown')}")
        print(f"   LinkedIn: {prospect.get('linkedin_url', 'N/A')}")
        print()
    
    print(f"{'='*60}")
    print(f"Total findings: {len(candidates)}")
    print(f"Ready for approval → approve_prospects_node")
    print(f"{'='*60}\n")
    
    return {
        **state,
        "displayed_prospects": candidates,
        "approval_status": "pending_review",
        "presentation_time": datetime.now().isoformat(),
    }


async def approve_prospects_node(state: AgentState) -> AgentState:
    """
    Wait for human approval before initiating outreach.
    Allows selective approval (all, some, or none).
    
    Expected state inputs:
    - displayed_prospects: Prospects to approve
    - approval_list: List of approved prospect names/URLs (from user)
    
    Returns state with:
    - approved_prospects: Selected prospects approved for outreach
    - outreach_status: Tracking records for each approved prospect
    - approval_status: "approved" | "rejected"
    """
    print("--- NODE: approve_prospects ---")
    
    displayed = state.get("displayed_prospects", []) or state.get("pending_prospects", []) or state.get("candidate_prospects", [])
    approval_list = state.get("approval_list", [])  # User-provided list of approvals
    
    if not displayed:
        print("[approve_prospects] No prospects to approve")
        return {**state, "approved_prospects": [], "outreach_status": [], "approval_status": "rejected"}
    
    # If no explicit approval list, allow all (configurable behavior)
    if not approval_list:
        print(f"[approve_prospects] No approval filters → approving all {len(displayed)} prospects")
        approved = displayed
    else:
        # Filter to only approved links/names
        approved = [
            p for p in displayed
            if any(str(p.get("linkedin_url", "")).strip().lower() == str(a).strip().lower() for a in approval_list) or
               any(str(p.get("name", "")).strip().lower() == str(a).strip().lower() for a in approval_list)
        ]
        print(f"[approve_prospects] Matched {len(approved)} prospects from approval_list ({len(approval_list)} items)")
        for a in approved:
            print(f"  - Approved: {a.get('name')} ({a.get('linkedin_url')})")
    
    if not approved:
        print("[approve_prospects] Zero prospects approved for outreach. Displayed count: {len(displayed)}")
        return {**state, "approved_prospects": [], "outreach_status": [], "approval_status": "rejected"}
    
    # Initialize outreach status tracking for each approved prospect
    outreach_status = [
        {
            "linkedin_url":  p["linkedin_url"],
            "name":          p["name"],
            "title":         p.get("title", ""),
            "company":       p.get("company", ""),
            "status":        "pending",       # pending → request_sent → accepted → messaged
            "discovered_at": datetime.now().isoformat(),
            "sent_at":       None,
            "accepted_at":   None,
            "message_sent":  False,
            "outreach_type": None,           # sales, recruitment, partnership, etc.
            "variant_used":  None,
            "notes":         "",
        }
        for p in approved
    ]
    
    print(f"[approve_prospects] Initialized outreach tracking for {len(approved)} prospects")
    
    return {
        **state,
        "approved_prospects": approved,
        "outreach_status": outreach_status,
        "approval_status": "approved",
        "approval_time": datetime.now().isoformat(),
    }


def get_discovery_summary(state: AgentState) -> dict:
    """
    Get a summary of discovered and approved prospects.
    Useful for logging, reporting, or UI display.
    """
    candidates = state.get("candidate_prospects", [])
    approved = state.get("approved_prospects", [])
    
    return {
        "total_searched": state.get("query", ""),
        "candidates_found": len(candidates),
        "prospects_approved": len(approved),
        "approval_status": state.get("approval_status"),
        "timestamp": state.get("approval_time", state.get("presentation_time", "")),
        "candidates": candidates,
        "approved": approved,
    }
