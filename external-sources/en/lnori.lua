-- Metadata
id       = "lnori"
name     = "Lnori"
version  = "1.0.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[lnori] ✓ Bypass loaded")
else
    print("[lnori] ⚠ Direct HTTP mode")
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

baseUrl  = "https://lnori.com/"
language = "en"
icon     = "https://lnori.com/favicon.ico"

-- NOTE: Volume-based structure (not chapter-based).
-- Each "series" has multiple volumes, each volume is a readable unit.

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
  text = string.gsub(text, "(?i)\\A[\\s\\p{Z}\\uFEFF]*((第[\\d一二三四五六七八九十百]+[章节]|Chapter\\s+\\d+|Volume\\s+\\d+)[^\\n\\r]*[\\n\\r\\s]*)+", "")
  text = string_trim(text)
  return text
end

-- Extract volume number from title for sorting
local function extractVolumeNumber(title)
  local match = string_match(title, "(?:Vol(?:ume)?%.?%s*)(%d+)")
  if match then return tonumber(match) or 999 end
  return 999
end

-- Catalog (home page - no pagination)
function getCatalogList(index)
  if index > 0 then return { items = {}, hasNext = false } end
  
  local r = fetchPage(baseUrl)
if not r then return { items = {}, hasNext = false } end

  local items = {}
  local seenUrls = {}
  
  -- Series links on home page
for _, a in ipairs(html_select(r, "a[href*='/series/']")) do
    local href = a.href
    if href and href ~= "" then
      local url = absUrl(href)
      if not seenUrls[url] then
        seenUrls[url] = true
        
        local title = string_clean(a.text):gsub("\n", " "):gsub("%s+", " "):trim()
        
        if #title >= 2 then
          local cover = html_attr(get_element_html(a), "img[src]", "src") or ""
          if cover ~= "" and not string_starts_with(cover, "http") then
            cover = absUrl(cover)
          end
          
          table.insert(items, { title = title, url = url, cover = cover })
        end
      end
    end
  end
  
  return { items = items, hasNext = false }
end

-- Search
function getCatalogSearch(index, query)
  if not query or query == "" then return { items = {}, hasNext = false } end
  if index > 0 then return { items = {}, hasNext = false } end
  
  local url = baseUrl .. "search?q=" .. url_encode(query)
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
  local seenUrls = {}
  
for _, a in ipairs(html_select(r, "a[href*='/series/']")) do
    local href = a.href
    if href and href ~= "" then
      local url = absUrl(href)
      if not seenUrls[url] then
        seenUrls[url] = true
        
        local title = string_clean(a.text):gsub("\n", " "):gsub("%s+", " "):trim()
        
        if #title >= 2 then
          local cover = html_attr(get_element_html(a), "img[src]", "src") or ""
          if cover ~= "" and not string_starts_with(cover, "http") then
            cover = absUrl(cover)
          end
          
          table.insert(items, { title = title, url = url, cover = cover })
        end
      end
    end
  end
  
  return { items = items, hasNext = true }
end

-- Book details with caching
local _pageCache = {}
local function fetchPage(url)
  if _pageCache[url] then return _pageCache[url] end
  local r = fetchPage(url)
  if r.success then _pageCache[url] = r.body end
  return r.success and r.body or nil
end

function getBookTitle(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, "h1")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  -- Try og:image first (series cover)
  local cover = html_attr(body, "meta[property=og:image]", "content")
    or html_attr(body, "img[alt*=Cover]", "src")
    or html_attr(body, ".series-cover img[src]", "src")
  return cover and cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, ".description")
  if not el then return nil end
  -- Remove headings from description
  local cleaned = el.html
  
  local el = html_select_first(cleaned, "article.content-body, article.content")
  if not el then return "" end
  return applyStandardContentTransforms(html_text(el.html))
end

function getChapterTitle(html, url)
  -- The h1 on the reader page is the volume title
  local el = html_select_first(html, "article.content-body h1, h1")
  return el and string_clean(el.text) or nil
end
