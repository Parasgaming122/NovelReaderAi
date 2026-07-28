# 🧩 NovelDokusha External Sources

[![CI](https://github.com/HnDK0/external-sources/actions/workflows/ci.yml/badge.svg)](https://github.com/HnDK0/external-sources/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/HnDK0/external-sources?include_prereleases)](https://github.com/HnDK0/external-sources/releases)
[![Sources](https://img.shields.io/badge/sources-80%20%2B-blue)](#sources)
[![Bypass](https://img.shields.io/badge/bypass-4%20tier-green)](bypasser/README.md)
[![License](https://img.shields.io/badge/license-MIT-yellow)](LICENSE)

**Complete external source collection for [NovelDokusha](https://github.com/dteviot/NovelDokusha) with built-in Cloudflare bypass!**

---

## ✨ Features

- 🌐 **80+ Sources** across 9 languages
- 🛡️ **4-Tier CF Bypass** - Works without any server!
- 📱 **Zero Dependencies** - Drop-in and use
- 🔄 **Auto-Retry** with smart backoff
- 🍪 **Session Caching** for faster repeat visits
- ⚡ **Browser Emulation** with rotating User-Agents
- 🎯 **Graceful Fallback** if bypass unavailable

## 🚀 Quick Start

### Option 1: Download Release (Recommended)

1. Go to [Releases](../../releases/latest)
2. Download `novel-sources-bypass-v*.zip`
3. Extract to get `external-sources/` folder
4. Copy to NovelDokusha: `/storage/emulated/0/NovelDokusha/external-sources/`
5. Restart app ✅

### Option 2: Clone Repository

```bash
git clone https://github.com/HnDK0/external-sources.git
cd external-sources
make install  # Or copy manually
```

### Option 3: Plugin URL

Add this URL in NovelDokusha's source manager:
```
https://raw.githubusercontent.com/HnDK0/external-sources/refs/heads/main/index.yaml
```

---

## 📊 Source Statistics

| Language | Count | Bypass Coverage |
|----------|-------|-----------------|
| 🇨🇳 Chinese | 24 | 100% |
| 🇬🇧 English | 38 | 100% |
| 🇯🇵 Japanese | 2 | 100% |
| 🇷🇺 Russian | 5 | 100% |
| 🇮🇩 Indonesian | 11 | 100% |
| 🇵🇹 Portuguese | 1 | 100% |
| 🇫🇷 French | 1 | 100% |
| 🇸🇦 Arabic | 1 | 100% |
| MTL | 2 | 100% |
| **Total** | **80+** | **100%** |

---

## 🛡️ Bypass System

Our 4-tier architecture handles Cloudflare and other protections:

```
Request → Tier 1 (HTTP + Headers) → Tier 2 (Cache) → Tier 3 (Retry) → Tier 4 (Fallback)
           <200ms                    ~300ms              3-12s            Best effort
```

**Supported Protections:**
- ✅ Cloudflare (Turnstile, JS Challenge, Interstitial)
- ✅ hCaptcha / reCAPTCHA detection
- ✅ GeeTest / Imperva
- ✅ Chinese site protections

See [bypasser/README.md](bypasser/README.md) for full documentation.

---

## 📁 Project Structure

```
external-sources/
├── .github/               # CI/CD workflows
│   ├── workflows/         # Automation
│   └── ISSUE_TEMPLATE/    # Issue templates
├── bypasser/              # 🛡️ CF bypass module
│   ├── init.lua          # Entry point
│   ├── core.lua          # 4-tier engine
│   ├── config.lua        # Settings
│   └── helpers.lua       # Utilities
├── zh/                    # 🇨🇳 Chinese sources (24)
├── en/                    # 🇬🇧 English sources (38)
├── ja/                    # 🇯🇵 Japanese sources (2)
├── ru/                    # 🇷🇺 Russian sources (5)
├── id/                    # 🇮🇩 Indonesian sources (11)
├── pt/ fr/ ar/ mtl/       # Other languages (5)
├── icons/                 # Source icons (24)
├── scripts/               # Build utilities
├── index.yaml             # Source manifest
├── Makefile               # Dev commands
├── CONTRIBUTING.md        # Contribution guide
└── README.md              # This file
```

---

## 🔧 Development

### Prerequisites

- Lua 5.4+ (for testing)
- Python 3.10+ (for packaging)
- Git

### Commands

```bash
# Install to local NovelDokusha
make install

# Run tests
make test

# Validate all sources
make validate

# Check for issues
make lint

# Create distribution package
make package

# Show statistics
make stats

# Clean generated files
make clean
```

### Adding a New Source

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guide.

Quick template:
```lua
-- Metadata
id = "mysource"
name = "My Source"
version = "1.0.0"
baseUrl = "https://example.com/"
language = "en"

-- Load bypasser
local bp = nil; pcall(function() bp = require("bypasser") end)

-- Use fetchPage() instead of http_get()
local function fetchPage(url)
    return bp and bp.smartFetch(url) or http_get(url).success and http_get(url).body
end

-- Implement required functions...
```

---

## 🔄 GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| [CI](.github/workflows/ci.yml) | Push/PR | Syntax check, metadata validation, bypass test |
| [Release](.github/workflows/release.yml) | Tags | Auto-build ZIP, create GitHub release |
| [Test Bypass](.github/workflows/test-bypass.yml) | Manual | Test bypass against specific URLs |
| [Maintenance](.github/workflows/maintenance.yml) | Weekly | Health check, statistics, cleanup |
| [PR Automation](.github/workflows/pr-automation.yml) | PRs/Issues | Welcome, labels, validation |

### Creating a Release

```bash
# Tag your release
git tag v2.1.0
git push origin v2.1.0

# Or manually trigger:
# Go to Actions → Release Package → Run workflow
```

---

## 🐛 Troubleshooting

### Source Not Working?

1. **Check logs** - Enable debug in `bypasser/config.lua`:
   ```lua
   config.debug = true
   ```

2. **Increase delays** if getting blocked:
   ```lua
   config.request_delay = { min = 2000, max = 5000 }
   ```

3. **Clear cache** and retry

4. **Report issue** with logs using ☁️ template

### Common Errors

| Error | Solution |
|-------|----------|
| `module 'bypasser' not found` | Ensure `bypasser/` folder is present |
| `attempt to call nil` | Source uses non-existent function (report it!) |
| 403 Forbidden | Increase delays or enable debug mode |
| Slow loading | Normal on first visit (cache warming) |

---

## 📈 Roadmap

- [x] Standalone bypass (no server needed)
- [x] 4-tier architecture
- [x] 100% source coverage
- [ ] Trawl integration option
- [ ] Proxy support (Tier 4)
- [ ] Source rating system
- [ ] Auto-fallback to mirrors

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md).

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

---

## 🙏 Acknowledgments

- [NovelDokusha](https://github.com/dteviot/NovelDokusha) - The app that makes this possible
- [trawl](https://github.com/germondai/trawl) - Inspiration for 4-tier architecture
- All source contributors!

---

<div align="center">

**⭐ Star this repo if you find it useful!**

Made with ❤️ by the NovelDokusha community

</div>
