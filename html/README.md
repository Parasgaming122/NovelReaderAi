# NovelReaderAi - Site HTML Samples

Source repo: [NovelReaderAi](https://github.com/Parasgaming122/NovelReaderAi/tree/main/src/lib/plugins)
Generated: 2026-07-30 14:37 UTC+05:00 (PKT)
Download: [https://tmpfiles.org/dl/wKwpi39uo1nA/novel_html_samples_all_sites.zip](https://tmpfiles.org/dl/wKwpi39uo1nA/novel_html_samples_all_sites.zip)
Expires: 48 hours (172800s)

---

## Working Sites (full page sets downloaded)

| # | Folder | Site | Base URL | Charset | Pages |
|---|--------|------|----------|---------|-------|
| 1 | `ixdzs8/` | Aixdzs (爱下电子书) | https://ixdzs8.com | utf-8 | 5/5 |
| 2 | `xbiquge/` | XBiquge (新笔趣阁) | https://www.xbiquge.info | utf-8 | 4/4 |
| 3 | `biquge_company/` | 笔趣阁.company | https://www.biquge.company | utf-8 | 4/4 |
| 4 | `ttkan/` | TTKan | https://www.ttkan.co | utf-8 | 5/5 |
| 5 | `shuhaige/` | 书海阁 (ShuHaiGe) | https://m.shuhaige.net | utf-8 | 4/4 |
| 6 | `quanben5/` | 全本5 (Quanben5) | https://big5.quanben5.com | big5 | 4/4 |
| 7 | `rayforboe/` | 顶级看书网 (Rayforboe) | https://www.rayforboe.com | utf-8 | 4/4 |

### ixdzs8/ - Aixdzs (爱下电子书)

- **Base URL:** `https://ixdzs8.com`
- **Plugin:** `ixdzs8Plugin.ts`
- **Charset:** utf-8

**Files:**

| File | Method | URL | Status | Size | Encoding |
|------|--------|-----|--------|------|----------|
| [+] `01_catalog.html` | GET | `https://ixdzs8.com/sort/0/` | 200 | 31.4 KB | utf-8 |
| [+] `02_search.html` | GET | `https://ixdzs8.com/bsearch?q=test` | 200 | 4.5 KB | utf-8 |
| [+] `03_novel_info.html` | GET | `https://ixdzs8.com/read/1/p1.html` | 200 | 18.9 KB | utf-8 |
| [+] `04_chapter.html` | GET | `https://ixdzs8.com/read/1/p2.html` | 200 | 0.4 KB | utf-8 |
| [+] `05_chapter_list_api.json` | POST | `https://ixdzs8.com/novel/clist/` | 200 | 3.2 KB | utf-8 |

### xbiquge/ - XBiquge (新笔趣阁)

- **Base URL:** `https://www.xbiquge.info`
- **Plugin:** `xbiqugePlugin.ts`
- **Charset:** utf-8

**Files:**

| File | Method | URL | Status | Size | Encoding |
|------|--------|-----|--------|------|----------|
| [+] `01_catalog.html` | GET | `https://www.xbiquge.info/` | 200 | 41.7 KB | utf-8 |
| [+] `02_search.html` | GET | `https://www.xbiquge.info/search.php?q=test` | 200 | 3.1 KB | utf-8 |
| [+] `03_novel_info.html` | GET | `https://www.xbiquge.info/8/8697/` | 200 | 31.8 KB | utf-8 |
| [+] `04_chapter.html` | GET | `https://www.xbiquge.info/8/8697/272602.html` | 200 | 56.4 KB | utf-8 |

### biquge_company/ - 笔趣阁.company

- **Base URL:** `https://www.biquge.company`
- **Plugin:** `biquge_companyPlugin.ts`
- **Charset:** utf-8

**Files:**

| File | Method | URL | Status | Size | Encoding |
|------|--------|-----|--------|------|----------|
| [+] `01_catalog.html` | GET | `https://www.biquge.company/sort/0/1.html` | 200 | 32.1 KB | utf8 |
| [+] `02_search.html` | POST | `https://www.biquge.company/modules/article/search.php` | 200 | 12.9 KB | utf8 |
| [+] `03_novel_info.html` | GET | `https://www.biquge.company/book/98405.html` | 200 | 15.5 KB | utf8 |
| [+] `04_chapter.html` | GET | `https://www.biquge.company/read/98384/30845698.html` | 200 | 18.2 KB | utf8 |

### ttkan/ - TTKan

- **Base URL:** `https://www.ttkan.co`
- **Plugin:** `ttkanPlugin.ts`
- **Charset:** utf-8

**Files:**

| File | Method | URL | Status | Size | Encoding |
|------|--------|-----|--------|------|----------|
| [+] `01_catalog_rank.html` | GET | `https://www.ttkan.co/novel/rank?page=1` | 200 | 101.8 KB | utf-8 |
| [+] `02_search.html` | GET | `https://www.ttkan.co/novel/search?q=test` | 200 | 33.1 KB | utf-8 |
| [+] `03_novel_info.html` | GET | `https://www.ttkan.co/novel/chapters/wanxiangzhiwang-tiancantudou` | 200 | 410.0 KB | utf-8 |
| [+] `04_chapter.html` | GET | `https://www.ttkan.co/novel/pagea/wanxiangzhiwang-tiancantudou_1.html` | 200 | 91.0 KB | utf-8 |
| [+] `05_chapter_list_api.json` | GET | `https://www.ttkan.co/api/nq/amp_novel_chapters?language=tw&novel_id=wanxiangzhiwang-tiancantudou&limit=10` | 200 | 0.6 KB | utf-8 |

### shuhaige/ - 书海阁 (ShuHaiGe)

- **Base URL:** `https://m.shuhaige.net`
- **Plugin:** `shuhaigePlugin.ts`
- **Charset:** utf-8

**Files:**

| File | Method | URL | Status | Size | Encoding |
|------|--------|-----|--------|------|----------|
| [+] `01_catalog.html` | GET | `https://m.shuhaige.net/shuku/0_0_0_1.html` | 200 | 28.5 KB | utf-8 |
| [+] `02_search.html` | POST | `https://m.shuhaige.net/search.html` | 200 | 1.4 KB | utf-8 |
| [+] `03_novel_info.html` | GET | `https://m.shuhaige.net/shu_1397.html` | 200 | 28.1 KB | utf-8 |
| [+] `04_chapter.html` | GET | `https://m.shuhaige.net/1397/152060484.html` | 200 | 16.6 KB | utf-8 |

### quanben5/ - 全本5 (Quanben5)

- **Base URL:** `https://big5.quanben5.com`
- **Plugin:** `quanben5Plugin.ts`
- **Charset:** big5

**Files:**

| File | Method | URL | Status | Size | Encoding |
|------|--------|-----|--------|------|----------|
| [+] `01_catalog.html` | GET | `https://big5.quanben5.com/category/1.html` | 200 | 17.4 KB | big5 |
| [+] `02_novel_info.html` | GET | `https://big5.quanben5.com/n/yishixiejun/` | 200 | 9.9 KB | big5 |
| [+] `03_chapter_list.html` | GET | `https://big5.quanben5.com/n/yishixiejun/xiaoshuo.html` | 200 | 153.7 KB | big5 |
| [+] `04_chapter.html` | GET | `https://big5.quanben5.com/n/yishixiejun/7517.html` | 200 | 20.5 KB | big5 |

### rayforboe/ - 顶级看书网 (Rayforboe)

- **Base URL:** `https://www.rayforboe.com`
- **Plugin:** `rayforboePlugin.ts`
- **Charset:** utf-8

**Files:**

| File | Method | URL | Status | Size | Encoding |
|------|--------|-----|--------|------|----------|
| [+] `01_homepage.html` | GET | `https://www.rayforboe.com/` | 200 | 71.7 KB | utf-8 |
| [+] `02_sort.html` | GET | `https://www.rayforboe.com/sort/` | 200 | 23.6 KB | utf-8 |
| [+] `03_novel_info.html` | GET | `https://www.rayforboe.com/mgbxsa/` | 200 | 34.2 KB | utf-8 |
| [+] `04_chapter.html` | GET | `https://www.rayforboe.com/mgbxsa/299672` | 200 | 18.4 KB | utf-8 |

---

## Blocked / Unavailable Sites

| # | Folder | Site | Base URL | Charset | Reason |
|---|--------|------|----------|---------|--------|
| 1 | `timotxt/` | TimoTxt (提莫書屋) | `https://www.timotxt.com` | utf-8 | 403 Forbidden — site blocks server-side requests |
| 2 | `biquge5200/` | 笔趣阁5200 | `https://www.biquge5200.cc` | utf-8 | 500 Internal Server Error — site is down or broken |
| 3 | `ddxss/` | 顶点小说 (DDXSS) | `https://www.ddxss.cc` | utf-8 | Domain parked — no longer a novel site |
| 4 | `fanqie/` | 番茄小说 (Fanqie) | `https://fanqienovel.com` | utf-8 | Requires JavaScript rendering / app-based |
| 5 | `haodoo/` | 好读 (Haodoo) | `https://haodoo.org` | utf-8 | Traditional Chinese (繁體) archive site — uses ?M=hd&P=martial URL structure |
| 6 | `novel543/` | Novel543 (稷下書院) | `https://www.novel543.com` | utf-8 | 403 Forbidden — site blocks server-side requests |
| 7 | `piaotia/` | 飘天文学 (Piaotia) | `https://www.piaotia.com` | utf-8 | 403 Forbidden — site blocks server-side requests |
| 8 | `powanjuan/` | 破万卷 (PoWanJuan) | `https://www.powanjuan.cc` | utf-8 | 500 Internal Server Error — site is down or broken |
| 9 | `qimao/` | 七猫小说 (Qimao) | `https://www.qimao.com` | utf-8 | 405 Not Allowed — API blocked |
| 10 | `shuba69/` | 69shuba (69書吧) | `https://www.69shuba.com` | gbk | Site Down — server returns empty response |
| 11 | `shw5/` | 书香万卷 (Shw5) | `https://www.shw5.cc` | utf-8 | 500 Internal Server Error — site is down or broken |
| 12 | `snapd/` | SnapD小说 | `https://m.snapd.net` | utf-8 | Search endpoint returns 404 — catalog works only via categories |
| 13 | `soxs/` | 搜小说网 (Soxs) | `https://www.soxs.cc` | utf-8 | Timeout — server blocks automated requests |
| 14 | `twkan/` | TWKan | `https://twkan.com` | utf-8 | 403 Forbidden — anti-bot protection |
| 15 | `trxs/` | 天人小说 (Trxs) | `https://trxs.cc` | gb2312 | Site now a fan-fiction (同人小说) site in GB2312 encoding |
| 16 | `wanben/` | 万本TXT (10000txt) | `https://www.10000txt.com` | utf-8 | 403 Forbidden — site blocks server-side requests |
| 17 | `zongheng/` | 纵横文学 (Zongheng) | `https://book.zongheng.com` | utf-8 | Site times out — requires browser bypass |

---

## File Structure

```
novel_html_samples/
  README.md
  ixdzs8/  (working)  [utf-8]
    01_catalog.html
    02_search.html
    03_novel_info.html
    04_chapter.html
    05_chapter_list_api.json
  xbiquge/  (working)  [utf-8]
    01_catalog.html
    02_search.html
    03_novel_info.html
    04_chapter.html
  biquge_company/  (working)  [utf-8]
    01_catalog.html
    02_search.html
    03_novel_info.html
    04_chapter.html
  ttkan/  (working)  [utf-8]
    01_catalog_rank.html
    02_search.html
    03_novel_info.html
    04_chapter.html
    05_chapter_list_api.json
  shuhaige/  (working)  [utf-8]
    01_catalog.html
    02_search.html
    03_novel_info.html
    04_chapter.html
  quanben5/  (working)  [big5]
    01_catalog.html
    02_novel_info.html
    03_chapter_list.html
    04_chapter.html
  rayforboe/  (working)  [utf-8]
    01_homepage.html
    02_sort.html
    03_novel_info.html
    04_chapter.html
  timotxt/  (blocked)  [utf-8]
    01_homepage.html
    02_dir.html
  biquge5200/  (blocked)  [utf-8]
    01_homepage.html
  ddxss/  (blocked)  [utf-8]
    01_homepage.html
  fanqie/  (blocked)  [utf-8]
    01_homepage.html
  haodoo/  (blocked)  [utf-8]
    01_homepage.html
    02_category.html
  novel543/  (blocked)  [utf-8]
    01_homepage.html
  piaotia/  (blocked)  [utf-8]
    01_homepage.html
  powanjuan/  (blocked)  [utf-8]
    01_homepage.html
  qimao/  (blocked)  [utf-8]
    01_homepage.html
  shuba69/  (blocked)  [gbk]
    01_homepage.html
  shw5/  (blocked)  [utf-8]
    01_homepage.html
  snapd/  (blocked)  [utf-8]
    01_homepage.html
  soxs/  (blocked)  [utf-8]
    01_homepage.html
  twkan/  (blocked)  [utf-8]
    01_homepage.html
  trxs/  (blocked)  [gb2312]
    01_homepage.html
  wanben/  (blocked)  [utf-8]
    01_homepage.html
  zongheng/  (blocked)  [utf-8]
    01_homepage.html
```

---

## Notes

- All HTML/JSON files saved as **UTF-8** (non-UTF-8 sources properly decoded)
- Encoding detection order: plugin hint > HTML meta charset > chardet > fallback
- Browser-like headers from [bypasser.ts](https://github.com/Parasgaming122/NovelReaderAi/blob/main/src/lib/bypasser.ts)
- File naming: `01_catalog`, `02_search`, `03_novel_info`, `04_chapter`, `05_api_response`
- Blocked sites still have error/homepage downloaded for reference
