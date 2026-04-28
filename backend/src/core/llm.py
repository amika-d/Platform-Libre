# src/core/llm.py
import json
import os
import re
import base64
from litellm import acompletion, completion_cost
from redis.credentials import logger
from src.core.config import settings
import litellm
import logging
logger = logging.getLogger(__name__)

litellm.suppress_debug_info = True
litellm.set_verbose = False
os.environ["LITELLM_LOG"] = "ERROR"

_cost_tracker = {"total_queries": 0, "total_cost_usd": 0.0}


def get_cost_stats() -> dict:
    queries = max(_cost_tracker["total_queries"], 1)
    return {
        "total_queries":  _cost_tracker["total_queries"],
        "total_cost_usd": round(_cost_tracker["total_cost_usd"], 6),
        "avg_per_query":  round(_cost_tracker["total_cost_usd"] / queries, 6),
    }


def _track_cost(response):
    try:
        _cost_tracker["total_cost_usd"] += completion_cost(completion_response=response)
        _cost_tracker["total_queries"]  += 1
    except Exception:
        pass


def _extract_json(raw: str) -> dict:
    if not raw or not raw.strip():
        raise ValueError("LLM returned empty response")

    clean = raw.strip()

    if "```" in clean:
        fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", clean)
        if fence_match:
            clean = fence_match.group(1).strip()

    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        pass
    first = clean.find("{")
    last  = clean.rfind("}")
    if first != -1 and last > first:
        candidate = clean[first:last + 1]
        try:
            if candidate.count("{") != candidate.count("}"):
                raise ValueError(
                    f"JSON truncated — brace mismatch "
                    f"(open={candidate.count('{')}, close={candidate.count('}')}). "
                    f"Increase MAX_TOKENS. Raw length: {len(raw)} chars."
                )
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass
    raise ValueError(f"Could not extract valid JSON from response. Raw length: {len(raw)} chars.")

def _sanitize_unicode(text: str) -> str:
    return text.encode('utf-16', 'surrogatepass').decode('utf-16', 'ignore')

async def _complete(
    messages: list[dict],
    tools: list[dict] = None,
    tool_choice: str = None,
    max_tokens: int = None,
    model: str = None,
) -> any:
    kwargs = dict(
        model=model or settings.LLM_MODEL,
        messages=messages,
        max_tokens=max_tokens or settings.MAX_TOKENS,
        temperature=settings.TEMPERATURE,
        api_key=settings.OPENROUTER_API_KEY,
        api_base="https://openrouter.ai/api/v1",
        
    )
    if tools:
        kwargs["tools"] = tools
    if tool_choice:
        kwargs["tool_choice"] = tool_choice

    response = await acompletion(**kwargs)
    _track_cost(response)
    return response


async def call_llm(
    messages: list[dict],
    max_tokens: int = None,
    model: str = None,
) -> str:
    response = await _complete(messages, max_tokens=max_tokens, model=model)
    content = response.choices[0].message.content
    if not content:
        raise ValueError("LLM returned None content")
    return _sanitize_unicode(content)


async def call_llm_json(messages, max_tokens=None, model=None) -> dict:
    raw = await call_llm(messages, max_tokens, model=model)
    logger.debug(f"[call_llm_json] Raw preview: {raw[:200]}")
    try:
        result = _extract_json(raw)
        logger.debug(f"[call_llm_json] Parsed keys: {list(result.keys())}")
        return result
    except ValueError as e:
        logger.error(f"[call_llm_json] JSON parse failed: {e}")
        raise


async def call_llm_route(
    messages: list[dict],
    tools: list[dict],
    max_tokens: int = None,
    model: str = None,
) -> tuple[str | None, dict, str, str]:
    """
    Returns: (tool_name, tool_args, thinking, response_text)
    thinking is only populated for reasoning models (DeepSeek R1).
    For V3 and others, thinking will be empty string.
    """
    response = await _complete(
        messages,
        tools=tools,
        tool_choice="auto",
        max_tokens=max_tokens,
        model=model,
    )
    msg = response.choices[0].message

    
    response_text = getattr(msg, "content", None) or ""

    if not getattr(msg, "tool_calls", None):
        return None, {}, response_text

    tool_call = msg.tool_calls[0]
    try:
        tool_args = json.loads(tool_call.function.arguments)
    except Exception:
        tool_args = {}

    return tool_call.function.name, tool_args,response_text


async def call_llm_vision(
    screenshot_bytes: bytes,
    prompt: str,
    max_tokens: int = 512,
    model: str = None,
) -> str:
    b64 = base64.b64encode(screenshot_bytes).decode("utf-8")
    messages = [{
        "role": "user",
        "content": [
            {"type": "image_url",
             "image_url": {"url": f"data:image/png;base64,{b64}"}},
            {"type": "text", "text": prompt},
        ]
    }]
    response = await _complete(
        messages,
        max_tokens=max_tokens,
        model=model or settings.VISION_MODEL,
    )
    return response.choices[0].message.content or ""