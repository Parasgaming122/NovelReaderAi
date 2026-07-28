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
language = "ja"

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
  text = string_trim(text)
  return text
end

-- Sousetsuka is a Base source (no catalog/search) - only chapter reading
-- It's typically used for direct book URLs

-- Catalog (returns empty - this is a single-site reader)
function getCatalogList(index)
  return { items = {}, hasNext = false }
end

-- Search (not supported for this source type)
function getCatalogSearch(index, query)
  return { items = {}, hasNext = false }
end

-- Book details (minimal - mainly for chapter extraction)
function getBookTitle(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
  -- Use page title as fallback
local el = html_select_first(r, "title")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  return nil  -- Not available on Sousetsuka
end

function getBookDescription(bookUrl)
  return nil  -- Not available on Sousetsuka
end

-- Chapter list (Sousetsuka shows full content on one page)
function getChapterList(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return {} end
  
  -- Return the URL itself as a single "chapter" since content is on the page
local titleEl = html_select_first(r, "title")
  local title = titleEl and string_clean(titleEl.text) or "Chapter 1"
  
  return {
    {
      title = title,
      url   = bookUrl
    }
  }
end

function getChapterListHash(bookUrl)
  return bookUrl
end

-- Chapter text (main content area)
function getChapterText(html, url)
  local cleaned = html