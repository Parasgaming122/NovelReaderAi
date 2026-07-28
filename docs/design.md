# Visual Design & UI Architecture (`docs/design.md`)

## Visual Design System & Aesthetics

### Philosophy
The console uses a refined, high-contrast duotone theme with subtle warm accents (`--accent-warm`: `#D97706`). The layout avoids generic AI templates and slop patterns, focusing on readable typography, clean negative space, and responsive card containers.

---

## Design Tokens & Color Palette (`src/app/globals.css`)

### Light Theme Default Variables
- `--bg-root`: `#F8FAFC` (Cool slate canvas)
- `--surface-1`: `#FFFFFF` (Main card background)
- `--surface-2`: `#F1F5F9` (Secondary container surface)
- `--text-1`: `#0F172A` (Primary body and heading color)
- `--text-2`: `#475569` (Subtle captions & labels)
- `--text-3`: `#94A3B8` (Disabled text)
- `--blue`: `#2563EB` (Brand blue accent)
- `--blue-soft`: `#EFF6FF` (Soft blue badge fill)
- `--accent-warm`: `#D97706` (Amber tag accent)
- `--border`: `#E2E8F0` (Hairline container border)

---

## Key UI Components

### 1. Navigation Console Shell (`src/components/ConsoleShell.tsx`)
- Sidebar layout on desktop (`lg:flex`) with a fixed left control panel.
- Header search bar supporting global instant search submit (`Enter` or click).
- Navigation tabs:
  - 📚 **Catalog**: Multi-source horizontal slider feeds.
  - 🔍 **Global Search**: Search results grouped by source plugin.
  - 🔌 **Source Plugins**: Individual source feeds with single-source search.
  - 🔖 **My Reader Shelf**: Locally persisted bookmarks, reading history, and chapter progress.
  - ⚙️ **Settings**: Source plugin reordering, enable/disable toggles, and live telemetry.
  - 📖 **API Docs**: Developer guide and OpenAPI endpoint specifications.

### 2. Immersive Reader View (`src/components/NovelReaderView.tsx`)
- Custom font size slider (14px - 28px).
- Theme toggles (Default Light, Sepia, Dark Reader).
- Clean line-height and paragraph spacing (`1.8` multiplier).
- Sticky navigation bar with Previous Chapter, Chapter Index Drawer, and Next Chapter buttons.

### 3. Plugin Reordering UI (`src/components/SettingsView.tsx`)
- Drag/Order controls (`#1`, `#2`, `#3` priority badges).
- Up/Down move buttons and enable/disable toggle buttons.
- State persisted in `localStorage` under `plugin_settings` key.
