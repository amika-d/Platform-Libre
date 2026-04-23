# tests/debug_voyager.py — replace entire file with this
import asyncio, json
from playwright.async_api import async_playwright

SESSION_FILE = "cookies/linkedin_cookies.json"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=[
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
        ])
        context = await browser.new_context(
            storage_state=SESSION_FILE,
            user_agent=USER_AGENT,
        )
        page = await context.new_page()

        captured = []

        async def handle_response(response):
            url = response.url
            if "voyager/api/messaging" in url and response.status == 200:
                try:
                    body = await response.json()
                    captured.append({"url": url, "body": body})
                    print(f"\n✓ Captured: {url[:100]}")
                except Exception:
                    pass

        page.on("response", handle_response)

        print("Loading /messaging ...")
        await page.goto("https://www.linkedin.com/messaging/", wait_until="domcontentloaded")
        await page.wait_for_timeout(6000)

        print(f"\nTotal Voyager calls captured: {len(captured)}")

        for item in captured:
            print(f"\n{'='*60}")
            print("URL:", item["url"][:120])
            included = item["body"].get("included", [])
            elements = item["body"].get("elements", [])
            print(f"included: {len(included)}  elements: {len(elements)}")

            # Print unique $types
            types = list({e.get("$type", "NO_TYPE") for e in included})
            print("$types found:", types)

            # Print first 2 of each type
            seen = {}
            for e in included:
                t = e.get("$type", "")
                if t not in seen:
                    seen[t] = 0
                if seen[t] < 2:
                    print(f"\n  [{t}] sample:")
                    print(json.dumps(e, indent=2)[:800])
                    seen[t] += 1

        # Save full dump to file for inspection
        with open("voyager_dump.json", "w") as f:
            json.dump(captured, f, indent=2)
        print("\nFull dump saved to voyager_dump.json")

        await browser.close()

asyncio.run(main())