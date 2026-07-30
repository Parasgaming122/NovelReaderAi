"""Scrapling worker subprocess."""
import json, re, sys, time

def _is_challenge(html):
    m = re.search(r"<title>([^<]+)</title>", html)
    if m:
        t = m.group(1)
        if any(x in t for x in ["请稍候", "Just a moment", "Attention Required"]):
            return True
    return False

def main():
    data = json.load(sys.stdin)
    url = data["url"]
    timeout = data.get("timeout", 60)
    mode = data.get("mode", "scrape")
    max_retries = data.get("max_retries", 3)

    start = time.time()
    html, status, final_url = "", 0, url
    search_results = []

    from scrapling.fetchers import StealthyFetcher, Fetcher

    for attempt in range(1, max_retries + 1):
        try:
            page = StealthyFetcher.fetch(
                url,
                timeout=timeout * 1000,
                headless=True,
                solve_cloudflare=True,
                network_idle=True,
                locale="zh-CN",
                timezone_id="Asia/Shanghai",
            )
            html = getattr(page, "html_content", "") or ""
            status = page.status
            final_url = page.url

            if not _is_challenge(html):
                break
            sys.stderr.write(f"Attempt {attempt}: challenge page, retrying...\n")
            sys.stderr.flush()
            if attempt < max_retries:
                time.sleep(2 * attempt)
        except Exception as e:
            sys.stderr.write(f"Attempt {attempt} error: {e}\n")
            sys.stderr.flush()
            if attempt < max_retries:
                time.sleep(2 * attempt)

    elapsed = time.time() - start

    # Parse search results if mode=search
    if mode == "search" and not _is_challenge(html):
        base_m = re.match(r"(https?://[^/]+)", url)
        base_url = base_m.group(1) if base_m else url

        if "novel543.com" in url:
            try:
                for item in page.css("ul.list li.media"):
                    try:
                        te = item.css("div.media-content h3 a").first
                        title = te.text() if te else ""
                        href = te.attrib.get("href", "") if te else ""
                        ce = item.css("div.media-left img").first
                        cover = ce.attrib.get("src", "") if ce else ""
                        if title and href:
                            if href.startswith("/"): href = base_url + href
                            elif href.startswith("//"): href = "https:" + href
                            if cover.startswith("/"): cover = base_url + cover
                            elif cover.startswith("//"): cover = "https:" + cover
                            search_results.append({"title": title.strip(), "url": href, "cover": cover, "source_id": "novel543"})
                    except: continue
            except:
                # Regex fallback
                for mm in re.finditer(r'<li\s+class="media"[^>]*>(.*?)</li>', html, re.DOTALL | re.I):
                    block = mm.group(1)
                    tm = re.search(r'<h3[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]+)</a>', block)
                    cm = re.search(r'class="media-left"[^>]*>.*?<img[^>]*src="([^"]*)"', block, re.DOTALL)
                    if tm:
                        href, title = tm.group(1).strip(), tm.group(2).strip()
                        cover = cm.group(1).strip() if cm else ""
                        if href.startswith("/"): href = base_url + href
                        if title:
                            search_results.append({"title": title, "url": href, "cover": cover, "source_id": "novel543"})

    json.dump({"success": True, "status": status, "url": final_url, "html": html,
               "time_ms": elapsed * 1000, "search_results": search_results}, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
