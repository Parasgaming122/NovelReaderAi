# Contributing to NovelDokusha External Sources

Thank you for contributing! This guide will help you get started.

## 🚀 Quick Start

1. **Fork** this repository
2. **Clone** your fork
3. **Create** a new branch: `git checkout -b feature/my-new-source`
4. **Make** your changes
5. **Test** thoroughly (see below)
6. **Commit** with clear messages: `git commit -m "Add new source: SiteName"`
7. **Push** to your fork: `git push origin feature/my-new-source`
9. **Open** a Pull Request

## 📁 Project Structure

```
external-sources/
├── bypasser/          # CF bypass module (don't modify unless fixing bugs)
│   ├── init.lua       # Entry point
│   ├── core.lua       # 4-tier engine
│   ├── config.lua     # Settings
│   └── helpers.lua    # Utilities
├── zh/                # Chinese sources
├── en/                # English sources  
├── ja/                # Japanese sources
├── ru/                # Russian sources
├── id/                # Indonesian sources
├── pt/ fr/ ar/ mtl/   # Other languages
├── icons/             # Source icons (16x16 or 32x32 PNG)
└── index.yaml         # Source index
```

## ✍️ Writing a New Source

### Basic Template

```lua
-- ── Metadata (REQUIRED) ──────────────────────────────
id       = "mysource"           -- Unique ID, lowercase, no spaces
name     = "My Source Name"    -- Display name
version  = "1.0.0"              -- Semantic versioning
baseUrl  = "https://example.com/"  -- Must end with /
language = "en"                 -- zh/en/ja/ru/id/pt/fr/ar
icon     = "mysource.png"       -- Icon filename in icons/

-- ── Bypass Module (REQUIRED) ─────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[mysource] ✓ Bypass loaded")
else
    print("[mysource] ⚠ Direct HTTP mode")
end

-- Smart fetch function
local _pageCache = {}
local function fetchPage(url)
    if _pageCache[url] then return _pageCache[url] end
    
    local body = nil
    if bp then
        body = bp.smartFetch(url, { retries = 3 })
    else
        local r = http_get(url)
        if r.success then body = r.body end
    end
    
    if body then _pageCache[url] = body end
    return body
end

-- ── Helper Functions ────────────────────────────────
local function absUrl(href)
    if not href or href == "" then return "" end
    if string_starts_with(href, "http") then return href end
    if string_starts_with(href, "//") then return "https:" .. href end
    return url_resolve(baseUrl, href)
end

-- ── REQUIRED FUNCTIONS ─────────────────────────────

function getCatalogList(index)
    -- Return paginated list of books
    local url = baseUrl .. "page/" .. tostring(index + 1)
    local body = fetchPage(url)
    if not body then return { items = {}, hasNext = false } end
    
    local items = {}
    for _, item in ipairs(html_select(body, ".book-item")) do
        local titleEl = html_select_first(item.html, "h3 a")
        if titleEl then
            table.insert(items, {
                title = string_clean(titleEl.text),
                url   = absUrl(titleEl.href),
                cover = absUrl(html_attr(item.html, "img", "src"))
            })
        end
    end
    
    return { items = items, hasNext = #items > 0 }
end

function getCatalogSearch(index, query)
    -- Search functionality
    if index > 0 then return { items = {}, hasNext = false } end
    
    local searchUrl = baseUrl .. "search?q=" .. url_encode(query)
    local body = fetchPage(searchUrl)
    if not body then return { items = {}, hasNext = false } end
    
    local items = {}
    -- Parse search results...
    
    return { items = items, hasNext = false }
end

function getBookTitle(bookUrl)
    local body = fetchPage(bookUrl)
    if not body then return nil end
    local el = html_select_first(body, "h1.title")
    return el and string_trim(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
    local body = fetchPage(bookUrl)
    if not body then return nil end
    local cover = html_attr(body, ".cover img", "src")
    return cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
    local body = fetchPage(bookUrl)
    if not body then return nil end
    local el = html_select_first(body, ".description")
    return el and string_trim(el.text) or nil
end

function getChapterList(bookUrl)
    local body = fetchPage(bookUrl)
    if not body then return {} end
    
    local chapters = {}
    for _, a in ipairs(html_select(body, ".chapter-list a")) do
        table.insert(chapters, {
            title = string_trim(a.text),
            url   = absUrl(a.href)
        })
    end
    
    return chapters
end

function getChapterListHash(bookUrl)
    -- Return value that changes when chapters update
    local body = fetchPage(bookUrl)
    if not body then return nil end
    local el = html_select_first(body, ".update-time")
    return el and string_trim(el.text) or nil
end

function getChapterText(html, url)
    -- Extract chapter content from HTML passed by app
    local el = html_select_first(html, ".chapter-content")
    if not el then return "" end
    
    local text = html_text(el.html)
    -- Clean text if needed
    text = string_trim(text)
    
    return text
end
```

### Required Functions Checklist

- [ ] `getCatalogList(index)` - Browse books
- [ ] `getCatalogSearch(index, query)` - Search
- [ ] `getBookTitle(bookUrl)` - Book title
- [ ] `getBookCoverImageUrl(bookUrl)` - Cover image
- [ ] `getBookDescription(bookUrl)` - Synopsis
- [ ] `getChapterList(bookUrl)` - Chapter list
- [ ] `getChapterListHash(bookUrl)` - Update detection
- [ ] `getChapterText(html, url)` - Chapter content

## 🛡️ Bypasser Integration

**Always include bypasser support!** Even if the site doesn't currently have Cloudflare protection:

```lua
-- At top of file:
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)

-- Use fetchPage() instead of raw http_get():
local function fetchPage(url)
    if bp then
        return bp.smartFetch(url, { retries = 3 })
    else
        local r = http_get(url)
        return r.success and r.body or nil
    end
end
```

## ⚠️ Common Mistakes to Avoid

### 1. Using Non-existent Functions
```lua
-- ❌ DON'T DO THIS:
text = regex_replace(text, pattern, replacement)
cleaned = html_remove(html, selector1, selector2)
text = string_replace(text, old, new)

-- ✅ DO THIS INSTEAD:
text = text:gsub(pattern, replacement)
cleaned = text:gsub("<script[^>]*>.*</script>", "")
text = text:gsub(old, new, 1)
```

### 2. Forgetting Error Handling
```lua
-- ❌ DON'T DO THIS:
local body = http_get(url).body  -- Crashes if request fails!

-- ✅ DO THIS INSTEAD:
local r = http_get(url)
if not r.success then return nil end
local body = r.body
```

### 3. Hardcoding URLs Without absUrl()
```lua
-- ❌ DON'T DO THIS:
url = "/chapter/1.html"  -- Won't work correctly

-- ✅ DO THIS INSTEAD:
url = absUrl("/chapter/1.html")  -- Handles relative URLs properly
```

## 🧪 Testing Your Source

Before submitting:

1. **Syntax Check**
   ```bash
   make test
   ```

2. **Manual Test**
   - Import source into NovelDokusha
   - Test search with common terms
   - Open a book, check chapter list
   - Read a full chapter
   - Verify images load (if applicable)

3. **Bypass Test**
   - Enable debug mode: set `config.debug = true` in `bypasser/config.lua`
   - Check logs show `[source] ✓ Bypass loaded`
   - Verify requests go through tiers correctly

4. **Validation**
   ```bash
   make validate
   make lint
   ```

## 📝 Commit Messages

Follow conventional commits format:

- `feat: add new source: SiteName`
- `fix: correct chapter selector for timotxt`
- `docs: update README with new sources`
- `refactor: simplify text cleaning logic`
- `bypass: increase delays for protected sites`

## 🔧 Development Commands

```bash
# Install dependencies
make install

# Run tests
make test

# Validate all sources
make validate

# Check for issues
make lint

# Create distribution package
make package

# Show stats
make stats

# Clean up
make clean
```

## ❓ Getting Help

- Check existing [issues](../../issues) first
- Use appropriate issue template
- Include error logs and screenshots
- Mention what you've already tried

## 📜 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thanks for contributing! 🎉
