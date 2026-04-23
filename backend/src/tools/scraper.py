import json
from src.rag.signals import scrape_page

# ── Tool definitions — passed to LLM ─────────────────────────────────────
TOOLS = [
    {
        "type": "function",
        "function": {
            "name":        "scrape_url",
            "description": "Scrape any webpage and return clean markdown content",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type":        "string",
                        "description": "Full URL to scrape"
                    }
                },
                "required": ["url"]
            }
        }
    }
]


# ── Tool executor ─────────────────────────────────────────────────────────
async def execute_tool(tool_name: str, arguments: str) -> str:
    args = json.loads(arguments)

    if tool_name == "scrape_url":
        return await scrape_page(args["url"])

    return "Tool not found"