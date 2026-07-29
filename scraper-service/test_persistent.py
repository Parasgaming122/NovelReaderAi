"""Test persistent session approach — simulate real user navigation."""
import time
import re
import sys

from scrapling.fetchers import StealthyFetcher, Fetcher


def test_persistent_session():
    """Try fetching search multiple times rapidly — CF may rate-limit per session."""
    start = time.time()

    # First, get cookies from homepage (this works)
    print("=== Step 1: Get homepage cookies ===")
    home = StealthyFetcher.fetch(
        'https://www.novel543.com/',
        timeout=30000,
        headless=True,
        solve_cloudflare=True,
        network_idle=True,
        locale="zh-CN",
        timezone_id="Asia/Shanghai",
    )
    home_html = getattr(home, 'html_content', '') or ''
    print(f"Homepage: status={home.status}, len={len(home_html)}")

    cookies = getattr(home, 'cookies', None) or []
    print(f"Cookies: {[c.get('name') for c in cookies]}")

    # Build cookie dict for next request
    cookie_dict = {c['name']: c['value'] for c in cookies}
    cookie_str = '; '.join([f"{k}={v}" for k, v in cookie_dict.items()])

    # Try plain HTTP with the cookies + a real browser UA
    print("\n=== Step 2: HTTP fetch search with homepage cookies ===")
    fetcher = Fetcher(
        impersonate='chrome131',
        stealthy_headers=True,
    )

    # The key insight: include the cf_clearance AND set proper referer
    extra_headers = {
        'Cookie': cookie_str,
        'Referer': 'https://www.novel543.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    }

    try:
        resp = fetcher.get(
            'https://www.novel543.com/search/%E6%96%97%E7%BD%97%E5%A4%A7%E9%99%86',
            extra_headers=extra_headers,
        )
        html = getattr(resp, 'html', '') or str(resp)
        print(f"HTTP Status: {resp.status}")
        print(f"HTML length: {len(html)}")

        title_m = re.search(r'<title>([^<]+)</title>', html)
        title = title_m.group(1) if title_m else 'N/A'
        print(f"Title: {title}")

        if '请稍候' in title:
            print("Still challenge page")
            # Print the CF headers
            headers = getattr(resp, 'headers', None)
            if headers:
                server = headers.get('server', 'N/A')
                cf_ray = headers.get('cf-ray', 'N/A')
                print(f"Server: {server}, CF-Ray: {cf_ray}")
        else:
            print("REAL CONTENT!")
            titles = re.findall(r'<h3[^>]*>\s*<a[^>]*>([^<]+)</a>', html)
            print(f"Titles: {titles[:10]}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

    print(f"\nTotal time: {time.time()-start:.1f}s")


if __name__ == "__main__":
    test_persistent_session()
