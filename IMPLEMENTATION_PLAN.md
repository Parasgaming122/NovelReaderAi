# Novel Reader Console - Detailed Implementation Plan

## Overview
A novel reader web application with API that aggregates Chinese web novels from multiple sources, translates them to English, and provides a console-style UI for reading.

## Architecture

### 1. Frontend (/frontend)
- **Homepage**: Featured novels + catalog from different sources (with posters and translated names)
- **Novel Detail Page**: Shows novel details (translated title, original Chinese name below, both copyable), description (translated), poster, chapters list
- **Alternative Sources Feature**: Mini-search that uses Chinese name to find the novel on other Chinese websites
- **Sources Page**: List all sources, click to open their feed, search within opened source only
- **Search Page**: Grouped results by source (Novel site name → results → next site)
- **Reader View**: Chapter reading with translation toggle

### 2. API (/api)
- Documented REST API for external apps/websites
- Routes:
  - `GET /api/sources` - List all available sources
  - `GET /api/sources/:id/feed` - Get catalog from specific source
  - `GET /api/search?q=query&source=id` - Search novels
  - `GET /api/novel?url=encodedUrl&source=id` - Get novel details + chapters
  - `GET /api/chapter?url=encodedUrl&translate=true&lang=en` - Get chapter content
  - `GET /api/translate?text=zh&from=zh-CN&to=en` - Translation endpoint

### 3. Core Features

#### Lua Script Integration
- Load and execute Lua scripts from `/external-sources/zh/*.lua`
- Each script defines: getCatalogList, getCatalogSearch, getBookTitle, getBookCoverImageUrl, getBookDescription, getChapterList, getChapterText
- Use wasmoon library to run Lua in Node.js

#### Cloudflare Bypass
- smartFetch function in bypasser.ts
- 4-tier bypass system with header spoofing and session caching

#### Translation
- Google Translate batch HTML translation
- Preserves HTML structure
- Caching for performance

### 4. UI Design (Warm Duotone Console System)
- Two accents: Blue (#2d9cdb) + Orange (#ef7c38)
- Warm paper light mode (#f2ede5 canvas, #fcfaf6 cards)
- Layered grey dark mode
- Space Grotesk (display/numbers) + Plus Jakarta Sans (body)
- Left icon rail + frosted top bar + centered content
- Ambient drifting glows, staggered fade-up animations
- No emoji icons, no third accent color

### 5. Issues to Fix

#### Current Problems:
1. **Chapters don't load** - The lua scripts aren't being executed properly
2. **Lua scripts not attached** - Need to integrate wasmoon Lua engine
3. **No alternative sources feature** - Need to implement cross-source search
4. **API not documented** - Need API documentation page
5. **Source-specific search missing** - Need per-source search functionality

#### Solutions:

1. **Fix Lua Engine Integration**:
   - Create proper Lua VM using wasmoon
   - Load bypasser module into Lua context
   - Execute source scripts and call their functions
   - Handle async operations properly

2. **Fix Chapter Loading**:
   - Ensure getChapterList is called correctly
   - Pass bookUrl properly to Lua functions
   - Handle multi-page chapter content

3. **Add Alternative Sources Feature**:
   - On novel detail page, extract Chinese title
   - Search other sources using Chinese title
   - Display results grouped by source

4. **Create API Documentation Page**:
   - New route `/api-docs` or separate page
   - Document all endpoints with examples
   - Guide for AI agents on building apps

5. **Implement Source-Specific Pages**:
   - Route `/sources/:id` for source feed
   - Search scoped to selected source only

## Implementation Steps

### Phase 1: Fix Lua Engine
1. Update `lua-engine.ts` to use wasmoon properly
2. Create LuaVM wrapper class
3. Load bypasser into Lua context
4. Test with novel543.lua script

### Phase 2: Fix API Routes
1. Update `/api/novel` to use Lua engine correctly
2. Update `/api/chapter` to fetch via Lua
3. Add `/api/sources/:id/feed` route
4. Add source-specific search

### Phase 3: Frontend Components
1. Fix NovelDetailView to show chapters properly
2. Add alternative sources section
3. Create SourcesPage component
4. Create ApiDocumentation component

### Phase 4: Polish & Testing
1. Test chapter loading end-to-end
2. Verify translation works
3. Check responsive design
4. Test dark/light theme

## File Structure
```
/workspace
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── sources/
│   │   │   │   └── [id]/
│   │   │   │       └── feed/route.ts    # NEW: Source-specific feed
│   │   │   ├── novel/route.ts           # FIX: Use Lua engine
│   │   │   ├── chapter/route.ts         # FIX: Use Lua engine
│   │   │   ├── search/route.ts          # FIX: Source-scoped search
│   │   │   └── translate/route.ts       # Document translation API
│   │   ├── sources/
│   │   │   └── [id]/
│   │   │       └── page.tsx             # NEW: Source detail page
│   │   ├── api-docs/
│   │   │   └── page.tsx                 # NEW: API documentation
│   │   ├── page.tsx                     # Homepage
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ConsoleShell.tsx
│   │   ├── NovelCatalog.tsx
│   │   ├── NovelDetailView.tsx          # FIX: Chapters + Alt sources
│   │   ├── ReaderConsole.tsx
│   │   ├── HistoryBookmarks.tsx
│   │   ├── SourcesPage.tsx              # NEW
│   │   ├── SourceFeed.tsx               # NEW
│   │   └── ApiDocumentation.tsx         # NEW
│   └── lib/
│       ├── lua-engine.ts                # FIX: wasmoon integration
│       ├── bypasser.ts
│       ├── translator.ts
│       └── types.ts
├── external-sources/
│   └── zh/
│       ├── index.yaml
│       └── *.lua                        # Source scripts
└── package.json
```
