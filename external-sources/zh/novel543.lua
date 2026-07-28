-- ══════════════════════════════════════════════════════════════
--  Novel543 Source - Version 2.0.0 with Bypass Support
--  Site: https://www.novel543.com/
--  Last Updated: 2026-07-25
--
--  CHANGES v2.0:
--  - Added bypasser module integration
--  - All requests route through CF bypass
--  - Fallback to direct HTTP if bypass unavailable
-- ══════════════════════════════════════════════════════════════

id       = "novel543"
name     = "Novel543"
version  = "2.0.0"
baseUrl  = "https://www.novel543.com/"
language = "zh"
icon     = "novel543.png"

-- ── Bypass Module Loading ─────────────────────────────────────
local bp = nil
local bp_ok = pcall(function()
    bp = require("bypasser")
end)

if bp_ok and bp then
    print("[Novel543] ✓ Bypass module loaded")
else
    print("[Novel543] ⚠ Using direct HTTP")
end

-- ── Helpers ──────────────────────────────────────────────────

local function absUrl(href)
  if not href or href == "" then return "" end
  if string_starts_with(href, "http") then return href end
  if string_starts_with(href, "//") then return "https:" .. href end
  return url_resolve(baseUrl, href)
end

local function fetchPage(url)
    if bp then
        local html = bp.smartFetch(url, { retries = 3 })
        if html and html ~= "" then return html end
    end
    
    local r = fetchPage(url)
    if r.success then return r.body end
    return nil
end

-- ── Catalog ──────────────────────────────────────────────────

function getCatalogList(index)
  local url = "https://www.novel543.com/bookstack/?page=" .. tostring(index + 1)
  local body = fetchPage(url)
  if not body then return { items = {}, hasNext = false } end
  
  local items = {}
  for _, li in ipairs(html_select(body, "ul.list li.media")) do
    local titleEl = html_select_first(li.html, "div.media-content h3 a")
    local bookUrl = absUrl(html_attr(li.html, "div.media-left a", "href"))
    local cover   = absUrl(html_attr(li.html, "div.media-left img", "src"))
    if titleEl and bookUrl ~= "" then
      table.insert(items, {
        title = string_clean(titleEl.text),
        url   = bookUrl,
        cover = cover
      })
    end
  end
  
  return { items = items, hasNext = #items > 0 }
end

-- ── Search ──────────────────────────────────────────────────

function getCatalogSearch(index, query)
  if index > 0 then return { items = {}, hasNext = false } end
  
  local url = "https://www.novel543.com/search/" .. url_encode(query)
  local body = fetchPage(url)
  if not body then return { items = {}, hasNext = false } end
  
  local items = {}
  for _, li in ipairs(html_select(body, "ul.list li.media")) do
    local titleEl = html_select_first(li.html, "div.media-content h3 a")
    local bookUrl = absUrl(html_attr(li.html, "div.media-left a", "href"))
    local cover   = absUrl(html_attr(li.html, "div.media-left img", "src"))
    if titleEl and bookUrl ~= "" then
      table.insert(items, {
        title = string_clean(titleEl.text),
        url   = bookUrl,
        cover = cover
      })
    end
  end
  
  return { items = items, hasNext = false }
end

-- ── Book Details ────────────────────────────────────────────

function getBookTitle(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, "h1.title")
  if el then return string_clean(el.text) end
  return nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, ".cover img")
  if el then return absUrl(el.src) end
  return nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, "div.intro")
  if el then return string_clean(el.text) end
  return nil
end

-- ── Chapter List ─────────────────────────────────────────────

function getChapterList(bookUrl)
  local dirUrl = bookUrl:gsub("/$", "") .. "/dir"
  local body = fetchPage(dirUrl)
  if not body then return {} end
  
  local chapters = {}
  for _, a in ipairs(html_select(body, "ul.all li a")) do
    local chUrl = absUrl(a.href)
    if chUrl ~= "" then
      table.insert(chapters, {
        title = string_clean(a.text),
        url   = chUrl
      })
    end
  end
  
  return chapters
end

function getChapterListHash(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, "p.meta span.iconf:last-child")
  if el then return string_clean(el.text) end
  return nil
end

-- ── Chapter Text (multi-page) ────────────────────────────────

function getChapterText(html, url)
  local chapterFile = string.match(url, "/([^/]+)%.html$") or ""
  
  local function extractPage(pageHtml)
    local el = html_select_first(pageHtml, "div.content")
    if not el then return "" end
    -- Use gsub instead of html_remove for compatibility
    local cleaned = el.html:gsub("<div[^>]*gadBlock[^>]*>.*</div>", "")
                       :gsub("<div[^>]*adBlock[^>]*>.*</div>", "")
                       :gsub("<script[^>]*>.*</script>", "")
                       :gsub("<ins[^>]*>.*</ins>", "")
    return html_text("<div>" .. cleaned .. "</div>")
  end
  
  local parts = {}
  local first = extractPage(html)
  if first ~= "" then table.insert(parts, first) end
  
  local currentHtml = html
  for _ = 1, 20 do
    local subUrl = nil
    for _, a in ipairs(html_select(currentHtml, "a[href]")) do
      local href = a.href
      local fname = string.match(href, "/([^/]+)$") or ""
      if string.match(fname, "^" .. chapterFile:gsub("%-", "%%-") .. "_%d+%.html$") then
        subUrl = absUrl(href)
        break
      end
    end
    
    if not subUrl then break end
    
    local pageBody = fetchPage(subUrl)
    if not pageBody then break end
    
    local sub = extractPage(pageBody)
    if sub ~= "" then table.insert(parts, sub) end
    
    currentHtml = pageBody
  end
  
  return string_trim(table.concat(parts, "\n\n"))
end
