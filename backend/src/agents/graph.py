from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg_pool import AsyncConnectionPool

from src.state.agent_state import AgentState
from src.agents.base_agent import base_agent
from src.agents.research_supervisor import supervisor
from src.agents.nodes.launch_campaign_node import launch_campaign_node
from src.agents.nodes.nodes import (
    generate_email_node,
    generate_linkedin_node,
    generate_battle_card_node,
    generate_flyer_node,
    generate_all_node,
    refine_node,
    find_prospects_node,
    wait_for_prospect_approval_node,
    # launch_campaign_node,
    process_feedback_node,
    update_state_node,
    check_outreach_status_node,
    generate_email_and_linkedin_node,
    generate_linkedin_outreach_node,
)
from src.agents.outreach.approve_outreach import show_prospects_node, approve_prospects_node


TOOL_NODES = [
    "run_research",
    "generate_email_sequence",
    "generate_email_and_linkedin_outreach",
    "generate_linkedin_outreach",
    "generate_linkedin_post",
    "generate_battle_card",
    "generate_flyer",
    "generate_all_assets",
    "refine_output",
    "process_feedback",
]

VALID_ACTIONS = set(TOOL_NODES) | {
    "find_prospects",
    "wait_for_prospect_approval",
    "launch_campaign",
    "check_outreach_status",
}


def route_from_base(state: AgentState) -> str:
    action = state.get("next_action", "__end__")
    return action if action in VALID_ACTIONS else "__end__"


def route_from_update(state: AgentState) -> str:
    """
    After update_state, decide whether to loop back to base_agent
    or end the turn and wait for next user input.
    
    - Tool just ran (loop < MAX) → back to base_agent so it can
      summarise results or chain the next action.
    - Conversational reply (__end__) → END, history is written, done.
    """
    action = state.get("next_action", "__end__")
    if action == "__end__":
        return END
    # Tool nodes loop back so base_agent can react to results
    return "base_agent"


def _build_graph() -> StateGraph:
    g = StateGraph(AgentState)

    # ── Nodes ────────────────────────────────────────────────────────────────
    g.add_node("base_agent",   base_agent)
    g.add_node("update_state", update_state_node)

    # Tool nodes
    g.add_node("run_research",            supervisor)
    g.add_node("generate_email_sequence", generate_email_node)
    g.add_node("generate_email_and_linkedin_outreach", generate_email_and_linkedin_node)
    g.add_node("generate_linkedin_outreach", generate_linkedin_outreach_node)
    g.add_node("generate_linkedin_post",  generate_linkedin_node)
    g.add_node("generate_battle_card",    generate_battle_card_node)
    g.add_node("generate_flyer",          generate_flyer_node)
    g.add_node("generate_all_assets",     generate_all_node)
    g.add_node("refine_output",           refine_node)
    g.add_node("process_feedback",        process_feedback_node)

    # Prospecting workflow nodes
    g.add_node("find_prospects",             find_prospects_node)
    g.add_node("show_prospects",             show_prospects_node)
    g.add_node("wait_for_prospect_approval", wait_for_prospect_approval_node)
    g.add_node("approve_prospects",          approve_prospects_node)
    g.add_node("launch_campaign",            launch_campaign_node)
    g.add_node("check_outreach_status",      check_outreach_status_node)

    # ── Edges ────────────────────────────────────────────────────────────────
    g.set_entry_point("base_agent")

    # base_agent → tool node OR update_state (for conversational __end__)
    g.add_conditional_edges("base_agent", route_from_base, {
        **{node: node for node in VALID_ACTIONS},
        "__end__": "update_state",
    })

    # All tool nodes → update_state
    for node in TOOL_NODES:
        g.add_edge(node, "update_state")

    # Prospecting workflow → update_state
    g.add_edge("find_prospects",             "show_prospects")
    g.add_edge("show_prospects",             "wait_for_prospect_approval")
    g.add_edge("wait_for_prospect_approval", "approve_prospects")
    g.add_edge("approve_prospects",          "update_state")

    # Terminal action nodes → update_state (so history is written)
    g.add_edge("launch_campaign",       "update_state")
    g.add_edge("check_outreach_status", "update_state")

    # update_state → base_agent (tool ran, let agent react)
    #              → END        (conversational turn done)
    g.add_conditional_edges("update_state", route_from_update, {
        "base_agent": "base_agent",
        END: END,
    })

    return g


async def get_compiled_graph(pool: AsyncConnectionPool):
    checkpointer = AsyncPostgresSaver(pool)
    await checkpointer.setup()
    return _build_graph().compile(
        checkpointer=checkpointer,
        interrupt_before=["wait_for_prospect_approval"],
    )