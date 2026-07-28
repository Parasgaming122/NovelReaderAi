-- Metadata
id       = "more_novel"
name     = "MoreNovel"
version  = "1.0.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[more_novel] ✓ Bypass loaded")
else
    print("[more_novel] ⚠ Direct HTTP mode")
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

baseUrl  = "https://morenovel.net/"
language = "id"
icon     = "https://morenovel.net/wp-content/uploads/2020/03/cropped-m2-32x32.png"

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

  local selector
  if isSearch then
    selector = ".tab-content-wrap .c-tabs-item .tab-thumb a"
  else
    selector = ".tab-content-wrap .c-tabs-item .item-thumb a"
  end
  
  local items = {}
for _, a in ipairs(html_select(r, selector)) do
    local title = html_attr_raw(a, "title") or ""
    local bookUrl = a.href or ""
    local cover = html_attr(get_element_html(a), "img", "data-src") or ""
    
    if title ~= "" and bookUrl ~= "" then
      table.insert(items, { title = title, url = absUrl(bookUrl), cover = cover })
    end
  end
  
local isLast = html_select_first(r, ".nextpostslink") == nil
  return { items = items, hasNext = not isLast }
end

-- Catalog (sorted by views)
function getCatalogList(index)
  local page = index + 1
  local url = baseUrl .. "novel/?m_orderby=views"
  if page > 1 then url = url .. "&page=" .. tostring(page) end
  
  return getPagesList(index, url, false)
end

-- Search
function getCatalogSearch(index, query)
  if not query or query == "" then return { items = {}, hasNext = false } end
  
  local page = index + 1
  local url = baseUrl .. "?s=" .. url_encode(query) .. "&post_type=wp-manga&m_orderby=views"
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
  local el = html_select_first(body, "h1.entry-title, #manga-title, .post-title h1")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local cover = html_attr(body, ".profile-manga .summary_image img", "data-src")
  return cover and cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, ".content-area .summary__content p")
  if el then return applyStandardContentTransforms(html_text(el.html)) end
  return nil
end

-- Chapter list (AJAX endpoint)
function getChapterList(bookUrl)
  local chaptersUrl = bookUrl
  if not string_ends_with(chaptersUrl, "/") then chaptersUrl = chaptersUrl .. "/" end
  chaptersUrl = chaptersUrl .. "ajax/chapters/"
  
  local r = fetchPage(chaptersUrl)
if not r then return {} end

  local chapters = {}
for _, li in ipairs(html_select(r, "li.wp-manga-chapter")) do
    -- Remove span element (date/time)
    local cleaned = html
  
  local el = html_select_first(cleaned, ".reading-content .text-left, .chapter-content, #chapter-content")
  if not el then return "" end
  return applyStandardContentTransforms(html_text(el.html))
end

function getChapterTitle(html, url)
  local el = html_select_first(html, "#chapter-heading, h1.chapter-title")
  return el and string_clean(el.text) or nil
end
