-- Metadata
id       = "morenovel"
name     = "MoreNovel"
version  = "1.0.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[morenovel] ✓ Bypass loaded")
else
    print("[morenovel] ⚠ Direct HTTP mode")
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

-- Catalog (WordPress manga theme)
function getCatalogList(index)
  local page = index + 1
  local url = baseUrl .. "novel/?m_orderby=views"
  if page > 1 then
    url = url .. "&page/" .. tostring(page) .. "/"
  end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, a in ipairs(html_select(r, ".tab-content-wrap .c-tabs-item .item-thumb a")) do
    local title = a.attr.title or a.text
    title = string_clean(title)
    local href = absUrl(a.href)
    -- Cover uses data-src for lazy loading
    local cover = html_attr(a.html, "img", "data-src") or html_attr(a.html, "img", "src") or ""
    
    if title ~= "" and href ~= "" then
      table.insert(items, {
        title = title,
        url   = href,
        cover = absUrl(cover)
      })
    end
  end
  
local hasNext = html_select_first(r, ".nextpostslink") ~= nil
  return { items = items, hasNext = hasNext }
end

-- Search
function getCatalogSearch(index, query)
  if not query or query == "" then 
    return { items = {}, hasNext = false } 
  end
  
  local page = index + 1
  local url = baseUrl .. "?s=" .. url_encode(query) .. "&post_type=wp-manga&m_orderby=views"
  if page > 1 then
    url = url .. "&page/" .. tostring(page) .. "/"
  end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, a in ipairs(html_select(r, ".tab-content-wrap .c-tabs-item .tab-thumb a")) do
    local title = a.attr.title or a.text
    title = string_clean(title)
    local href = absUrl(a.href)
    local cover = html_attr(a.html, "img", "data-src") or html_attr(a.html, "img", "src") or ""
    
    if title ~= "" and href ~= "" then
      table.insert(items, {
        title = title,
        url   = href,
        cover = absUrl(cover)
      })
    end
  end
  
local hasNext = html_select_first(r, ".nextpostslink") ~= nil
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
  local el = html_select_first(body, ".post-title h1, h1.post-title, #manga-title, h1")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local cover = html_attr(body, ".profile-manga .summary_image img", "data-src")
         or html_attr(body, ".profile-manga .summary_image img", "src")
         or html_attr(body, ".summary_image img", "data-src")
  return cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, ".content-area .summary__content p")
  return el and string_trim(html_text(el.html)) or nil
end

-- Chapter list (AJAX endpoint)
function getChapterList(bookUrl)
  local ajaxUrl = bookUrl .. "/ajax/chapters/"
  local r = http_post(ajaxUrl, {})
  
  if not r.success then
    r = http_get(bookUrl)
    if not r.success then return {} end
  end
  
  local chapters = {}
  local chapterItems = html_select(r.body, "li.wp-manga-chapter")
  
  for _, li in ipairs(chapterItems) do
    local cleaned = html