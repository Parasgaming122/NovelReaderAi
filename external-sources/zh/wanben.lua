-- Metadata
id       = "wanben"
name     = "万本TXT"
version  = "1.0.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[wanben] ✓ Bypass loaded")
else
    print("[wanben] ⚠ Direct HTTP mode")
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

baseUrl  = "https://www.10000txt.com/"
language = "zh"

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

-- Catalog
function getCatalogList(index)
  local url = baseUrl .. "sort/" .. tostring(index + 1) .. "/"
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, li in ipairs(html_select(r, ".book-list li, .list li")) do
    local titleEl = html_select_first(li.html, "h2 a, h3 a")
    if titleEl then
      table.insert(items, {
        title = string_clean(titleEl.text),
        url   = absUrl(titleEl.href),
        cover  = absUrl(html_attr(li.html, "img", "src"))
      })
    end
  end
  return { items = items, hasNext = #items > 0 }
end

-- Search
function getCatalogSearch(index, query)
  if index > 0 then return { items = {}, hasNext = false } end
  local url = baseUrl .. "search.php?q=" .. url_encode(query)
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, li in ipairs(html_select(r, ".result li, .book-list li")) do
    local titleEl = html_select_first(li.html, "h2 a, h3 a")
    if titleEl then
      table.insert(items, {
        title = string_clean(titleEl.text),
        url   = absUrl(titleEl.href)
      })
    end
  end
  return { items = items, hasNext = false }
end

-- Book details (fetchPage pattern)
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
  local el = html_select_first(body, "h1.title, h1.book-title")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local cover = html_attr(body, ".cover img, .fm img", "src")
  return cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, ".intro p, .desc, .description")
  return el and string_trim(el.text) or nil
end

-- Chapter list
function getChapterList(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return {} end
  
  local chapters = {}
  for _, a in ipairs(html_select(body, "#catalog a, .chapter-list a")) do
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
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, "#catalog a:last-child, .chapter-list a:last-child")
  return el and el.href or nil
end

-- Chapter text
function getChapterText(html, url)
  local cleaned = html