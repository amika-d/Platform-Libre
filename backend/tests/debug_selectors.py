"""
Run this FIRST before fixing the worker.
It opens the LinkedIn profile and prints every button's attributes
so we know the exact selectors to use.

Run: uv run debug_selectors.py
"""
from playwright.sync_api import sync_playwright
import json

TARGET = "https://www.linkedin.com/in/pamali-rodrigo-42a181209"
SESSION_FILE = "cookies/linkedin_cookies.json"

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=False,
        channel="chrome",
        args=["--disable-blink-features=AutomationControlled",
              "--disable-infobars"],
    )
    context = browser.new_context(
        storage_state=SESSION_FILE,
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        ),
    )
    page = context.new_page()
    page.goto(TARGET, wait_until="domcontentloaded")
    page.wait_for_timeout(4000)
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(1000)

    print("\n" + "="*60)
    print("ALL VISIBLE BUTTONS ON PAGE")
    print("="*60)

    buttons = page.locator("button").all()
    for i, btn in enumerate(buttons):
        try:
            visible = btn.is_visible()
            if not visible:
                continue
            aria  = btn.get_attribute("aria-label") or ""
            text  = btn.inner_text().strip().replace("\n", " ")[:50]
            cls   = btn.get_attribute("class") or ""
            print(f"\n[Button {i}]")
            print(f"  aria-label : {repr(aria)}")
            print(f"  inner_text : {repr(text)}")
            print(f"  class      : {cls[:80]}")
        except Exception as e:
            print(f"[Button {i}] error: {e}")

    print("\n" + "="*60)
    print("PROFILE ACTIONS SECTION HTML")
    print("="*60)

    # Try to grab the actions area HTML
    for selector in [
        "div.pvs-profile-actions",
        "div.pv-top-card-v2-ctas",
        "div.ph5 div.flex",
        "section.pv-top-card",
    ]:
        try:
            el = page.locator(selector).first
            if el.is_visible(timeout=1000):
                html = el.inner_html()
                print(f"\nSelector: {selector}")
                print(html[:1500])
                break
        except Exception:
            continue

    print("\n" + "="*60)
    print("FULL PAGE TITLE + URL")
    print("="*60)
    print(f"URL:   {page.url}")
    print(f"Title: {page.title()}")

    input("\nDone. Press Enter to close browser...")
    browser.close()