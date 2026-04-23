import httpx
from src.rag.signals import _dedupe_results, google_search, search_hn, _get_httpx_client
from src.core.config import settings
import asyncio

# ─────────────────────────────────────────────
# EXISTING SOURCE: Alpha Vantage
# ─────────────────────────────────────────────

async def alpha_vantage_search(query: str) -> list[dict]:
    """Financial news & sentiment from Alpha Vantage (PESTEL: Economic)."""
    api_key = settings.ALPHA_VANTAGE_API_KEY
    if not api_key:
        print("⚠️  [Alpha Vantage] Skipping: No API key in .env")
        return []
    if api_key == "demo":
        print("⚠️  [Alpha Vantage] Using 'demo' key — results will be limited.")

    words = [w for w in query.split() if w.isalpha() and len(w) > 2]
    keyword = words[-1] if words else "tech"
    print(f"🔍 [Alpha Vantage] Symbol search for: '{keyword}'")

    try:
        client = _get_httpx_client()
        search_resp = await client.get(
            "https://www.alphavantage.co/query",
            params={"function": "SYMBOL_SEARCH", "keywords": keyword, "apikey": api_key}
        )
        search_data = search_resp.json()
        if "Information" in search_data or "Note" in search_data:
            print(f"⚠️  [Alpha Vantage] API limit: {search_data}")
            return []

        best_matches = search_data.get("bestMatches", [])
        if not best_matches or not best_matches[0].get("1. symbol"):
            print(f"⚠️  [Alpha Vantage] No symbol for '{keyword}'. Falling back to general market news.")
            news_resp = await client.get(
                "https://www.alphavantage.co/query",
                params={"function": "NEWS_SENTIMENT", "topics": "technology,financial_markets", "apikey": api_key, "limit": 5}
            )
            symbol_label = "General Market"
        else:
            symbol = best_matches[0]["1. symbol"]
            print(f"📈 [Alpha Vantage] Found '{symbol}'. Fetching sentiment…")
            news_resp = await client.get(
                "https://www.alphavantage.co/query",
                params={"function": "NEWS_SENTIMENT", "tickers": symbol, "apikey": api_key, "limit": 5}
            )
            symbol_label = symbol

            feed = news_resp.json().get("feed", [])
            results = [
                {
                    "url": item.get("url", ""),
                    "title": f"[{symbol_label}] " + item.get("title", ""),
                    "content": item.get("summary", ""),
                    "source": "alpha_vantage",
                    "signal_type": "economic",
                }
                for item in feed
            ]
            print(f"📊 [Alpha Vantage] {len(results)} items for {symbol_label}")
            return results
    except Exception as e:
        print(f"❌ [Alpha Vantage] Error: {e}")
        return []

# ─────────────────────────────────────────────
# NEW SOURCE 1: Competitor Ads & Content
# ─────────────────────────────────────────────

async def search_competitor_content(query: str) -> list[dict]:
    print(f"🎯 [Competitor Content] Searching ad copy & landing pages for: '{query}'")
    ad_queries = [
        f"{query} site:g2.com OR site:capterra.com reviews",
        f'"{query}" pricing features "get started" OR "free trial" OR "demo"',
        f"{query} competitor comparison \"vs\" OR \"alternative\"",
    ]
    tasks = [google_search(q) for q in ad_queries]
    all_hits = await asyncio.gather(*tasks)
    results = []
    for hits in all_hits:
        for r in hits:
            r["source"] = "competitor_content"
            r["signal_type"] = "competitive"
        results += hits
    print(f"📣 [Competitor Content] {len(results)} signals found")
    return results

# ─────────────────────────────────────────────
# NEW SOURCE 2: Audience Forums & Communities
# ─────────────────────────────────────────────

async def search_audience_forums(query: str) -> list[dict]:
    print(f"💬 [Audience Forums] Mining communities for: '{query}'")
    forum_queries = [
        f"site:reddit.com {query} frustrated OR struggling OR \"doesn't work\" OR \"switched from\"",
        f"site:reddit.com {query} recommend OR \"best tool\" OR \"which is better\"",
        f"site:quora.com {query} problem OR challenge OR advice",
        f"site:reddit.com {query} pricing OR expensive OR \"worth it\" OR \"too cheap\"",
    ]
    tasks = [google_search(q) for q in forum_queries]
    tasks.append(search_hn(f"{query} problems customer pain"))
    all_hits = await asyncio.gather(*tasks)
    
    results = []
    for index, hits in enumerate(all_hits):
        for r in hits:
            r["source"] = "audience_forums"
            r["signal_type"] = "social"
        results += hits
    print(f"🗣️  [Audience Forums] {len(results)} community signals found")
    return results

# ─────────────────────────────────────────────
# NEW SOURCE 3: Job Postings Intelligence
# ─────────────────────────────────────────────

async def search_job_postings(query: str) -> list[dict]:
    print(f"💼 [Job Postings] Scanning hiring signals for: '{query}'")
    job_queries = [
        f"site:linkedin.com/jobs {query} \"head of\" OR \"director of\" marketing OR growth OR sales",
        f"site:greenhouse.io OR site:lever.co {query} marketing OR growth OR demand generation",
        f"{query} startup hiring \"growth marketer\" OR \"performance marketing\" OR \"content strategist\" 2025 OR 2026",
        f"{query} company \"we are hiring\" OR \"join our team\" marketing OR GTM",
    ]
    tasks = [google_search(q) for q in job_queries]
    all_hits = await asyncio.gather(*tasks)
    results = []
    for hits in all_hits:
        for r in hits:
            r["source"] = "job_postings"
            r["signal_type"] = "organizational"
        results += hits
    print(f"📋 [Job Postings] {len(results)} hiring signals found")
    return results

# ─────────────────────────────────────────────
# NEW SOURCE 4: Funding & Investment Activity
# ─────────────────────────────────────────────

async def search_funding_activity(query: str) -> list[dict]:
    print(f"💰 [Funding Activity] Tracking capital flows for: '{query}'")
    funding_queries = [
        f"{query} startup funding \"Series A\" OR \"Series B\" OR \"seed round\" 2025 OR 2026",
        f"site:techcrunch.com {query} funding OR raises OR investment",
        f"site:crunchbase.com {query} funding",
        f"{query} venture capital investment \"fintech\" OR \"saas\" OR \"startup\" announcement",
        f"{query} acquired OR merger OR \"strategic partnership\" 2025 OR 2026",
    ]
    tasks = [google_search(q) for q in funding_queries]
    all_hits = await asyncio.gather(*tasks)
    results = []
    for hits in all_hits:
        for r in hits:
            r["source"] = "funding_activity"
            r["signal_type"] = "economic"
        results += hits
    print(f"🏦 [Funding Activity] {len(results)} investment signals found")
    return results

# ─────────────────────────────────────────────
# NEW SOURCE 5: Search Trends & SEO Signals
# ─────────────────────────────────────────────

async def search_trend_signals(query: str) -> list[dict]:
    print(f"📈 [Search Trends] Mapping demand signals for: '{query}'")
    trend_queries = [
        f"{query} \"growing demand\" OR \"increasing adoption\" OR \"market growth\" 2025 OR 2026",
        f"{query} trending OR \"on the rise\" OR \"emerging\" marketing strategy",
        f"site:semrush.com OR site:ahrefs.com {query} keyword trends OR traffic",
        f"{query} \"search volume\" OR \"keyword difficulty\" OR \"SEO\" competitive",
        f"what is {query} OR \"{query} meaning\" OR \"{query} explained\"",
    ]
    tasks = [google_search(q) for q in trend_queries]
    all_hits = await asyncio.gather(*tasks)
    results = []
    for hits in all_hits:
        for r in hits:
            r["source"] = "search_trends"
            r["signal_type"] = "demand"
        results += hits
    print(f"🔎 [Search Trends] {len(results)} demand signals found")
    return results

# ─────────────────────────────────────────────
# NEW SOURCE 6: Campaign Engagement & Social Proof
# ─────────────────────────────────────────────

async def search_campaign_engagement(query: str) -> list[dict]:
    print(f"📣 [Campaign Engagement] Finding high-performing content for: '{query}'")
    campaign_queries = [
        f"{query} marketing campaign \"went viral\" OR \"case study\" OR \"results\" 2025 OR 2026",
        f"site:twitter.com OR site:x.com {query} campaign OR launch OR announcement engagement",
        f"{query} \"content marketing\" OR \"thought leadership\" winning strategy",
        f"{query} award OR \"best campaign\" OR \"marketing excellence\" OR recognition",
        f"{query} influencer partnership OR \"creator economy\" OR \"ambassador\" campaign",
    ]
    tasks = [google_search(q) for q in campaign_queries]
    all_hits = await asyncio.gather(*tasks)
    results = []
    for hits in all_hits:
        for r in hits:
            r["source"] = "campaign_engagement"
            r["signal_type"] = "social_performance"
        results += hits
    print(f"🏆 [Campaign Engagement] {len(results)} engagement signals found")
    return results

# ─────────────────────────────────────────────
# MASTER ORCHESTRATOR
# ─────────────────────────────────────────────

async def search_market(query: str, skip_alpha_vantage: bool = False) -> list[dict]:
    tasks = [
        google_search(f"{query} market trends, regulatory changes, and economic outlook 2026"),
        search_competitor_content(query),
        search_audience_forums(query),
        search_job_postings(query),
        search_funding_activity(query),
        search_trend_signals(query),
        search_campaign_engagement(query),
    ]
    if not skip_alpha_vantage:
        tasks.append(alpha_vantage_search(query))
        
    results_nested = await asyncio.gather(*tasks, return_exceptions=True)
    flat: list[dict] = []
    for batch in results_nested:
        if isinstance(batch, Exception):
            print(f"⚠️  Task Failed: {batch}")
            continue
        flat.extend(batch)
        
    deduped = _dedupe_results(flat)

    source_counts: dict[str, int] = {}
    for r in deduped:
        src = r.get("source", "unknown")
        source_counts[src] = source_counts.get(src, 0) + 1

    print(f"📡 [search_market] {len(deduped)} deduplicated signals | breakdown: {source_counts}")
    return deduped