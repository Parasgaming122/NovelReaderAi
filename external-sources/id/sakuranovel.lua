-- Metadata
id       = "sakuranovel"
name     = "SakuraNovel"
version  = "1.0.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[sakuranovel] ✓ Bypass loaded")
else
    print("[sakuranovel] ⚠ Direct HTTP mode")
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

baseUrl  = "https://sakuranovel.id/"
language = "id"

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

-- Catalog (uses flexbox2 layout)
function getCatalogList(index)
  local page = index + 1
  local url = baseUrl .. "series/"
  if page > 1 then
    url = url .. "page/" .. tostring(page) .. "/"
  end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
  -- SakuraNovel uses .flexbox2-item > .flexbox2-content pattern
for _, item in ipairs(html_select(r, ".flexbox2-item")) do
    local contentEl = html_select_first(item.html, ".flexbox2-content")
    if contentEl then
      local linkEl = html_select_first(contentEl.html, "a")
      if linkEl then
        local title = linkEl.attr.title or string_clean(linkEl.text)
        local href = absUrl(linkEl.href)
        local thumbEl = html_select_first(item.html, ".flexbox2-thumb img")
        local cover = thumbEl and (thumbEl.attr.src or "") or ""
        
        if title ~= "" and href ~= "" then
          table.insert(items, {
            title = title,
            url   = href,
            cover = absUrl(cover)
          })
        end
      end
    end
  end
  
local hasNext = html_select_first(r, "div.pagination .next") ~= nil
  return { items = items, hasNext = hasNext }
end

-- Search
function getCatalogSearch(index, query)
  if not query or query == "" then 
    return { items = {}, hasNext = false } 
  end
  
  local page = index + 1
  local url = baseUrl .. "?s=" .. url_encode(query)
  if page > 1 then
    url = url .. "&page/" .. tostring(page) .. "/"
  end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, item in ipairs(html_select(r, ".flexbox2-item")) do
    local contentEl = html_select_first(item.html, ".flexbox2-content")
    if contentEl then
      local linkEl = html_select_first(contentEl.html, "a")
      if linkEl then
        local title = linkEl.attr.title or string_clean(linkEl.text)
        local href = absUrl(linkEl.href)
        local thumbEl = html_select_first(item.html, ".flexbox2-thumb img")
        local cover = thumbEl and (thumbEl.attr.src or "") or ""
        
        if title ~= "" and href ~= "" then
          table.insert(items, {
            title = title,
            url   = href,
            cover = absUrl(cover)
          })
        end
      end
    end
  end
  
local hasNext = html_select_first(r, "div.pagination .next") ~= nil
  return { items = items, hasNext = hasNext }
end

-- Book details
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
  local el = html_select_first(body, ".series-title h1, h1.series-title, h1")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local cover = html_attr(body, ".series-thumb img", "src")
  return cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, ".series-synops")
  return el and string_trim(html_text(el.html)) or nil
end

-- Chapter list
function getChapterList(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return {} end
  
  local chapters = {}
  -- Chapter links in .series-chapterlists .flexch-infoz a
  for _, a in ipairs(html_select(body, ".series-chapterlists .flexch-infoz a")) do
    local title = a.attr.title or string_clean(a.text)
    local href = absUrl(a.href)
    
    if title ~= "" and href ~= "" then
      table.insert(chapters, {
        title = title,
        url   = href
      })
    end
  end
  
  -- Reverse for chronological order
  local reversed = {}
  for i = #chapters, 1, -1 do
    table.insert(reversed, chapters[i])
  end
  return reversed
end

function getChapterListHash(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, ".series-chapterlists .flexch-infoz a:last-child")
  return el and el.href or nil
end

-- Chapter text
function getChapterText(html, url)
  local cleaned = html