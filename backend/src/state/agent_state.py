from typing import TypedDict

DEFAULT_APPROVED_PROSPECTS = [
    
    {
        "name": "chavii",
        "email": "chavilak398@gmail.com",
        "company": "linux",
        "linkedin_url": "https://linkedin.com/in/chavi",
    }
]

class AgentState(TypedDict):
    query:          str
    session_id:     str
    user_provided_research: str
    active_domains: list[str]    

    # 8 domain outputs
    market:      dict
    competitor:  dict
    win_loss:    dict
    positioning: dict
    adjacent:    dict
    channel:     dict
    contextual:  dict
    intent:      dict

    # Synthesis
    summary:             str
    top_opportunities:   list[str]
    top_risks:           list[str]
    recommended_actions: list[str]
    citations:           list[dict]
    competitive_map:     dict
    domains_run:         list[str]
    domains_failed:      list[str]
    
    # What the base_agent decided
    next_action: str
    tool_input: dict
    conversation_history: list[dict]

    # Supervisor metadata
    targeted_query:  str
    research_depth:  str
 
    # Campaign identity
    campaign_id:     str
    cycle_number:    int
    product_context: str
    target_segment:  str
    prospect_strategy: str
 
    # Campaign memory
    cycle_memory:           list[dict]
    confirmed_hypotheses:   list[str]
    failed_angles:          list[str]
 
    # Generation outputs
    drafted_variants: dict
    last_generated:   str
    last_refined:     str
 
    # Feedback
    feedback_result:  dict
 
    # Error handling
    refine_error:     str

    # Agent UX
    response_text: str
    thinking:      str
    _loop_count:   int
    
    # Prospect discovery workflow
    pending_prospects:       list[dict]      # Prospects from find_prospects_node awaiting approval
    approved_prospects:      list[dict]      # Filtered by user approval
    approval_list:           list[str]       # User-selected URLs/names to approve
    approval_status:         str             # pending_review | approved | rejected
    presentation_time:       str             # ISO timestamp when prospects were shown
    approval_time:           str             # ISO timestamp when approval occurred
    requires_human_approval: bool            # Flag to trigger approval UI widget
    
    # Outreach tracking
    outreach_status:         list[dict]      # Tracking records for each approved prospect
    campaign_launched:       bool            # True after launch_campaign_node
    campaign_launch_time:    str             # ISO timestamp of campaign launch

# ── Factory Function ─────────────────────────────────────────────────────────

def create_initial_state(
    query: str,
    session_id: str,
    product_context: str = "Vector Agents (vectoragents.ai) — A platform of AI-powered digital workers including Lilian (AI SDR), Bradley (Finance Processor), Rhea (Customer Support), and Blake (HR Manager), each automating specific business functions end-to-end.",
    target_segment: str = "VP of Sales, RevOps Leaders, and Founders looking to automate outbound growth and internal department operations",
) -> AgentState:
    """Factory function to generate the complete starting state for a new session."""
    
    return {
        "query": query,
        "session_id": session_id,
        "user_provided_research": "",
        "active_domains": [],

        # Domain outputs
        "market": {},
        "competitor": {},
        "win_loss": {},
        "positioning": {},
        "adjacent": {},
        "channel": {},
        "contextual": {},
        "intent": {},

        # Synthesis
        "summary": "",
        "top_opportunities": [],
        "top_risks": [],
        "recommended_actions": [],
        "citations": [],
        "competitive_map": {},
        "domains_run": [],
        "domains_failed": [],

        # Routing / Execution
        "next_action": "",
        "tool_input": {},
        "conversation_history": [],

        # Supervisor metadata
        "targeted_query": "",
        "research_depth": "quick",

        # Campaign identity
        "campaign_id": session_id,
        "cycle_number": 1,
        "product_context": product_context,
        "target_segment": target_segment,

        # Campaign memory
        "cycle_memory": [],
        "confirmed_hypotheses": [],
        "failed_angles": [],

        # Generation outputs
        "drafted_variants": {},
        "last_generated": "",
        "last_refined": "",

        # Feedback
        "feedback_result": {},

        # Error handling
        "refine_error": "",

        # Agent UX
        "response_text": "",
        "thinking": "",
        "_loop_count": 0,
        
        # Prospect discovery workflow
        "pending_prospects": [],
        "approved_prospects": [*DEFAULT_APPROVED_PROSPECTS],
        "approval_list": [],
        "approval_status": "",
        "presentation_time": "",
        "approval_time": "",
        "requires_human_approval": False,
        
        # Outreach tracking
        "outreach_status": [],
        "campaign_launched": False,
        "campaign_launch_time": "",
    }
