# src/rag/signals.py
import asyncio
import httpx
from firecrawl import AsyncFirecrawl
from tavily import AsyncTavilyClient
from src.core.config import settings

_httpx_client: httpx.AsyncClient | None = None
_tavily_client: AsyncTavilyClient | None = None
_firecrawl_client: AsyncFirecrawl | None = None

_firecrawl_semaphore = asyncio.Semaphore(3)

def _get_httpx_client() -> httpx.AsyncClient:
    global _httpx_client
    if _httpx_client is None:
        _httpx_client = httpx.AsyncClient(timeout=10)
    return _httpx_client

def _get_tavily_client() -> AsyncTavilyClient:
    global _tavily_client
    if _tavily_client is None:
        _tavily_client = AsyncTavilyClient(api_key=settings.TAVILY_API_KEY)
    return _tavily_client

def _get_firecrawl_client() -> AsyncFirecrawl:
    global _firecrawl_client
    if _firecrawl_client is None:
        _firecrawl_client = AsyncFirecrawl(api_key=settings.FIRECRAWL_API_KEY)
    return _firecrawl_client

async def close_rag_clients():
    global _httpx_client
    if _httpx_client:
        await _httpx_client.aclose()
        _httpx_client = None

def _normalize_result(url, title, content, source):
    return {"url": url, "title": title, "content": content, "source": source}

def _dedupe_results(results: list[dict]) -> list[dict]:
    seen: set[str] = set()
    deduped = []
    for item in results:
        url = item.get("url", "").strip().lower()
        if not url or url in seen:
            continue
        seen.add(url)
        deduped.append(item)
    return deduped

async def google_search(query: str, max_results: int = 5) -> list[dict]:
    try:
        client = _get_tavily_client()
        results = await client.search(query, max_results=max_results)
        return [
            _normalize_result(
                url=r.get("url", ""),
                title=r.get("title", ""),
                content=r.get("content", ""),
                source="google",
            )
            for r in results.get("results", [])
        ]
    except Exception:
        return await _ddg_fallback(query=query, max_results=max_results)

async def _ddg_fallback(query: str, max_results: int = 5) -> list[dict]:
    try:
        # DDGS is sync — run in thread pool to avoid blocking event loop
        results = await asyncio.to_thread(
            lambda: list(__import__("ddgs").DDGS(timeout=5).text(query, max_results=max_results))
        )
        return [
            _normalize_result(
                url=r.get("href", ""),
                title=r.get("title", ""),
                content=r.get("body", ""),
                source="google_fallback",
            )
            for r in results
        ]
    except Exception:
        return []

async def search_hn(query: str, max_results: int = 5) -> list[dict]:
    try:
        client = _get_httpx_client()
        resp = await client.get(
            "https://hn.algolia.com/api/v1/search",
            params={"query": query, "hitsPerPage": max_results},
        )
        hits = resp.json().get("hits", [])
        return [
            _normalize_result(
                url=f"https://news.ycombinator.com/item?id={h.get('objectID', '')}",
                title=h.get("title", "") or h.get("story_title", ""),
                content=h.get("story_text", "") or h.get("comment_text", ""),
                source="hackernews",
            )
            for h in hits
        ]
    except Exception:
        return []

async def search_reddit(query: str, max_results: int = 5) -> list[dict]:
    try:
        client = _get_httpx_client()
        resp = await client.get(
            "https://www.reddit.com/search.json",
            params={"q": query, "limit": max_results, "sort": "relevance"},
            headers={"User-Agent": "platform-libre/1.0"},
        )
        posts = resp.json().get("data", {}).get("children", [])
        return [
            _normalize_result(
                url=f"https://reddit.com{p['data'].get('permalink', '')}",
                title=p["data"].get("title", ""),
                content=p["data"].get("selftext", ""),
                source="reddit",
            )
            for p in posts
        ]
    except Exception:
        return []

async def scrape_page(url: str, max_chars: int = 2000) -> str:
    try:
        app = _get_firecrawl_client()
        async with _firecrawl_semaphore:
            result = await app.scrape_url(url, params={"formats": ["markdown"]})
        return (result.get("markdown") or "")[:max_chars]
    except Exception:
        return ""

async def _firecrawl_from_results(results: list[dict], top_n: int = 2) -> list[dict]:
    urls = [r.get("url", "") for r in results[:top_n] if r.get("url")]
    scraped = await asyncio.gather(*[scrape_page(url) for url in urls])
    return [
        _normalize_result(
            url=results[i].get("url", ""),
            title=results[i].get("title", ""),
            content=scraped[i],
            source="firecrawl",
        )
        for i in range(len(urls))
    ]

async def search_pricing(query: str) -> list[dict]:
    pricing_candidates, google_results, reddit_results = await asyncio.gather(
        google_search(f"{query} pricing page", max_results=1),
        google_search(f"{query} pricing too expensive complaints"),
        search_reddit(f"{query} pricing worth it"),
    )
    firecrawl_results = await _firecrawl_from_results(pricing_candidates, top_n=1)
    return _dedupe_results(firecrawl_results + google_results + reddit_results)

async def search_adjacent(query: str) -> list[dict]:
    results_list = await asyncio.gather(
        google_search(f"{query} new entrants funding 2025"),
        search_hn(f"{query} disruption show hn"),
        google_search(f"alternatives to {query} AI native 2025"),
    )
    combined = [r for results in results_list for r in results]
    return _dedupe_results(combined)

async def web_search(query: str, max_results: int = 5) -> list[dict]:
    return await google_search(query, max_results=max_results)

async def pricing_search(competitor: str) -> list[dict]:
    return await search_pricing(competitor)

async def adjacent_threat_search(company: str) -> list[dict]:
    return await search_adjacent(company)