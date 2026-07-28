-- Metadata
id       = "baca_lightnovel"
name     = "BacaLightnovel"
version  = "1.0.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[baca_lightnovel] ✓ Bypass loaded")
else
    print("[baca_lightnovel] ⚠ Direct HTTP mode")
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

baseUrl  = "https://bacalightnovel.co/"
language = "id"
icon     = "https://bacalightnovel.co/wp-content/uploads/2022/09/cropped-fav-32x32.png"

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
  text = string.gsub(text, "(?i)\\A[\\s\\p{Z}\\uFEFF]*((第[\\d一二三四五六七八九十百]+[章节]|Chapter\\s+\\d+|Bab\\s+\\d+)[^\\n\\r]*[\\n\\r\\s]*)+", "")
  text = string_trim(text)
  return text
end

-- Shared function for catalog/search pages
local function getPagesList(index, url, isSearch)
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, el in ipairs(html_select(r, ".listupd > .maindet .mdthumb a")) do
    local title = html_attr(el.html, "img", "title") or ""
    local bookUrl = el.href or ""
    local cover = html_attr(el.html, "img", "src") or ""
    
    if title ~= "" and bookUrl ~= "" then
      table.insert(items, { title = title, url = absUrl(bookUrl), cover = cover })
    end
  end
  
  -- Check pagination
  local isLast
  if isSearch then
  isLast = html_select_first(r, ".bixbox .pagination .next") == nil
  else
  isLast = html_select_first(r, ".bixbox .hpage .r") == nil
  end
  
  return { items = items, hasNext = not isLast }
end

-- Catalog (series list)
function getCatalogList(index)
  local page = index + 1
  local url = baseUrl .. "series/"
  if page > 1 then url = url .. "?page=" .. tostring(page) .. "&order=populer" end
  
  return getPagesList(index, url, false)
end

-- Search
function getCatalogSearch(index, query)
  if not query or query == "" then return { items = {}, hasNext = false } end
  
  local page = index + 1
  local url = baseUrl .. "?s=" .. url_encode(query)
  if page > 1 then url = url .. "&page=" .. tostring(page) end
  
  return getPagesList(index, url, true)
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
  local el = html_select_first(body, "h1.entry-title")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local cover = html_attr(body, ".sertothumb img", "src")
  return cover and cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, "div[itemprop=description]")
  if el then return applyStandardContentTransforms(html_text(el.html)) end
  return nil
end

-- Chapter list
function getChapterList(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return {} end
  
  local chapters = {}
  for _, li in ipairs(html_select(body, ".eplister li")) do
    local titleEl = html_select_first(li.html, ".epl-title")
    local link = html_select_first(li.html, "a")
    if titleEl and link then
      local title = string_clean(titleEl.text)
      local url = absUrl(link.href or "")
      if title ~= "" and url ~= "" then
        table.insert(chapters, { title = title, url = url })
      end
    end
  end
  
  -- Reverse to chronological order (site shows newest first)
  local reversed = {}
  for i = #chapters, 1, -1 do
    table.insert(reversed, chapters[i])
  end
  return reversed
end

-- Chapter text
function getChapterText(html, url)
  local cleaned = html
  
  local el = html_select_first(cleaned, ".epcontent[itemprop=text] .text-left, div[itemprop=description] .text-left")
  if not el then return "" end
  return applyStandardContentTransforms(html_text(el.html))
end

function getChapterTitle(html, url)
  local el = html_select_first(html, "h1[class=entry-title], h1.entry-title")
  return el and string_clean(el.text) or nil
end
