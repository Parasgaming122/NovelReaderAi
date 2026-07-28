-- Metadata
id       = "sousetsuka"
name     = "Sousetsuka"
version  = "1.0.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[sousetsuka] ✓ Bypass loaded")
else
    print("[sousetsuka] ⚠ Direct HTTP mode")
end

-- Smart fetch with bypass support
local _pageCache = {}
local function fetchPage(url)
    if _pageCache[url] then return _pageCache[url] end
    
    local body = nil
    if bp then
        body = bp.smartFetch(url, { retries = 3 })
    else
        local r = fetchPage(url, { charset = charset or "UTF-8" })
        if r.success then body = r.body end
    end
    
    if body then _pageCache[url] = body end
    return body
end

local function postPage(url, data, opts)
    opts = opts or {}
    if bp then
        local html = bp.search(url, data or "")
        if html and html ~= "" then return html end
    end
    
    local r = http_post(url, data or "", opts)
    return r.success and r.body or nil
end

baseUrl  = "https://www.sousetsuka.com/"
language = "en"

-- NOTE: This is a simple blog-style source with minimal structure.
-- Mainly provides chapter text extraction.

-- Helpers
local function absUrl(href)
  if not href or href == "" then return "" end
  if string_starts_with(href, "http") then return href end
  if string_starts_with(href, "//") then return "https:" .. href end
  return url_resolve(baseUrl, href)
end

local function applyStandardContentTransforms(text)
  if not text or text == "" then return "" end
  text = string_normalize(text)
  local domain = baseUrl:gsub("https?://", ""):gsub("^www%.", ""):gsub("/$", "")
  text = string.gsub(text, "(?i)" .. domain .. ".*?\\n", "")
  text = string.gsub(text, "(?i)\\A[\\s\\p{Z}\\uFEFF]*((第[\\d一二三四五六七八九十百]+[章节]|Chapter\\s+\\d+)[^\\n\\r]*[\\n\\r\\s]*)+", "")
  text = string_trim(text)
  return text
end

-- Catalog (not well supported - returns empty)
function getCatalogList(index)
  return { items = {}, hasNext = false }
end

-- Search (not supported)
function getCatalogSearch(index, query)
  return { items = {}, hasNext = false }
end

-- Book details (minimal support)
function getBookTitle(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
  -- Use page title as fallback
local el = html_select_first(r, "title")
  if el then
    local title = string_clean(el.text)
    -- Clean up common title suffixes
    title = title:gsub("%s*[%-–|]%s*Sousetsuka.*$", "")
      :gsub("%s*[%-–|]%s*Sousetsuka's Weblog.*$", "")
      :trim()
    if title ~= "" then return title end
  end
  return nil
end

function getBookCoverImageUrl(bookUrl)
  -- Sousetsuka doesn't typically have book covers
  return nil
end

function getBookDescription(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
  -- Try to find description/content
local el = html_select_first(r, ".entry-content p:first-child, .post-body.entry-content p:first-child")
  if el then
    local desc = string_clean(el.text)
    if #desc > 50 then
      desc = string.sub(desc, 1, 300) .. "..."
      return applyStandardContentTransforms(desc)
    end
  end
  return nil
end

-- Chapter list (not applicable - this is a chapter-by-chapter site)
function getChapterList(bookUrl)
  -- Sousetsuka doesn't have a traditional chapter list
  -- Each URL is typically a single chapter/post
  return {{ title = "Chapter 1", url = bookUrl }}
end

-- Chapter text (main feature of this source)
function getChapterText(html, url)
  local cleaned = html
  
  local el = html_select_first(cleaned, ".post-body.entry-content, .entry-content, article, .post-content")
  if not el then return "" end
  return applyStandardContentTransforms(html_text(el.html))
end

function getChapterTitle(html, url)
  -- Use the <title> tag as chapter title
  local el = html_select_first(html, "title")
  if el then
    local title = string_clean(el.text)
    -- Clean up common title patterns
    title = title:gsub("%s*[%-–|]%s*Sousetsuka.*$", "")
      :gsub("%s*[%-–|]%s*Sousetsuka's Weblog.*$", "")
      :trim()
    if title ~= "" then return title end
  end
  return nil
end
