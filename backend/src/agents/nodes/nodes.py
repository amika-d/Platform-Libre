"""
nodes.py — all generation nodes in one file for clarity.
Individual nodes for flexible variant generation (1-3 of each asset type).

Note: These nodes output raw dictionaries (not Pydantic models).
See schemas.py for type definitions and legacy monolithic generator_agent.
See prompts.py for the system/user prompts each node uses.

Node output structure:
- email_sequence:  {"variants": [{"id": "A", "angle": "...", "hypothesis": "...", "touch_1": {...}, ...}]}
- linkedin_posts:  {"posts": [{"id": "A", "angle": "...", "hook": "...", "body": "...", ...}]}
- battle_card:     {"signal_reference": "...", "us_label": "...", "them_label": "...", ...}
- flyer:           {"headline": "...", "subheadline": "...", "bullet_points": [...], ...}

Each node respects variant_count from tool_input (1-3).

Storage convention:
- Active key:   "email_sequence" / "linkedin_sequence"          ← always the latest
- History key:  "email_sequence_cycle_N" / "linkedin_sequence_cycle_N"  ← never overwritten
"""
import asyncio
import json
from tavily import AsyncTavilyClient
from src.state.agent_state import AgentState
from src.core.llm import call_llm_json
from src.agents.generator.image_gen import generate_flyer_image, generate_social_image
from src.core.config import settings

import logging
logger = logging.getLogger(__name__)

from src.db.outreach import insert_prospect, get_campaign_stats, get_variant_stats, get_replied_prospects
from src.workers.email.producer import push_email_job
from src.workers.email.personaliser import personalise_touch


# ── 1. The Chat Node ──────────────────────────────────────────────────────────
async def direct_response_node(state: AgentState) -> AgentState:
    """Handles standard conversational chat without background action."""
    print("--- NODE: direct_response ---")
    tool_input = state.get("tool_input", {})
    message = tool_input.get("message", "I am ready to help.")
    
    return {
        **state,
        "response_text": message,
    }


# ── 2. The Prospecting Node ───────────────────────────────────────────────────
async def find_prospects_node(state: AgentState) -> AgentState:
    print("--- NODE: find_prospects ---")
    tool_input = state.get("tool_input", {})
    segment = tool_input.get("segment", state.get("target_segment", "B2B decision makers"))
    
    client = AsyncTavilyClient(api_key=settings.TAVILY_API_KEY)
    query = f'site:linkedin.com/in "{segment}"'
    
    try:
        results = await client.search(query=query, max_results=15, search_depth="basic")
    except Exception as e:
        return {**state, "response_text": f"Search failed: {e}"}

    raw_urls = [{"url": r["url"], "name": r.get("title", "").split("-")[0].strip()} 
                for r in results.get("results", []) if "linkedin.com/in/" in r["url"]]

    prospects = [{"name": r["name"], "linkedin_url": r["url"]} for r in raw_urls][:10]

    return {
        **state,
        "target_segment": segment,
        "pending_prospects": prospects,
        "requires_human_approval": True,
        "next_action": "wait_for_prospect_approval",
        "response_text": f"I found {len(prospects)} matching profiles. Please review and approve them before we generate the copy."
    }


# ── 3. The Breakpoint Dummy Node ──────────────────────────────────────────────
async def wait_for_prospect_approval_node(state: AgentState) -> AgentState:
    """Graph pauses BEFORE this node. It runs immediately when the human approves via the API."""
    print("--- NODE: wait_for_prospect_approval (Resumed!) ---")
    return {
        **state,
        "response_text": "Targets approved. I'll now generate the campaign assets based on our strategy."
    }


# ── 4. Check Outreach Status Node ─────────────────────────────────────────────
async def check_outreach_status_node(state: AgentState) -> AgentState:
    print("--- NODE: check_outreach_status ---")
    campaign_id = state.get("campaign_id", "")

    if not campaign_id:
        return {**state, "response_text": "No campaign ID in state — cannot fetch status."}

    try:
        stats = await get_campaign_stats(campaign_id)
    except Exception as e:
        return {**state, "response_text": f"Failed to fetch campaign stats: {e}"}

    if not stats:
        return {**state, "response_text": "No outreach data found for this campaign yet."}

    total   = sum(stats.values())
    queued  = stats.get("queued",  0)
    sent    = stats.get("sent",    0)
    opened  = stats.get("opened",  0)
    replied = stats.get("replied", 0)
    errors  = stats.get("error",   0)

    open_rate  = round((opened  / sent * 100), 1) if sent else 0
    reply_rate = round((replied / sent * 100), 1) if sent else 0

    variant_stats = await get_variant_stats(campaign_id, cycle=state.get("cycle_number", 1) - 1 or 1)

    summary = (
        f"Campaign `{campaign_id}` — Cycle {state.get('cycle_number',1)} | {total} prospects\n"
        f"  Sent: {sent} | Opened: {opened} | Replied: {replied} | Errors: {errors}\n"
        f"  Open rate: {open_rate}% | Reply rate: {reply_rate}%\n"
    )
    for variant, vs in variant_stats.items():
        summary += (
            f"  Variant {variant}: sent={vs['sent']} opened={vs['opened']} "
            f"replied={vs['replied']} reply_rate={vs['reply_rate']}%\n"
        )
    return {**state, "response_text": summary}


# ── Shared helpers ────────────────────────────────────────────────────────────

def _research_context(state: AgentState) -> str:
    """Pull relevant research from state into a string for prompts."""
    parts = []
    if state.get("summary"):
        parts.append(f"SUMMARY:\n{state['summary']}")
    opps = state.get("top_opportunities", [])
    if opps:
        parts.append("OPPORTUNITIES:\n" + "\n".join(f"- {o}" for o in opps))
    risks = state.get("top_risks", [])
    if risks:
        parts.append("RISKS:\n" + "\n".join(f"- {r}" for r in risks))
    comp = state.get("competitor", {})
    if comp.get("findings"):
        parts.append(f"COMPETITOR DATA:\n{comp['findings']}")
    return "\n\n".join(parts) if parts else "No research data available."


def _memory_constraints(state: AgentState) -> str:
    confirmed = state.get("confirmed_hypotheses", [])
    failed    = state.get("failed_angles", [])
    lines = []
    if confirmed:
        lines.append("BUILD ON THESE (confirmed true):")
        lines.extend(f"  ✓ {h}" for h in confirmed)
    if failed:
        lines.append("NEVER USE THESE (confirmed failed):")
        lines.extend(f"  ✗ {a}" for a in failed)
    return "\n".join(lines) if lines else ""


def _get_variant_count(state: AgentState) -> int:
    """Extract variant count from tool_input, default to 2."""
    tool_input = state.get("tool_input", {})
    count = tool_input.get("variant_count", 2)
    return max(1, min(3, int(count)))


# ── Email sequence node ───────────────────────────────────────────────────────

async def generate_email_node(state: AgentState) -> AgentState:
    print("--- NODE: generate_email_sequence ---")
    
    variant_count = _get_variant_count(state)
    tool_input    = state.get("tool_input", {})
    angle         = tool_input.get("angle", "")
    
    research  = _research_context(state)
    memory    = _memory_constraints(state)
    query     = state.get("query", "")
    product   = state.get("product_context", "the product")
    segment   = state.get("target_segment", "B2B decision makers")
    cycle     = state.get("cycle_number", 1)

    try:
        result = await call_llm_json([
            {
                "role": "system",
                "content": f"""You are an elite B2B cold email copywriter.
Generate exactly {variant_count} email {'variant' if variant_count == 1 else 'variants'} as a 3-touch sequence.
Each variant tests a DIFFERENT hypothesis based on distinct research signals.
If research is provided, ground your claims in it. If no research is available, write high-converting copy based on best practices for the target segment.
{memory}

PERSONALISATION TOKENS: Use ONLY {{first_name}}, {{name}}, {{company}}. Never use [First Name] or any bracket format.

Output JSON:
{{
  "variants": [
    {{
      "id": "A",
      "angle": "string",
      "hypothesis": "specific testable hypothesis",
      "signal_reference": "VERBATIM quote from research, or 'General Knowledge' if none provided",
      "touch_1": {{"subject": "...", "body": "...", "cta": "..."}},
      "touch_2": {{"subject": "...", "body": "...", "cta": "..."}},
      "touch_3": {{"subject": "...", "body": "...", "cta": "..."}}
    }}
  ]
}}"""
            },
            {
                "role": "user",
                "content": (
                    f"User's exact request: '{query}'\n"
                    f"Product: {product}\n"
                    f"Target Segment: {segment}\n"
                    f"Cycle: {cycle}\n"
                    f"Requested angle: {angle or 'use strongest signal from research'}\n"
                    f"Generate {variant_count} {'variant' if variant_count == 1 else 'variants'}:\n\n"
                    f"Research:\n{research}"
                )
            }
        ])
    except ValueError as e:
        print(f"[generate_email_node] Parse failed: {e}")
        return {
            **state,
            "refine_error": f"Email sequence generation failed: {e}",
            "last_generated": "",
        }

    if not result.get("variants"):
        return {
            **state,
            "refine_error": "Email sequence generation returned no variants — try again.",
            "last_generated": "",
        }

    current      = state.get("drafted_variants", {})
    variant_list = result.get("variants", [])
    summary = "\n".join(
        f"Variant {v.get('id')}: {v.get('angle','')} — \"{v.get('touch_1',{}).get('subject','')}\"" 
        for v in variant_list
    )
    return {
        **state,
        "drafted_variants": {
            **current,
            f"email_sequence_cycle_{cycle}": result,  # immutable history
            "email_sequence": result,                  # current active
        },
        "last_generated":   "email_sequence",
        "response_text":    f"Email sequence ready — {len(variant_list)} variants generated:\n{summary}",
    }


# ── LinkedIn post node ────────────────────────────────────────────────────────

async def generate_linkedin_node(state: AgentState) -> AgentState:
    print("--- NODE: generate_linkedin_post ---")
    
    variant_count = _get_variant_count(state)
    tool_input    = state.get("tool_input", {})
    angle         = tool_input.get("angle", "")
    fmt           = tool_input.get("format", "insight_post")
    
    research  = _research_context(state)
    memory    = _memory_constraints(state)
    query     = state.get("query", "")
    product   = state.get("product_context", "the product")
    segment   = state.get("target_segment", "B2B decision makers")

    try:
        result = await call_llm_json([
            {
                "role": "system",
                "content": f"""You are a B2B LinkedIn content strategist.
Generate exactly {variant_count} LinkedIn {'post' if variant_count == 1 else 'posts'} that stop the scroll.
Format: {fmt}
Each post must test a DIFFERENT angle/hypothesis based on distinct research signals.
If research is provided, ground your claims in it. If no research is available, write high-converting copy based on best practices for the target segment.
{memory}

Output JSON:
{{
  "posts": [
    {{
      "id": "A",
      "angle": "string (different angle/framing)",
      "hypothesis": "what this post tests",
      "signal_reference": "VERBATIM quote from research, or 'General Knowledge' if none provided",
      "hook": "first line — must stop scroll",
      "body": "main content — max 150 words",
      "cta": "closing call to action",
      "hashtags": ["tag1", "tag2", "tag3"],
      "image_prompt": "detailed FAL.ai prompt (dark B2B aesthetic, no text)"
    }}
  ]
}}"""
            },
            {
                "role": "user",
                "content": (
                    f"User's exact request: '{query}'\n"
                    f"Product: {product}\n"
                    f"Segment: {segment}\n"
                    f"Angle preference: {angle or 'strongest signals from research'}\n"
                    f"Generate {variant_count} {'post' if variant_count == 1 else 'posts'} with different angles:\n\n"
                    f"Research:\n{research}"
                )
            }
        ])
    except ValueError as e:
        print(f"[generate_linkedin_node] Parse failed: {e}")
        return {
            **state,
            "refine_error": f"LinkedIn post generation failed: {e}",
            "last_generated": "",
        }

    if not result.get("posts"):
        return {
            **state,
            "refine_error": "LinkedIn post generation returned no posts — try again.",
            "last_generated": "",
        }

    posts = result.get("posts", [])
    for post in posts:
        try:
            image_url = await generate_social_image(post)
            if image_url:
                post["image_url"] = image_url
        except Exception as e:
            print(f"[linkedin_node] Image gen failed for post {post.get('id')}: {e}")

    # LinkedIn posts are not cycle-keyed (they're one-shot content, not A/B sequences)
    current = state.get("drafted_variants", {})
    return {
        **state,
        "drafted_variants": {**current, "linkedin_posts": result},
        "last_generated":   "linkedin_posts",
    }


# ── Battle card node ──────────────────────────────────────────────────────────

async def generate_battle_card_node(state: AgentState) -> AgentState:
    print("--- NODE: generate_battle_card ---")
    
    tool_input = state.get("tool_input", {})
    competitor = tool_input.get("competitor", "primary competitor")
    
    research = _research_context(state)
    memory   = _memory_constraints(state)
    query    = state.get("query", "")
    product  = state.get("product_context", "the product")

    try:
        result = await call_llm_json([
            {
                "role": "system",
                "content": f"""You are creating a battle card comparison.
If research is provided, ground your comparison in it. If no research is available, make a highly plausible competitive comparison based on standard industry knowledge.
{memory}

Output JSON:
{{
  "signal_reference": "VERBATIM research finding that justified this comparison, or 'General Knowledge' if none",
  "us_label": "string (our product name)",
  "them_label": "string (competitor name)",
  "us_points": ["3-4 specific advantages grounded in research"],
  "them_points": ["3-4 specific weaknesses found in research/reviews"],
  "gap_statement": "one sentence — the unoccupied positioning gap",
  "key_differentiator": "the single most important difference we own"
}}"""
            },
            {
                "role": "user",
                "content": (
                    f"User's exact request: '{query}'\n"
                    f"Our Product: {product}\n"
                    f"Competitor: {competitor}\n\n"
                    f"Research:\n{research}"
                )
            }
        ])
    except ValueError as e:
        print(f"[generate_battle_card_node] Parse failed: {e}")
        return {
            **state,
            "refine_error": f"Battle card generation failed: {e}",
            "last_generated": "",
        }

    current = state.get("drafted_variants", {})
    return {
        **state,
        "drafted_variants": {**current, "battle_card": result},
        "last_generated":   "battle_card",
    }


# ── Flyer node ────────────────────────────────────────────────────────────────

async def generate_flyer_node(state: AgentState) -> AgentState:
    print("--- NODE: generate_flyer ---")
    
    tool_input = state.get("tool_input", {})
    fmt        = tool_input.get("format", "comparison_flyer")
    
    research = _research_context(state)
    memory   = _memory_constraints(state)
    query    = state.get("query", "")
    product  = state.get("product_context", "the product")
    segment  = state.get("target_segment", "decision makers")

    try:
        result = await call_llm_json([
            {
                "role": "system",
                "content": f"""You are generating a {fmt} layout.
If research is provided, ground your copy in it. If no research is available, write high-converting copy based on best practices for the target segment.
{memory}

Output JSON:
{{
  "signal_reference": "VERBATIM research finding driving this flyer, or 'General Knowledge' if none",
  "headline": "bold headline — max 8 words",
  "subheadline": "supporting line — max 15 words",
  "bullet_points": ["3-4 specific value points from research"],
  "social_proof": "stat or finding from research",
  "cta": "clear call to action",
  "image_prompt": "detailed FAL.ai prompt — dark B2B aesthetic, no text overlays"
}}"""
            },
            {
                "role": "user",
                "content": (
                    f"User's exact request: '{query}'\n"
                    f"Product: {product}\n"
                    f"Audience: {segment}\n\n"
                    f"Research:\n{research}"
                )
            }
        ])
    except ValueError as e:
        print(f"[generate_flyer_node] Parse failed: {e}")
        return {
            **state,
            "refine_error": f"Flyer generation failed: {e}",
            "last_generated": "",
        }

    image_url = None
    try:
        image_url = await generate_flyer_image(result)
    except Exception as e:
        print(f"[flyer_node] Image gen failed: {e}")

    if image_url:
        result["image_url"] = image_url

    current = state.get("drafted_variants", {})
    return {
        **state,
        "drafted_variants": {**current, "flyer": result},
        "last_generated":   "flyer",
    }


# ── Email + LinkedIn outreach node ────────────────────────────────────────────

async def generate_email_and_linkedin_node(state: AgentState) -> AgentState:
    print("--- NODE: generate_email_and_linkedin_outreach ---")
    variant_count = _get_variant_count(state)
    tool_input    = state.get("tool_input", {})
    angle         = tool_input.get("angle", "")
    
    research  = _research_context(state)
    memory    = _memory_constraints(state)
    query     = state.get("query", "")
    product   = state.get("product_context", "the product")
    segment   = state.get("target_segment", "B2B decision makers")
    cycle     = state.get("cycle_number", 1)

    try:
        result = await call_llm_json([
            {
                "role": "system",
                "content": f"""You are an elite B2B cold outreach copywriter.
Generate exactly {variant_count} sequence {'variant' if variant_count == 1 else 'variants'}.
Each variant must include BOTH a multi-touch email sequence AND a single LinkedIn DM outreach message.
{memory}

PERSONALISATION TOKENS: Use ONLY {{first_name}}, {{name}}, {{company}}. Never use [First Name] or any bracket format.

Output JSON:
{{
  "variants": [
    {{
      "id": "A",
      "angle": "string",
      "hypothesis": "specific testable hypothesis",
      "touch_1": {{"subject": "...", "body": "...", "cta": "..."}},
      "touch_2": {{"subject": "...", "body": "...", "cta": "..."}},
      "touch_3": {{"subject": "...", "body": "...", "cta": "..."}},
      "linkedin_dm": {{"body": "..."}}
    }}
  ]
}}"""
            },
            {
                "role": "user",
                "content": (
                    f"User's exact request: '{query}'\n"
                    f"Product: {product}\n"
                    f"Target Segment: {segment}\n"
                    f"Cycle: {cycle}\n"
                    f"Requested angle: {angle or 'use strongest signal from research'}\n"
                    f"Generate {variant_count} {'variant' if variant_count == 1 else 'variants'}:\n\n"
                    f"Research:\n{research}"
                )
            }
        ])
    except ValueError as e:
        print(f"[generate_email_and_linkedin_node] Parse failed: {e}")
        return {
            **state,
            "refine_error": f"Email+LinkedIn sequence generation failed: {e}",
            "last_generated": "",
        }

    if not result.get("variants"):
        return {
            **state,
            "refine_error": "Email+LinkedIn sequence generation returned no variants — try again.",
            "last_generated": "",
        }

    current      = state.get("drafted_variants", {})
    variant_list = result.get("variants", [])
    summary = "\n".join(
        f"Variant {v.get('id')}: {v.get('angle','')} — \"{v.get('touch_1',{}).get('subject','')}\"" 
        for v in variant_list
    )
    return {
        **state,
        "drafted_variants": {
            **current,
            f"email_sequence_cycle_{cycle}": result,     # immutable history
            "email_sequence": result,                     # current active
            f"linkedin_sequence_cycle_{cycle}": result,  # immutable history
            "linkedin_sequence": result,                  # current active
        },
        "last_generated":   "email_and_linkedin_sequence",
        "response_text":    f"Email and LinkedIn sequences ready — {len(variant_list)} variants generated:\n{summary}",
    }


# ── LinkedIn outreach node (DM) ───────────────────────────────────────────────

async def generate_linkedin_outreach_node(state: AgentState) -> AgentState:
    print("--- NODE: generate_linkedin_outreach ---")
    variant_count = _get_variant_count(state)
    tool_input    = state.get("tool_input", {})
    angle         = tool_input.get("angle", "")
    
    research  = _research_context(state)
    memory    = _memory_constraints(state)
    query     = state.get("query", "")
    product   = state.get("product_context", "the product")
    segment   = state.get("target_segment", "B2B decision makers")
    cycle     = state.get("cycle_number", 1)

    try:
        result = await call_llm_json([
            {
                "role": "system",
                "content": f"""You are an elite B2B cold outreach copywriter.
Generate exactly {variant_count} LinkedIn DM outreach {'variant' if variant_count == 1 else 'variants'}.
{memory}

PERSONALISATION TOKENS: Use ONLY {{first_name}}, {{name}}, {{company}}. Never use [First Name] or any bracket format.

Output JSON:
{{
  "variants": [
    {{
      "id": "A",
      "angle": "string",
      "hypothesis": "specific testable hypothesis",
      "linkedin_dm": {{"body": "..."}}
    }}
  ]
}}"""
            },
            {
                "role": "user",
                "content": (
                    f"User's exact request: '{query}'\n"
                    f"Product: {product}\n"
                    f"Target Segment: {segment}\n"
                    f"Cycle: {cycle}\n"
                    f"Requested angle: {angle or 'use strongest signal from research'}\n"
                    f"Generate {variant_count} {'variant' if variant_count == 1 else 'variants'}:\n\n"
                    f"Research:\n{research}"
                )
            }
        ])
    except ValueError as e:
        print(f"[generate_linkedin_outreach_node] Parse failed: {e}")
        return {
            **state,
            "refine_error": f"LinkedIn outreach generation failed: {e}",
            "last_generated": "",
        }

    if not result.get("variants"):
        return {
            **state,
            "refine_error": "LinkedIn outreach generation returned no variants — try again.",
            "last_generated": "",
        }

    current      = state.get("drafted_variants", {})
    variant_list = result.get("variants", [])
    summary = "\n".join(
        f"Variant {v.get('id')}: {v.get('angle','')} — \"{str(v.get('linkedin_dm', {}).get('body', ''))[:60]}...\"" 
        for v in variant_list
    )
    return {
        **state,
        "drafted_variants": {
            **current,
            f"linkedin_sequence_cycle_{cycle}": result,  # immutable history
            "linkedin_sequence": result,                  # current active
        },
        "last_generated":   "linkedin_sequence",
        "response_text":    f"LinkedIn outreach ready — {len(variant_list)} variants generated:\n{summary}",
    }


# ── Generate all node ─────────────────────────────────────────────────────────

async def generate_all_node(state: AgentState) -> AgentState:
    results = await asyncio.gather(
        generate_email_node(state),
        generate_linkedin_node(state),
        generate_battle_card_node(state),
        generate_flyer_node(state),
    )
    merged = {**state}
    for r in results:
        merged["drafted_variants"] = {
            **merged.get("drafted_variants", {}),
            **r.get("drafted_variants", {}),
        }
    return {**merged, "last_generated": "all"}


# ── Refine node ───────────────────────────────────────────────────────────────

async def refine_node(state: AgentState) -> AgentState:
    print("--- NODE: refine_output ---")
    tool_input   = state.get("tool_input", {})
    target       = tool_input.get("target", "all")  # email_sequence, linkedin_posts, battle_card, flyer
    instruction  = tool_input.get("instruction", "")
    current      = state.get("drafted_variants", {})

    if not current:
        return {**state, "refine_error": "Nothing generated yet to refine."}

    target_content = current.get(target) or current.get("email_sequence") or current

    try:
        result = await call_llm_json([
            {
                "role": "system",
                "content": """You are refining existing marketing content.
Apply the instruction surgically — change only what was asked.
Keep signal_reference fields intact and verbatim.
Return the exact same JSON structure as input."""
            },
            {
                "role": "user",
                "content": (
                    f"Instruction: {instruction}\n\n"
                    f"Current content:\n{json.dumps(target_content, indent=2)}"
                )
            }
        ])
    except ValueError as e:
        print(f"[refine_node] Parse failed for {target}: {e}")
        return {
            **state,
            "refine_error": f"Content refinement failed: {e}",
        }

    updated = {**current}
    if target in current:
        updated[target] = result
    else:
        updated = {**current, **result}

    return {
        **state,
        "drafted_variants": updated,
        "last_generated":   target,
        "last_refined":     instruction,
    }


async def update_state_node(state: AgentState) -> AgentState:
    """
    Dedicated node for state mutation and maintenance.
    Runs after tool execution to ensure clean state transitions.
    Note: _loop_count is managed by base_agent, not here.
    """
    loop_count = state.get("_loop_count", 0)
    history = state.get("conversation_history", []).copy()

    history = [
        msg for msg in history
        if not (
            msg.get("role") == "assistant" and
            "[Thinking:" in msg.get("content", "")
        )
    ]
    query = state.get("query", "")
    if query and not any(m.get("content") == query for m in history):
        history.append({"role": "user", "content": query})

    action = state.get("next_action", "unknown")
    text   = state.get("response_text", "")

    if text and action != "__end__":
        if not history or history[-1].get("content") != text:
            history.append({"role": "assistant", "content": text})
        
        history.append({
            "role": "user",
            "content": f"SYSTEM NOTIFICATION: The '{action}' tool executed successfully. Summarize results or advise next step."
        })
    elif text:
        if not history or history[-1].get("content") != text:
            history.append({"role": "assistant", "content": text})

    if len(history) > 15:
        history = history[-15:]

    print(f"🔄 [update_state] Loop: {loop_count} | History: {len(history)}")

    updated = {"conversation_history": history}

    query = state.get("query", "")
    if (
        not state.get("summary") and
        not state.get("user_provided_research") and
        len(query) > 200
    ):
        updated["user_provided_research"] = query
        updated["summary"] = query

    return updated

async def process_feedback_node(state: AgentState) -> AgentState:
    print("--- NODE: process_feedback ---")
    campaign_id = state.get("campaign_id", "")
    variants    = state.get("drafted_variants", {})
    segment     = state.get("target_segment", "unknown")
    cycle       = state.get("cycle_number", 1)

    from src.db.outreach import get_variant_stats
    try:
        variant_stats = await get_variant_stats(campaign_id, cycle=cycle)
    except Exception as e:
        print(f"[feedback_node] DB fetch failed: {e}")
        variant_stats = {}

    metrics_a = variant_stats.get("A", {})
    metrics_b = variant_stats.get("B", {})

    tool_input = state.get("tool_input", {})
    if not metrics_a:
        metrics_a = tool_input.get("variant_a_metrics", {})
    if not metrics_b:
        metrics_b = tool_input.get("variant_b_metrics", {})

    winner = tool_input.get("winner", "")
    if not winner and metrics_a and metrics_b:
        if metrics_a.get("reply_rate", 0) >= metrics_b.get("reply_rate", 0):
            winner = "A"
        else:
            winner = "B"

    result = await call_llm_json([
        {
            "role": "system",
            "content": """Analyse A/B test results and extract one confirmed learning.
Output JSON:
{
  "hypothesis": "one sentence — what is now confirmed true",
  "confirmed": true,
  "segment": "who this applies to",
  "failed_angle": "the angle that lost — empty string if both performed equally",
  "best_channel": "email or linkedin",
  "confidence": "high or medium",
  "rule_for_next_cycle": "CONSTRAINT: what generator must do differently next cycle"
}"""
        },
        {
            "role": "user",
            "content": (
                f"Segment: {segment} | Cycle: {cycle} | Winner: {winner}\n"
                f"Variant A metrics: {json.dumps(metrics_a)}\n"
                f"Variant B metrics: {json.dumps(metrics_b)}\n"
                f"Variants tested: {json.dumps(variants.get('email_sequence', {}).get('variants', []))}"
            )
        }
    ])

    from src.db.hypotheses import save_hypothesis
    try:
        await save_hypothesis({
            "campaign_id":          campaign_id,
            "cycle_number":         cycle,
            "variant_a_open_rate":  metrics_a.get("open_rate",  0),
            "variant_a_reply_rate": metrics_a.get("reply_rate", 0),
            "variant_a_meetings":   metrics_a.get("meetings",   0),
            "variant_b_open_rate":  metrics_b.get("open_rate",  0),
            "variant_b_reply_rate": metrics_b.get("reply_rate", 0),
            "variant_b_meetings":   metrics_b.get("meetings",   0),
            "winner":               winner,
            **result,
        })
    except Exception as e:
        print(f"[feedback_node] save_hypothesis failed: {e}")

    current_memory = state.get("cycle_memory", [])
    current_memory.append({"cycle_number": cycle, **result})

    confirmed = [m["hypothesis"]    for m in current_memory if m.get("confirmed")]
    failed    = [m.get("failed_angle", "") for m in current_memory
                 if m.get("failed_angle") and not m.get("confirmed")]

    return {
        **state,
        "cycle_memory":         current_memory,
        "confirmed_hypotheses": confirmed,
        "failed_angles":        [f for f in failed if f],
        "cycle_number":         cycle + 1,
        "feedback_result":      result,
        "response_text": (
            f"Cycle {cycle} complete. Winner: Variant {winner}.\n"
            f"Confirmed: {result.get('hypothesis', '')}\n"
            f"Rule for cycle {cycle + 1}: {result.get('rule_for_next_cycle', '')}"
        ),
    }
    
    
    
async def competitive_map_node(state: AgentState) -> AgentState:
    print("--- NODE: competitive_map ---")
    cmap = state.get("competitive_map", {})
    
    # If no competitive map, provide a fallback so the card still renders
    if not cmap or not cmap.get("competitors"):
        cmap = {
            "competitors": [
                {"x": 0.3, "y": 0.4, "label": "Competitor A", "color": "#FF6B6B"},
                {"x": 0.6, "y": 0.7, "label": "Competitor B", "color": "#4ECDC4"},
                {"x": 0.8, "y": 0.2, "label": "Competitor C", "color": "#95E1D3"},
            ],
            "your_position": {
                "x": 0.85,
                "y": 0.75,
                "label": "Vector Agents",
                "color": "#00FF88"
            }
        }
        response_msg = "Showing competitive landscape (sample data). Run research first for real market intelligence."
    else:
        response_msg = "Here is the competitive map data for the frontend to render."
    
    return {
        "response_text": response_msg,
        "competitive_map": cmap,
        "drafted_variants": {
            "competitive_map": cmap
        },
        "next_action": "__end__",
        "_loop_count": state.get("_loop_count", 0) + 1
    }
    
async def show_asset_node(state: AgentState) -> AgentState:
    print("--- NODE: show_asset ---")
    tool_input = state.get("tool_input", {})
    asset_key  = tool_input.get("asset_key", "email_sequence")
    
    return {
        **state,
        "last_generated": asset_key,
        "response_text": f"Sure, here are the {asset_key.replace('_', ' ')} variants again."
    }