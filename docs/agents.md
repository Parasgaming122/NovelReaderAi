# Developer & AI Agent Context Guide (`docs/agents.md`)

## Overview
This document contains critical project context, architectural guidelines, technical constraints, and developer precautions for future AI coding agents working on this codebase.

---

## 1. Project Background & Core Goals
The **Standalone Web Novel Reader & Scraper Console** is a full-stack Next.js application designed to aggregate, scrape, translate, and render web novels from popular Chinese novel platforms (such as 69shuba, Novel543, TimoTxt, Aixdzs, and XBiquge).

### High-Level Capabilities
1. **Multi-Source Aggregation**: Leverages modular TypeScript scraper plugins implementing `NovelSourcePlugin`.
2. **Cloudflare & Anti-Bot Bypass**: Utilizes a 4-tier fetch fallback pipeline with Chrome TLS UA spoofing, `cf_clearance` cookie session caching, and direct HTTP fallbacks.
3. **Automated Chinese-to-English Translation**: Uses Google Translate batch APIs with paragraph HTML structure preservation and 7-day memory caching.
4. **Customizable Plugin Preferences**: Users can enable/disable source plugins and reorder their priority in Settings.
5. **Clean Navigation Console**: Monochromatic, high-contrast UI shell with responsive reading controls, search sliders, and offline shelf storage.

---

## 2. Precautions & Gotchas for Future AI Agents

### A. GBK Encoding in Chinese Search Engines
- **Constraint**: Legacy Chinese novel CMS engines (Jieqi, PTCMS, Biquge clones) fail silently or return 0 results if search queries are sent purely in UTF-8 URL encoding.
- **Solution**: Always use `encodeGBKComponent()` from `src/lib/bypasser.ts` when formatting query strings or form bodies for GBK-based sources (like 69shuba and XBiquge).

### B. Heuristic Link Parsing (`isBookLink`)
- **Constraint**: HTML layouts on novel sources frequently change class names and layout tags.
- **Solution**: Scraper plugins rely on regex-based URL pattern matching (`/\d+/?`, `/book/\d+`, `/read/\d+`, `/txt/\d+`) as a fallback to catch book titles and chapters even if CSS selectors shift.

### C. App Routing & Tab State
- **Constraint**: The user interface relies on `activeTab`, `selectedNovel`, and `selectedChapter` states in `src/app/page.tsx`.
- **Precaution**: Selecting any navigation tab (Catalog, Search, Sources, Shelf, Settings) MUST reset `selectedNovel = null` and `selectedChapter = null` immediately so the user is never stuck in a detail/reader overlay.

### D. Server-Side Fetching & CORS
- **Constraint**: Next.js Server API Routes (`/api/*`) proxy all scraping and translation requests to prevent CORS issues in browser runtime.
- **Precaution**: Never execute scraper fetches directly on the browser client. Always route through Next.js server endpoints.

---

## 3. Directory Structure
```
/
├── docs/
│   ├── agents.md          # AI Agent context, precautions, & technical rules
│   ├── architecture.md    # System architecture, bypasser tiers & APIs
│   └── design.md          # Visual design system, dark mode tokens & layout
├── src/
│   ├── app/               # Next.js App Router & Server API Routes
│   ├── components/        # Interactive UI components
│   └── lib/               # Bypasser, translator, & plugin registry
├── metadata.json          # Application metadata
└── README.md              # Project entry guide
```
