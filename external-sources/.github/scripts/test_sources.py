#!/usr/bin/env python3
"""
Source Testing Script for GitHub Workflow
Tests all Chinese novel sources and outputs results to JSON
"""

import requests
from bs4 import BeautifulSoup
import re
import json
import sys
import time
from datetime import datetime

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Cache-Control': 'no-cache'
}

# Source definitions - same as comprehensive tester
SOURCES = {
    "ixdzs": {"name": "爱下电子书", "base_url": "https://ixdzs8.com/", "catalog": "https://ixdzs8.com/sort/1/", "search": "https://ixdzs8.com/bsearch?q=", "cf": True, "enc": "utf-8"},
    "powanjuan": {"name": "破万卷", "base_url": "https://www.powanjuan.cc/", "catalog": "https://www.powanjuan.cc/newest/", "search": "https://www.powanjuan.cc/e/search/index.php?keyboard=", "cf": True, "enc": "gb2312"},
    "ddxss": {"name": "顶点小说", "base_url": "https://www.ddxss.cc/", "catalog": "https://www.ddxss.cc/sort/1/", "search": None, "cf": True, "enc": "gbk"},
    "shw5": {"name": "书香万卷", "base_url": "https://www.shw5.cc/", "catalog": "https://www.shw5.cc/sort/1/", "search": "https://www.shw5.cc/search.php?q=", "cf": False, "enc": "utf-8"},
    "soxs": {"name": "搜小说网", "status": "DEAD"},
    "trxs": {"name": "天人小说", "base_url": "https://trxs.cc/", "catalog": "https://trxs.cc/sort/1/", "search": "https://trxs.cc/search.php?q=", "cf": True, "enc": "utf-8"},
    "biquge5200": {"name": "笔趣阁5200", "status": "UNREACHABLE"},
    "wanben": {"name": "万本TXT", "base_url": "https://www.10000txt.com/", "catalog": "https://www.10000txt.com/sort/1/", "search": "https://www.10000txt.com/search.php?q=", "cf": False, "enc": "utf-8"},
    "biqugecompany": {"name": "笔趣阁Company", "base_url": "https://www.biquge.company/", "catalog": "https://www.biquge.company/sort/1/", "search": "https://www.biquge.company/search.php?q=", "cf": False, "enc": "utf-8"},
    "rayforboe": {"name": "顶级看书网", "base_url": "https://www.rayforboe.com/", "catalog": "https://www.rayforboe.com/novel/1/", "search": "https://www.rayforboe.com/search?q=", "cf": False, "enc": "utf-8"},
    "haodoo": {"name": "好读", "base_url": "https://www.haodoo.net/", "catalog": "https://www.haodoo.net/book/1/", "search": "https://www.haodoo.net/search?q=", "cf": True, "enc": "utf-8"},
    "snapd": {"name": "SnapD小说", "base_url": "https://m.snapd.net/", "catalog": "https://m.snapd.net/", "search": "https://m.snapd.net/search.php?q=", "cf": False, "enc": "utf-8"},
    "ttkan": {"name": "TTKan", "base_url": "https://www.ttkan.co/", "catalog": "https://www.ttkan.co/novel/rank", "search": "https://www.ttkan.co/novel/search?q=", "cf": True, "enc": "utf-8"}
}

def test_source(sid, cfg):
    """Test a single source and return results dict"""
    result = {
        "id": sid,
        "name": cfg.get("name", sid),
        "accessible": False,
        "catalog_ok": False,
        "catalog_count": 0,
        "search_ok": None,
        "search_count": 0,
        "has_cf": cfg.get("cf", False),
        "status": cfg.get("status", "ACTIVE"),
        "errors": [],
        "warnings": []
    }
    
    # Check if marked as dead/unreachable
    if cfg.get("status") in ["DEAD", "UNREACHABLE"]:
        result["warnings"].append(f"Source marked as {cfg['status']}")
        return result
    
    # Test accessibility
    try:
        r = requests.get(cfg["base_url"], headers=HEADERS, timeout=15)
        
        if r.ok:
            result["accessible"] = True
            
            # Check for protection
            cf_words = ['cloudflare', 'challenge', 'just a moment', '验证']
            found = [w for w in cf_words if w in r.text.lower()]
            if found and not cfg.get("cf"):
                result["warnings"].append(f"Unexpected protection: {found}")
            
            # Test catalog
            catalog_url = cfg.get("catalog")
            if catalog_url:
                try:
                    cr = requests.get(catalog_url, headers=HEADERS, timeout=15)
                    enc = cfg.get("enc", "utf-8")
                    cr.encoding = enc
                    
                    if cr.ok and len(cr.content) > 500:
                        soup = BeautifulSoup(cr.text, 'html.parser')
                        links = soup.find_all('a', href=re.compile(r'/\d+\.html|/book/|/read/|/novel/'))
                        
                        books = []
                        for l in links:
                            t = l.get_text(strip=True)
                            h = l.get('href', '')
                            if t and len(t) > 2 and h and h not in [b.get('url') for b in books]:
                                books.append({'url': h})
                        
                        result["catalog_ok"] = len(books) > 0
                        result["catalog_count"] = len(books)
                    else:
                        result["errors"].append(f"Catalog HTTP {cr.status_code}")
                except Exception as e:
                    result["errors"].append(f"Catalog error: {str(e)[:50]}")
            
            # Test search
            search_tpl = cfg.get("search")
            if search_tpl:
                try:
                    from urllib.parse import quote
                    sr = requests.get(search_tpl + quote("斗破苍穹"), headers=HEADERS, timeout=15)
                    enc = cfg.get("enc", "utf-8")
                    sr.encoding = enc
                    
                    if sr.ok and len(sr.content) > 300:
                        soup = BeautifulSoup(sr.text, 'html.parser')
                        results = soup.find_all('a', href=re.compile(r'/\d+\.html|/book/|/read/'))
                        result["search_ok"] = len(results) > 0
                        result["search_count"] = len(results)
                    else:
                        result["search_ok"] = False
                except Exception as e:
                    result["search_ok"] = False
                    result["errors"].append(f"Search error: {str(e)[:50]}")
                    
        else:
            result["errors"].append(f"HTTP {r.status_code}")
            
    except requests.exceptions.Timeout:
        result["errors"].append("Connection timeout")
    except requests.exceptions.ConnectionError as e:
        result["errors"].append(f"Connection error: {str(e)[:50]}")
    except Exception as e:
        result["errors"].append(f"Error: {str(e)[:50]}")
    
    return result

def main():
    print("=" * 60)
    print(f"SOURCE TESTING - {datetime.now().isoformat()}")
    print("=" * 60)
    
    results = {}
    failed_sources = []
    
    for sid, cfg in SOURCES.items():
        print(f"\nTesting {sid} ({cfg.get('name', sid)})...")
        result = test_source(sid, cfg)
        results[sid] = result
        
        status = "✅ PASS" if (result["accessible"] and result["catalog_ok"]) else \
                 "⚠️ PARTIAL" if result["accessible"] else \
                 "❌ FAIL"
        
        print(f"  {status}: Access={result['accessible']}, Catalog={result['catalog_count']} items")
        
        if result["errors"]:
            failed_sources.append(sid)
            for err in result["errors"]:
                print(f"  ❌ Error: {err}")
        
        time.sleep(0.3)  # Rate limiting
    
    # Save results
    output_file = "test-results.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total_sources": len(SOURCES),
            "accessible": sum(1 for r in results.values() if r["accessible"]),
            "catalog_working": sum(1 for r in results.values() if r["catalog_ok"]),
            "failed_sources": failed_sources,
            "results": results
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'='*60}")
    print(f"Results saved to {output_file}")
    print(f"Total: {len(SOURCES)} | Accessible: {sum(1 for r in results.values() if r['accessible'])} | Catalog OK: {sum(1 for r in results.values() if r['catalog_ok'])}")
    
    # Exit with error if critical failures
    if len(failed_sources) > len(SOURCES) / 2:  # More than half failed
        print("\n❌ Too many sources failing!")
        sys.exit(1)

if __name__ == "__main__":
    main()
