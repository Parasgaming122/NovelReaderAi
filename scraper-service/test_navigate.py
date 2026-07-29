"""Test: navigate to search WITHIN an active browser session (like a real user)."""
import asyncio
import re
import time

from patchright.async_api import async_playwright


async def main():
    start = time.time()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1366, 'height': 768},
            locale='zh-CN',
            timezone_id='Asia/Shanghai',
        )

        # Anti-detection
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
            window.chrome = { runtime: {} };
        """)

        page = await context.new_page()

        # Step 1: Visit homepage (this works)
        print("Step 1: Visit homepage...")
        await page.goto('https://www.novel543.com/', wait_until='domcontentloaded', timeout=30000)
        
        # Wait for page to settle
        await asyncio.sleep(3)
        
        title1 = await page.title()
        print(f"Homepage title: {title1}")
        
        # Check if we got past CF
        if '请稍候' in title1:
            print("Homepage still shows CF challenge, waiting longer...")
            for i in range(30):
                await asyncio.sleep(1)
                title1 = await page.title()
                if '请稍候' not in title1 and title1:
                    print(f"CF resolved at {i}s! Title: {title1}")
                    break
            else:
                print("CF NOT resolved on homepage")
        
        # Step 2: Use page.evaluate to navigate via JS (sets proper referer)
        print("\nStep 2: Navigate to search via window.location...")
        await page.evaluate('window.location.href = "/search/斗罗大陆"')
        
        # Wait for new page to load
        await asyncio.sleep(5)
        
        # Check status
        title2 = await page.title()
        url = page.url
        print(f"After navigation: title={title2}, url={url}")
        
        # Wait for CF to resolve on search page
        for i in range(45):
            title2 = await page.title()
            if title2 and '请稍候' not in title2 and 'moment' not in title2.lower() and len(title2) > 3:
                print(f"Search page resolved at {i}s! Title: {title2}")
                break
            await asyncio.sleep(1)
        else:
            print(f"Search page still showing challenge after 45s. Title: {title2}")
        
        await asyncio.sleep(2)
        
        html = await page.content()
        elapsed = time.time() - start
        
        print(f"\nFinal: len={len(html)}, time={elapsed:.1f}s")
        
        if '请稍候' not in html and '斗罗' in html:
            print("SUCCESS! Got real search results!")
            titles = re.findall(r'<h3[^>]*>\s*<a[^>]*>([^<]+)</a>', html)
            print(f"Found {len(titles)} titles: {titles[:10]}")
        elif '请稍候' in html:
            print("Still challenge page")
        else:
            print("Got something else")
            print(html[:1000])
        
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
