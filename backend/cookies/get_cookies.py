import asyncio
from playwright.async_api import async_playwright

SESSION_FILE = "cookies/linkedin_cookies.json" # Must match what the worker looks for!

async def main():
    async with async_playwright() as p:
        print("🚀 Launching Chrome in stealth mode...")
        browser = await p.chromium.launch(
            headless=False,
            channel="chrome",  
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-infobars"
            ]
        )
        
        # Use a standard desktop User-Agent
        context =  await p.chromium.launch_persistent_context(
    user_data_dir="./chrome_profile",  # saves like real Chrome
    headless=False,
    args=["--disable-blink-features=AutomationControlled"],
)
        
        page = await context.new_page()

        # --- THE STEALTH INJECTIONS ---
        await page.add_init_script("""
            // Pass the Webdriver Test.
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            // Pass the Chrome Test.
            window.navigator.chrome = {
                runtime: {},
            };
            // Pass the Plugins Test.
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
            // Pass the Languages Test.
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
        """)

        print("Opening LinkedIn — Please log in manually.")
        
        # Go to the login page
        await page.goto("https://www.linkedin.com/login")

        # Pause execution until you press Enter in the terminal
        input("✅ Logged in completely? Press ENTER to save session...")

        # Playwright's native way to save both Cookies and LocalStorage safely
        await context.storage_state(path=SESSION_FILE)

        print(f"🎉 Session saved securely to {SESSION_FILE}")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())