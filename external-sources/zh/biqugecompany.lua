-- Metadata
id       = "biqugecompany"
name     = "笔趣阁Company"
version  = "1.0.1"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[biqugecompany] ✓ Bypass loaded")
else
    print("[biqugecompany] ⚠ Direct HTTP mode")
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

baseUrl  = "https://www.biquge.company/"
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

-- Catalog (uses /sort/0/1.html with book links)
function getCatalogList(index)
  -- Use sort pages for catalog
  local url = baseUrl .. "sort/0/" .. tostring(index + 1) .. ".html"
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
  -- BiQuGeCompany uses a[href*="/book"] pattern on sort pages
for _, a in ipairs(html_select(r, 'a[href*="/book/"]')) do
    local title = string_clean(a.text)
    local href = absUrl(a.href)
    if title ~= "" and href ~= "" then
      -- Avoid duplicates
      local exists = false
      for _, item in ipairs(items) do
        if item.url == href then exists = true; break end
      end
      if not exists then
        table.insert(items, {
          title = title,
          url   = href,
          cover  = nil  -- Cover may be available from img sibling
        })
      end
    end
  end
  
  return { items = items, hasNext = #items > 0 }
end

-- Search (POST to /modules/article/search.php)
function getCatalogSearch(index, query)
  if index > 0 then return { items = {}, hasNext = false } end
  
  -- POST request to search module
  local r = http_post(baseUrl .. "modules/article/search.php", { 
    searchkey = query,
    searchtype = "all" 
  })
  if not r.success then return { items = {}, hasNext = false } end
  
  local items = {}
  -- Search results use a[href*="/book"] pattern
  for _, a in ipairs(html_select(r.body, 'a[href*="/book/"], .result-list a')) do
    local title = string_clean(a.text)
    local href = absUrl(a.href)
    if title ~= "" and href ~= "" then
      table.insert(items, {
        title = title,
        url   = href
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
  local el = html_select_first(body, "h1")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  -- Try multiple cover patterns
  local cover = html_attr(body, "#fmimg img, .book-info img, .cover img, div[id*='fm'] img", "src")
  return cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, "#intro, .intro, .desc, .book-intro")
  return el and string_trim(el.text) or nil
end

-- Chapter list (uses /read/BOOKID/CHAPTERID.html pattern)
function getChapterList(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return {} end
  
  local chapters = {}
  -- Chapter links are in the main content area
  for _, a in ipairs(html_select(body, "a[href*='/read/" .. bookUrl:match("/(%d+)%.html") .. "/']")) do
    local chUrl = absUrl(a.href)
    if chUrl ~= "" then
      table.insert(chapters, {
        title = string_clean(a.text),
        url   = chUrl
      })
    end
  end
  
  -- Fallback: any chapter-like links
  if #chapters == 0 then
    for _, a in ipairs(html_select(body, "a[href*='/read/'], #list a, dl dd a")) do
      local chUrl = absUrl(a.href)
      if chUrl ~= "" and chUrl ~= bookUrl then
        table.insert(chapters, {
          title = string_clean(a.text),
          url   = chUrl
        })
      end
    end
  end
  
  return chapters
end

function getChapterListHash(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, "a[href*='/read/']:last-child, #list a:last-child")
  return el and el.href or nil
end

-- Chapter text
function getChapterText(html, url)
  local cleaned = html