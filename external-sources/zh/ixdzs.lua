-- Metadata
id       = "ixdzs"
name     = "爱下电子书"
version  = "1.0.1"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[ixdzs] ✓ Bypass loaded")
else
    print("[ixdzs] ⚠ Direct HTTP mode")
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

baseUrl  = "https://ixdzs8.com/"
language = "zh"

-- Cloudflare options (chapter pages use CF protection)
cf_options = {
    whitelist = true,
    ignore_markers = { "ixdzs" }
    }
    
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
  -- Fixed: Use /sort/{N}/ instead of /rank.php?page=N (which returns 404)
  local url = baseUrl .. "sort/" .. tostring(index + 1) .. "/"
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, li in ipairs(html_select(r, "main div.panel ul.u-list li.burl")) do
    local titleEl = html_select_first(li.html, "h3 a")
    if titleEl then
      table.insert(items, {
        title = string_clean(titleEl.text),
        url   = absUrl(titleEl.href),
        cover  = absUrl(html_attr(li.html, "div.l-img img", "src"))
      })
    end
  end
  return { items = items, hasNext = #items > 0 }
end

-- Search
function getCatalogSearch(index, query)
  if index > 0 then return { items = {}, hasNext = false } end
  local url = baseUrl .. "bsearch?q=" .. url_encode(query)
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, li in ipairs(html_select(r, "main div.panel ul.u-list li.burl")) do
    local titleEl = html_select_first(li.html, "h3 a")
    if titleEl then
      table.insert(items, {
        title = string_clean(titleEl.text),
        url   = absUrl(titleEl.href)
      })
    end
  end
  return { items = items, hasNext = false }
end

-- Book details (using fetchPage pattern to avoid duplicate requests)
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
  local el = html_select_first(body, "div.n-text h1")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local cover = html_attr(body, "div.n-img img", "src")
  return cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, "p#intro")
  return el and string_trim(el.text) or nil
end

-- Chapter list
function getChapterList(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return {} end
  
  -- Get last chapter URL to determine count
  local lastChap = html_select_first(body, "ul.u-chapter li:first-child a")
  if not lastChap then return {} end
  
  local lastUrl = lastChap.href
  local lastId = string.match(lastUrl, "/p(%d+)%.html$")
  if not lastId then return {} end
  
  local chapters = {}
  for i = 1, tonumber(lastId) do
    table.insert(chapters, {
      title = "第" .. i .. "章",
      url   = bookUrl .. "/p" .. i .. ".html"
    })
  end
  return chapters
end

function getChapterListHash(bookUrl)
  local r = http_get(bookUrl) -- fresh request for hash
  if not r.success then return nil end
  local el = html_select_first(r.body, "ul.u-chapter li:first-child a")
  return el and el.href or nil
end

-- Chapter text
function getChapterText(html, url)
  local cleaned = html