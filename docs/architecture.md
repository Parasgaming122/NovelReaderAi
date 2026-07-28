# System Architecture (`docs/architecture.md`)

## System Architecture Diagram
```
                     +---------------------------------------+
                     |         Browser Web Client            |
                     |  (Next.js App Router / Console UI)    |
                     +-------------------+-------------------+
                                         |
                                         | HTTP / Fetch
                                         v
                     +---------------------------------------+
                     |         Next.js Server API            |
                     | (/api/catalog, /api/search, etc.)     |
                     +-------------------+-------------------+
                                         |
               +-------------------------+-------------------------+
               |                                                   |
               v                                                   v
  +--------------------------+                           +-------------------+
  |  Plugin Registry Engine  |                           |  Google Translate |
  | (src/lib/plugins/*)      |                           |   Batch Service   |
  +------------+-------------+                           +-------------------+
               |
               v
  +--------------------------+
  | Cloudflare Smart Bypasser|
  |  (src/lib/bypasser.ts)   |
  +------------+-------------+
               |
     4-Tier HTTP / TLS Fallback
               |
               v
  +--------------------------+
  | Target Chinese Source CMS|
  | (69shuba, XBiquge, etc.) |
  +--------------------------+
```

---

## Key Subsystems

### 1. Cloudflare Bypasser Engine (`src/lib/bypasser.ts`)
- **Tier 1 (Direct Fetch)**: Standard Node `fetch()` with Chrome HTTP headers.
- **Tier 2 (Spoofed TLS/UA)**: Injects Chrome 124 TLS client signatures, Accept-Language, and sec-ch-ua headers.
- **Tier 3 (Session Cache)**: Stores and reuses `cf_clearance` cookies across domain requests for 3600 seconds.
- **Tier 4 (Retry Fallback)**: Catches HTTP 403/503 errors and attempts alternative mirrors or retry queries.

### 2. Plugin Architecture (`src/lib/plugins/`)
- Each source implements `NovelSourcePlugin`:
  - `getCatalogList(page)`: Retrieves trending/latest catalog items.
  - `getCatalogSearch(query, page)`: Executes multi-endpoint search queries using both UTF-8 and GBK URL encoding.
  - `getNovelDetail(novelUrl)`: Extracts metadata, cover image, synopsis, and chapter directory.
  - `getChapterContent(chapterUrl)`: Cleans HTML body, extracts paragraph texts, and removes ad boilerplate.

#### Registered Plugins:
1. `Novel543Plugin` (`novel543` / `www.novel543.com`): UTF-8 fast catalog & search.
2. `Shuba69Plugin` (`shuba69` / `www.69shuba.com`): GBK POST/GET search with Jieqi CMS support.
3. `TimoTxtPlugin` (`timotxt` / `www.timotxt.com`): Lightweight UTF-8 text catalog.
4. `Ixdzs8Plugin` (`ixdzs8` / `ixdzs8.com`): High-speed Biquge variant replacement.
5. `XBiqugePlugin` (`xbiquge` / `www.xbiquge.info`): Legacy GBK search engine with regex link fallback.

### 3. Translation Engine (`src/lib/translator.ts`)
- Executes batch translation of Chinese novel titles, summaries, and chapter paragraphs.
- Preserves paragraph break tags (`<p>`) to maintain clean typography.
- Uses an in-memory 7-day TTL cache map to eliminate duplicate API requests.

---

## API Routes Overview

| Route | Method | Description |
| :--- | :--- | :--- |
| `/api/catalog` | `GET` | Fetches multi-source or single-source catalog items with translation |
| `/api/search` | `GET` | Searches across all active plugins with auto English-to-Chinese query translation |
| `/api/novel` | `GET` | Extracts details and chapter list for a selected novel |
| `/api/chapter` | `GET` | Retrieves full translated chapter content |
| `/api/sources` | `GET` | Lists available source plugins and metadata |
| `/api/stats` | `GET` | Returns live Cloudflare bypasser and translation telemetry |
