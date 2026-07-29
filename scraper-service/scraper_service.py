"""
Scrapling-based Scraper Service (Flask — synchronous, process-per-request)
======================================================================
Each request spawns a worker subprocess. Flask serves the API synchronously,
avoiding asyncio/eventloop conflicts with Scrapling's sync Playwright.

Start: python3 scraper_service.py
"""

import json
import re
import subprocess
import sys
import time
import logging
from pathlib import Path
from flask import Flask, request, jsonify

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SCRAPER_PORT = 8742
PYTHON_BIN = sys.executable

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("scraper-service")

app = Flask(__name__)

# Worker script
_WORKER_SCRIPT = Path(__file__).parent / "worker.py"

_WORKER_CODE = r'''"""Scrapling worker subprocess."""
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
'''


def _ensure_worker():
    if not _WORKER_SCRIPT.exists():
        _WORKER_SCRIPT.write_text(_WORKER_CODE)


def _run_worker(url, timeout=60, mode="scrape", max_retries=3):
    """Spawn worker subprocess, return parsed JSON."""
    payload = {"url": url, "timeout": timeout, "mode": mode, "max_retries": max_retries}
    log.info(f"Worker starting: {url}")

    proc = subprocess.run(
        [PYTHON_BIN, str(_WORKER_SCRIPT)],
        input=json.dumps(payload),
        capture_output=True,
        timeout=timeout * max_retries + 60,
        text=True,
    )

    if proc.stderr:
        for line in proc.stderr.strip().split("\n")[-5:]:
            if line.strip():
                log.info(f"Worker stderr: {line}")

    if proc.stdout:
        return json.loads(proc.stdout)
    return {"success": False, "status": 0, "url": url, "html": "", "time_ms": 0,
            "error": "Empty response"}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/health")
def health():
    return jsonify({"status": "ok", "uptime_s": time.time() - _start_time})


@app.route("/scrape", methods=["POST"])
def scrape():
    data = request.get_json(force=True)
    url = data.get("url")
    if not url:
        return jsonify({"success": False, "error": "URL is required"}), 400

    result = _run_worker(url, data.get("timeout", 60), "scrape", data.get("max_retries", 3))
    return jsonify(result)


@app.route("/scrape/search", methods=["POST"])
def scrape_search():
    data = request.get_json(force=True)
    url = data.get("url")
    if not url:
        return jsonify({"success": False, "error": "URL is required"}), 400

    result = _run_worker(url, data.get("timeout", 60), "search", data.get("max_retries", 3))
    return jsonify(result)


_start_time = time.time()


if __name__ == "__main__":
    _ensure_worker()
    log.info(f"Scraper service starting on port {SCRAPER_PORT}...")
    from waitress import serve
    serve(app, host="127.0.0.1", port=SCRAPER_PORT, threads=1)
