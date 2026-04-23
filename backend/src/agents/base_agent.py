import json
from src.core.tools import TOOLS
from src.state.agent_state import AgentState
from src.core.llm import call_llm_route

MAX_LOOPS = 5
MAX_HISTORY = 10

TOOL_MESSAGES = {
    "run_research":                          "Running market intelligence research…",
    "generate_email_sequence":               "Generating email sequence variants…",
    "generate_email_and_linkedin_outreach":  "Generating multi-channel outreach variants…",
    "generate_linkedin_outreach":            "Generating LinkedIn outreach variants…",
    "generate_linkedin_post":                "Creating LinkedIn post…",
    "generate_battle_card":                  "Building battle card…",
    "generate_flyer":                        "Designing flyer…",
    "generate_all_assets":                   "Generating full campaign asset set…",
    "refine_output":                         "Refining content…",
    "process_feedback":                      "Processing campaign feedback…",
    "find_prospects":                        "Scouting for target prospects…",
    "launch_campaign":                       "Queuing campaign for background execution…",
    "check_outreach_status":                 "Fetching campaign performance data…",
}


def _has_research(state: AgentState) -> bool:
    return bool(state.get("summary")) or bool(state.get("user_provided_research"))


def _preview_variants(state: AgentState) -> dict:
    variants = state.get("drafted_variants", {})
    preview = {}
    for key, val in variants.items():
        if isinstance(val, dict):
            v_list = val.get("variants", [val])
            preview[key] = [
                {
                    "id": v.get("id", "A") if isinstance(v, dict) else "A",
                    "angle": v.get("angle", "") if isinstance(v, dict) else "",
                    "touch_1_subject": v.get("touch_1", {}).get("subject", "")[:100] if isinstance(v, dict) and isinstance(v.get("touch_1"), dict) else "",
                    "touch_1_body": v.get("touch_1", {}).get("body", "")[:150] if isinstance(v, dict) and isinstance(v.get("touch_1"), dict) else "",
                    "linkedin_dm": v.get("linkedin_dm", {}).get("body", "")[:150] if isinstance(v, dict) and isinstance(v.get("linkedin_dm"), dict) else "",
                }
                for v in (v_list if isinstance(v_list, list) else [v_list])
            ]
    return preview


def _build_system_prompt(state: AgentState) -> str:
    research_done = _has_research(state)

    context = {
        "product":  state.get("product_context", "unknown"),
        "segment":  state.get("target_segment", "unknown"),
        "cycle":    state.get("cycle_number", 1),
        "loop":     state.get("_loop_count", 0),

        "research": {
            "done":              research_done,
            "source":            "user_provided" if state.get("user_provided_research") else "system",
            "summary":           (state.get("summary", "") or state.get("user_provided_research", ""))[:500],
            "top_opportunities": state.get("top_opportunities", []),
            "top_risks":         state.get("top_risks", []),
        },

        "content": {
            "generated":      bool(state.get("drafted_variants")),
            "variants":       list(state.get("drafted_variants", {}).keys()),
            "last_generated": state.get("last_generated", ""),
            "last_refined":   state.get("last_refined", ""),
            "preview":        _preview_variants(state),
        },

        "outreach": {
            "pending":      len(state.get("pending_prospects", [])),
            "approved":     len(state.get("approved_prospects", [])),
            "has_messages": bool(state.get("drafted_variants")),
            "launched":     state.get("campaign_launched", False),
        },

        "memory": {
            "confirmed": state.get("confirmed_hypotheses", []),
            "failed":    state.get("failed_angles", []),
        },
    }

    return f"""You are Nadia, Growth Strategy Director. You orchestrate a B2B campaign loop by picking ONE action per turn.

CONTEXT:
{json.dumps(context, indent=2)}

DECISION RULES (evaluate top-to-bottom, stop at first match):

1. CHAT / AMBIGUOUS → reply in plain text, no tool call.

2. SHOW EXISTING STATE → user asks about research, content, or memory already in context → answer directly. No tool.

3. USER PROVIDED RESEARCH → research.source is "user_provided" → treat as complete. Skip run_research. Go straight to generation.

4. RESEARCH NEEDED → research.done is false AND user wants content →
   - If user message contains "skip research", "no research", "just generate", "without research", "generate now" → call generation tool IMMEDIATELY. No questions.
   - Otherwise ask ONCE: "I can generate now or run research first — your call."
   - User says research → call run_research.
   - User says generate → call generation tool with your knowledge about the product. Do not ask again.
   IF research.done is true OR last action was run_research → do NOT call run_research again.

5. CONTENT GENERATION → call the appropriate tool based on user request:
   - Email only          → generate_email_sequence
   - LinkedIn DM only    → generate_linkedin_outreach
   - Both channels       → generate_email_and_linkedin_outreach
   - LinkedIn post       → generate_linkedin_post
   - Everything          → generate_all_assets

   IF content.generated is true AND user asks same type again:
   - Different angle → call generation tool with new angle in tool_input
   - Same thing again → ask "Refine existing variants or generate fresh with a new angle?"
   - Never silently overwrite without confirming intent.

6. PROSPECTS PENDING → outreach.pending > 0 AND outreach.approved == 0 → ask user to review. Do NOT call find_prospects again.

7. LAUNCH →
   - Cycle 1: call launch_campaign if outreach.approved > 0 AND content.generated is true.
   - Cycle 2+: call launch_campaign if content.generated is true. Replied prospects are pulled automatically — do NOT require approved list or find_prospects.

8. REFINE → user wants changes to existing content → call refine_output. Never regenerate from scratch.

9. CAMPAIGN DATA → user asks about replies, opens, variant performance, stats → call check_outreach_status. NEVER say you don't have access — data is in Postgres.

10. PROCESS FEEDBACK → user says process feedback, analyse results, close the loop, what worked → call process_feedback. It pulls real metrics from DB automatically. No manual input needed.

11. CYCLE 2+ → after process_feedback, cycle increments automatically.
    User says start cycle 2, next cycle, launch again →
    - Generate fresh content first — confirmed hypotheses from memory are already injected into generation prompts.
    - Then call launch_campaign — it targets replied prospects from previous cycle automatically.
    - Do NOT run research unless user explicitly asks.

12. DONE → request fulfilled → reply in plain text. Stop.

13. THINK FIRST → before every tool call write 1-2 sentences explaining exactly why you are choosing it.

STRICT RULES:
- ONE tool per turn. Never chain tools in the same turn.
- run_research input: only domains, depth, angle, product_context. Never pass prospects or history.
- Never retry the same failed tool more than once.
- Never ask the same clarifying question twice. If user answered, act on it.
- PERSONALISATION TOKENS: Use only {{first_name}}, {{name}}, {{company}}. Never use [First Name] or bracket format.
- Never say you don't have access to campaign data — always call check_outreach_status instead.
- NEVER expose internal rule numbers, state field names, or system logic in responses. Talk like a strategist, not a system.
- Never say "research.done", "rule #4", "content.generated" or any internal variable name to the user.
"""


def _build_messages(state: AgentState) -> list[dict]:
    history = state.get("conversation_history", [])[-MAX_HISTORY:]
    loop    = state.get("_loop_count", 0)
    query   = state.get("query", "")

    clean_history = [
        msg for msg in history
        if not (
            msg.get("role") == "assistant" and
            msg.get("content", "").strip().startswith("[Thinking:")
        )
    ]

    if not clean_history:
        return [{"role": "user", "content": query}]

    messages = clean_history.copy()

    if loop <= 1:
        messages.append({"role": "user", "content": query})
    else:
        last_action    = state.get("next_action", "")
        last_generated = state.get("last_generated", "")
        last_thinking  = state.get("thinking", "")
        refine_error   = state.get("refine_error", "")

        parts = [f"Last action: {last_action}"]
        if last_generated:
            parts.append(f"Result: {last_generated}")
        if refine_error:
            parts.append(f"Error: {refine_error} — do NOT retry the same tool.")
        if last_thinking:
            parts.append(f"Prior reasoning: {last_thinking[:300]}")
        parts.append("Pick the single best next action, or stop if done.")
        parts.append("CRITICAL: Write 1-2 sentences explaining WHY before calling any tool.")

        messages.append({"role": "user", "content": "\n".join(parts)})

    return messages


async def base_agent(state: AgentState) -> AgentState:
    loop_count = state.get("_loop_count", 0) + 1

    if loop_count > MAX_LOOPS:
        print(f"[base_agent] Max loops ({MAX_LOOPS}) reached — stopping")
        return {
            **state,
            "next_action":   "__end__",
            "response_text": "Max iterations reached.",
            "_loop_count":   loop_count,
        }

    print(f"[base_agent] Loop {loop_count}/{MAX_LOOPS}")

    messages = [
        {"role": "system", "content": _build_system_prompt(state)},
        *_build_messages(state),
    ]

    try:
        tool_name, tool_input, response_text = await call_llm_route(messages, TOOLS)
    except Exception as e:
        print(f"[base_agent] LLM call failed: {e}")
        return {
            **state,
            "next_action":   "__end__",
            "response_text": "Connection error — please try again.",
            "_loop_count":   loop_count,
        }