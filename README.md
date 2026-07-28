# Standalone Web Novel Reader & Scraper Console

A high-performance full-stack web novel reader and aggregator built with **Next.js 14 App Router**, **TypeScript**, **Tailwind CSS**, and **Cheerio**.

---

## 🌟 Key Features

1. **Multi-Source Scraper Engine**: Scrapes and aggregates novel catalogs from 5 major Chinese web novel platforms (Novel543, 69shuba, TimoTxt, Aixdzs8, XBiquge).
2. **Robust Chinese Search Engine**: Supports both Chinese queries (e.g. `洪荒`) and English terms (auto-translated to Chinese before search).
3. **GBK Byte Encoding Fallback**: Formats search requests using GBK URL-byte encoding (`iconv-lite`) to bypass legacy Chinese CMS search limitations.
4. **Heuristic Book Link Matching**: Regex pattern fallback (`isBookLink`) catches book URLs even when site CSS templates change.
5. **Smart Cloudflare Anti-Bot Bypasser**: 4-Tier HTTP / TLS header spoofing engine with `cf_clearance` cookie session caching.
6. **Automated Chinese-to-English Translation**: Google Translate batch processing with paragraph structure preservation.
7. **Customizable Plugin Settings**: Reorder source plugin priority and enable/disable specific platforms in Settings.
8. **Immersive Reader Mode**: Customizable font sizes, background themes (Light, Sepia, Dark), progress auto-saving, and chapter drawers.

---

## 📚 Technical Documentation

Full documentation is available in the [`docs/`](./docs) directory:

- 🤖 [**AI Agent Context Guide** (`docs/agents.md`)](./docs/agents.md) — Architectural rules, technical constraints, and developer precautions.
- 🏗️ [**System Architecture** (`docs/architecture.md`)](./docs/architecture.md) — System diagram, Cloudflare bypasser tiers, and API specifications.
- 🎨 [**Visual Design & UI** (`docs/design.md`)](./docs/design.md) — Color palette tokens, component hierarchy, and reader UI specs.

---

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm run build
npm start
```
