-- Metadata
id       = "wuxia_world"
name     = "WuxiaWorld"
version  = "1.0.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[wuxia_world] ✓ Bypass loaded")
else
    print("[wuxia_world] ⚠ Direct HTTP mode")
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

baseUrl  = "https://wuxiaworld.site/"
language = "en"
icon     = "https://wuxiaworld.site/wp-content/uploads/2019/04/favicon-1.ico"

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

-- Catalog (browse)
function getCatalogList(index)
  local page = index + 1
  local url = baseUrl .. "novel/"
  if page > 1 then url = url .. "page/" .. tostring(page) .. "/" end
  url = url .. "?m_orderby=alphabet"
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, el in ipairs(html_select(r, ".page-item-detail")) do
    local link = html_select_first(el.html, "a[href]")
    if link then
      local title = html_attr(el.html, "a[href]", "title") or string_clean(link.text)
      local bookUrl = absUrl(link.href)
      local cover = html_attr(el.html, "img[data-src]", "data-src") or ""
      if title ~= "" and bookUrl ~= "" then
        table.insert(items, { title = title, url = bookUrl, cover = cover })
      end
    end
  end
  
local hasNext = html_select_first(r, "div.nav-previous.float-left") ~= nil
  return { items = items, hasNext = hasNext }
end

-- Search (only first page supported)
function getCatalogSearch(index, query)
  if not query or query == "" then return { items = {}, hasNext = false } end
  if index > 0 then return { items = {}, hasNext = false } end
  
  local url = baseUrl .. "?s=" .. url_encode(query)
    .. "&post_type=wp-manga&op=&author=&artist=&release=&adult="
    
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, el in ipairs(html_select(r, ".c-tabs-item__content")) do
    local link = html_select_first(el.html, "a[href]")
    if link then
      local title = html_attr(el.html, "a[href]", "title") or string_clean(link.text)
      local bookUrl = absUrl(link.href)
      local cover = html_attr(el.html, "img[data-src]", "data-src") or ""
      if title ~= "" and bookUrl ~= "" then
        table.insert(items, { title = title, url = bookUrl, cover = cover })
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
  local el = html_select_first(body, "h1.entry-title, h1.post-title")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local cover = html_attr(body, "div.summary_image img[data-src]", "data-src")
  return cover and cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, ".summary__content.show-more, .description__content")
  if el then return applyStandardContentTransforms(html_text(el.html)) end
  return nil
end

-- Chapter list (AJAX endpoint - POST request simulation via GET alternative)
function getChapterList(bookUrl)
  -- Try the ajax/chapters endpoint
  local chaptersUrl = bookUrl
  if not string_ends_with(chaptersUrl, "/") then chaptersUrl = chaptersUrl .. "/" end
  chaptersUrl = chaptersUrl .. "ajax/chapters/"
  
  local r = fetchPage(chaptersUrl)
if not r then return {} end

  local chapters = {}
for _, a in ipairs(html_select(r, ".wp-manga-chapter > a[href]")) do
    local title = string_clean(a.text)
    local url = absUrl(a.href)
    if title ~= "" and url ~= "" then
      table.insert(chapters, { title = title, url = url })
    end
  end
  
  -- Reverse to get chronological order (site returns newest first)
  local reversed = {}
  for i = #chapters, 1, -1 do
    table.insert(reversed, chapters[i])
  end
  return reversed
end

-- Chapter text
function getChapterText(html, url)
  local cleaned = html
  local el = html_select_first(cleaned, ".reading-content, .entry-content, .chapter-content, #chapter-content")
  if not el then return "" end
  return applyStandardContentTransforms(html_text(el.html))
end

function getChapterTitle(html, url)
  local el = html_select_first(html, ".chapter-title h3, h3.chapter-title, .bp-head, .title-info h1")
  return el and string_clean(el.text) or nil
end
