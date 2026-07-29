"""Test Scrapling session approach for Novel543 search."""
import asyncio
import re
import time


async def main():
    start = time.time()

    from scrapling.fetchers import StealthySession

    # Use a single persistent session — visit homepage first, then search
    print("Creating StealthySession...")
    session = StealthySession(
        headless=True,
        solve_cloudflare=True,
        network_idle=True,
        locale="zh-CN",
        timezone_id="Asia/Shanghai",
    )
    await session.start()
    print("Session started")

    # Step 1: Visit homepage to establish CF cookies
    print("\nStep 1: Visiting homepage...")
    home = await session.fetch('https://www.novel543.com/')
    home_html = getattr(home, 'html_content', '') or ''
    print(f"Homepage: status={home.status}, len={len(home_html)}")

    if '请稍候' in home_html or 'challenge-platform' in home_html:
        print("Homepage is a challenge page — waiting 8s...")
        await asyncio.sleep(8)
        # Re-fetch homepage
        home2 = await session.fetch('https://www.novel543.com/')
        home_html = getattr(home2, 'html_content', '') or ''
        print(f"Retry: status={home2.status}, len={len(home_html)}")

    # Check cookies
    ctx = session.context
    cookies = await ctx.cookies()
    print(f"Session cookies: {[(c['name'], c['value'][:20]) for c in cookies]}")

    # Step 2: Search in same session
    print("\nStep 2: Searching...")
    search = await session.fetch(
        'https://www.novel543.com/search/%E6%96%97%E7%BD%97%E5%A4%A7%E9%99%86'
    )
    search_html = getattr(search, 'html_content', '') or ''

    elapsed = time.time() - start
    print(f"Search: status={search.status}, len={len(search_html)}")

    if '请稍候' in search_html or 'challenge-platform' in search_html:
        print("STILL CHALLENGE PAGE on search!")
        # Maybe needs another wait
        print("Waiting 10s then retrying search...")
        await asyncio.sleep(10)
        search2 = await session.fetch(
            'https://www.novel543.com/search/%E6%96%97%E7%BD%97%E5%A4%A7%E9%99%86'
        )
        search_html = getattr(search2, 'html_content', '') or ''
        print(f"Retry search: status={search2.status}, len={len(search_html)}")
        
        if '请稍候' not in search_html and 'challenge-platform' not in search_html:
            print("GOT REAL CONTENT ON RETRY!")
            titles = re.findall(r'<h3[^>]*>\s*<a[^>]*>([^<]+)</a>', search_html)
            print(f"Titles: {titles[:10]}")
        else:
            print("Still challenge after retry")
    else:
        print("GOT REAL SEARCH RESULTS!")
        titles = re.findall(r'<h3[^>]*>\s*<a[^>]*>([^<]+)</a>', search_html)
        print(f"Titles: {titles[:10]}")

    print(f"\nTotal time: {elapsed:.1f}s")
    await session.close()


if __name__ == "__main__":
    asyncio.run(main())
