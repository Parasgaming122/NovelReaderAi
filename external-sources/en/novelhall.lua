-- Metadata
id       = "novelhall"
name     = "NovelHall"
version  = "1.0.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[novelhall] ✓ Bypass loaded")
else
    print("[novelhall] ⚠ Direct HTTP mode")
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

baseUrl  = "https://www.novelhall.com/"
language = "en"

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

-- Check pagination
local function isLastPage(body)
  local nav = html_select_first(body, "div.page-nav")
  if not nav then return true end
  local children = html_select(nav.html, "*")
  if #children == 0 then return true end
  local lastChild = children[#children]
  return string_contains(lastChild.tag or "", "span") or string_contains(lastChild.class or "", "current")
end

-- Catalog (all novels)
function getCatalogList(index)
  local page = index + 1
  local url
  if page == 1 then
    url = baseUrl .. "all.html"
  else
    url = baseUrl .. "all-" .. tostring(page) .. ".html"
  end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, li in ipairs(html_select(r, "li.btm")) do
    local link = html_select_first(li.html, "a[href]")
    if link then
      local title = string_clean(link.text)
      local bookUrl = absUrl(link.href)
      
      if title ~= "" and bookUrl ~= "" then
        table.insert(items, { title = title, url = bookUrl })
      end
    end
  end
  
  return { items = items, hasNext = not isLastPage(r.body) }
end

-- Search
function getCatalogSearch(index, query)
  if not query or query == "" then return { items = {}, hasNext = false } end
  
  local url = baseUrl .. "index.php?s=so&module=book&keyword=" .. url_encode(query)
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
  -- Search results are in a table structure
local links = html_select(r, ".section3.inner.mt30 > table tr > td:nth-child(2) > a[href]")
  
  for _, link in ipairs(links) do
    local title = string_clean(link.text)
    local bookUrl = absUrl(link.href or "")
    
    if title ~= "" and bookUrl ~= "" then
      table.insert(items, { title = title, url = bookUrl })
    end
  end
  
  return { items = items, hasNext = not isLastPage(r.body) }
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
  local el = html_select_first(body, "h1, .book-info h1, .title")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local cover = html_attr(body, ".book-img.hidden-xs img[src]", "src")
  return cover and cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, "span.js-close-wrap")
  if el then return applyStandardContentTransforms(html_text(el.html)) end
  return nil
end

-- Chapter list
function getChapterList(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return {} end
  
  local chapters = {}
  for _, a in ipairs(html_select(body, "#morelist a[href]")) do
    local title = string_clean(a.text)
    local url = absUrl(a.href or "")
    
    if title ~= "" and url ~= "" then
      table.insert(chapters, { title = title, url = url })
    end
  end
  
  return chapters
end

-- Chapter text
function getChapterText(html, url)
  local cleaned = html
  
  local el = html_select_first(cleaned, "div#htmlContent, div.content, #content")
  if not el then return "" end
  return applyStandardContentTransforms(html_text(el.html))
end

function getChapterTitle(html, url)
  return nil
end
