import json
from typing import List, Dict
 
from src.state.agent_state import AgentState
from src.core.llm import call_llm_json
from src.agents.generator.schemas import GeneratorOutput
from src.core.prompts import generator_system_prompt, generator_user_prompt
from src.agents.generator.image_gen import generate_flyer_image, generate_social_image


async def generator_agent(state: AgentState) -> AgentState:
    """
    Converts synthesis output into traceable campaign assets.
    Reads from AgentState fields that synthesis already populates.
    Writes drafted_variants back to state.
    """
    print("--- GENERATOR NODE: building campaign assets ---")
 
    # ── Guard: need synthesis output ─────────────────────────────────────
    summary = state.get("summary", "")
    if not summary or summary == "No domain findings available.":
        print("[generator] No synthesis output — skipping generation")
        return {**state, "drafted_variants": {}, "generation_error": "No research data"}
 
    # ── Pull everything from existing state fields ────────────────────────
    top_opportunities   = state.get("top_opportunities",   [])
    top_risks           = state.get("top_risks",           [])
    recommended_actions = state.get("recommended_actions", [])
    competitor_data     = state.get("competitor",          {})
    market_data         = state.get("market",              {})
    positioning_data    = state.get("positioning",         {})
 
    # ── Campaign-level context (new fields we add to state) ───────────────
    product_context = state.get("product_context", "the product")
    target_segment  = state.get("target_segment",  "B2B decision makers")
    cycle_number    = state.get("cycle_number",    1)
    cycle_memory    = state.get("cycle_memory",    [])
    query           = state.get("query",           "")
 
    # ── Build prompts ─────────────────────────────────────────────────────
    system_prompt = generator_system_prompt(cycle_memory)
    user_prompt   = generator_user_prompt(
        query=query,
        summary=summary,
        top_opportunities=top_opportunities,
        top_risks=top_risks,
        recommended_actions=recommended_actions,
        competitor_data=competitor_data,
        market_data=market_data,
        positioning_data=positioning_data,
        product_context=product_context,
        target_segment=target_segment,
        cycle_number=cycle_number,
    )
 
    # ── Call LLM with structured output ──────────────────────────────────
    print(f"[generator] Calling LLM — cycle {cycle_number}, memory entries: {len(cycle_memory)}")
    raw = await call_llm_json([
        {"role": "system",  "content": system_prompt},
        {"role": "user",    "content": user_prompt},
    ])
 
    # ── Validate with Pydantic ────────────────────────────────────────────
    try:
        output = GeneratorOutput(**raw)
        print(f"[generator] Validated: {len(output.variants)} variants, "
              f"{len(output.social_posts)} posts, {len(output.artifacts)} artifacts")
    except Exception as e:
        print(f"[generator] Pydantic validation failed: {e}")
        print(f"[generator] Raw output: {json.dumps(raw, indent=2)[:500]}")
        return {
            **state,
            "drafted_variants": raw,
            "generation_error": f"Validation failed: {str(e)}",
        }
 
    # ── Enrich artifacts with images (non-blocking) ───────────────────────
    output_dict = output.model_dump()
    output_dict = await _attach_images(output_dict)
 
    print("[generator] Done — variants ready for frontend")
    return {
        **state,
        "drafted_variants": output_dict,
        "generation_error": None,
    }
 
 
async def _attach_images(output_dict: dict) -> dict:
    """
    Attempt to generate images for Flyer artifacts and social posts.
    Never raises — always returns output_dict even if image generation fails.
    """
    # Flyer images
    for artifact in output_dict.get("artifacts", []):
        if artifact.get("artifact_type") == "Flyer":
            props = artifact.get("component_props", {})
            image_url = await generate_flyer_image(props)
            if image_url:
                artifact["component_props"]["image_url"] = image_url
 
    # Social post images (only first post to keep demo fast)
    posts = output_dict.get("social_posts", [])
    if posts:
        image_url = await generate_social_image(posts[0])
        if image_url:
            posts[0]["image_url"] = image_url
 
    return output_dict
