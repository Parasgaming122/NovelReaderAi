-- Metadata
id       = "wuxia_box"
name     = "WuxiaBox"
version  = "1.0.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[wuxia_box] ✓ Bypass loaded")
else
    print("[wuxia_box] ⚠ Direct HTTP mode")
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

baseUrl  = "https://www.wuxiabox.com/"
language = "en"
icon     = "https://www.wuxiabox.com/favicon.ico"

-- Cloudflare options (site uses managed challenge)
cf_options = {
    whitelist = true,
    ignore_markers = { "wuxiabox" }
    }
    
-- NOTE: Site may be behind Cloudflare managed challenge. Based on archived HTML (2026-05-13).

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

-- Extract book slug from URL
local function extractSlug(bookUrl)
  return string.match(bookUrl, "/([^/]+)%.html$") or ""
end

-- Catalog (all novels)
function getCatalogList(index)
  local page = index + 1
  local url
  if page == 1 then
    url = baseUrl .. "category/all.html"
  else
    url = baseUrl .. "category/all/" .. tostring(page) .. ".html"
  end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
  local seenUrls = {}
  
for _, a in ipairs(html_select(r, "a[href*='/novel/']")) do
    local href = a.href
    if href and href ~= "" then
      -- Skip chapter links (_<N>.html pattern)
      if not string_match(href, "_%d+%.html$") then
        local url = absUrl(href)
        
        local title = html_attr_raw(a, "title")
        if not title or title == "" then
          local titleEl = html_select_first(get_element_html(a), "h2, h3, h4, .title, .novel-title")
          title = titleEl and string_clean(titleEl.text) or ""
        end
        title = string_trim(title)
        
        if #title >= 2 and url ~= "" and not seenUrls[url] then
          seenUrls[url] = true
          
          local cover = html_attr(get_element_html(a), "img[data-src]", "data-src")
            or html_attr(get_element_html(a), "img[src]", "src")
            or ""
          if cover ~= "" and not string_starts_with(cover, "http") then
            cover = absUrl(cover)
          end
          if string_starts_with(cover, "data:") then cover = "" end
          
          table.insert(items, { title = title, url = url, cover = cover })
        end
      end
    end
  end
  
local hasNext = html_select_first(r, "a.next[href], .pagination a[rel=next]") ~= nil
  
  return { items = items, hasNext = hasNext and #items > 0 }
end

-- Search
function getCatalogSearch(index, query)
  if not query or query == "" then return { items = {}, hasNext = false } end
  
  local page = index + 1
  local url = baseUrl .. "search.html?searchkey=" .. url_encode(query)
  if page > 1 then url = url .. "&page=" .. tostring(page) end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
  local seenUrls = {}
  
for _, a in ipairs(html_select(r, "a[href*='/novel/']")) do
    local href = a.href
    if href and href ~= "" then
      if not string_match(href, "_%d+%.html$") then
        local url = absUrl(href)
        
        local title = html_attr_raw(a, "title")
        if not title or title == "" then
          local titleEl = html_select_first(get_element_html(a), "h2, h3, h4, .title, .novel-title")
          title = titleEl and string_clean(titleEl.text) or ""
        end
        title = string_trim(title)
        
        if #title >= 2 and url ~= "" and not seenUrls[url] then
          seenUrls[url] = true
          
          local cover = html_attr(get_element_html(a), "img[data-src]", "data-src")
            or html_attr(get_element_html(a), "img[src]", "src")
            or ""
          if cover ~= "" and not string_starts_with(cover, "http") then
            cover = absUrl(cover)
          end
          if string_starts_with(cover, "data:") then cover = "" end
          
          table.insert(items, { title = title, url = url, cover = cover })
        end
      end
    end
  end
  
local hasNext = html_select_first(r, "a.next[href], .pagination a[rel=next]") ~= nil
  
  return { items = items, hasNext = hasNext and #items > 0 }
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
  local cover = html_attr(body, "img[src*='/d/file/cover']", "src")
    or html_attr(body, ".novel-header .cover img[src]", "src")
    or html_attr(body, "figure.cover img[src]", "src")
    or html_attr(body, "meta[property=og:image]", "content")
  return cover and cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local descEl = html_select_first(body, "div.summary div.content, div.summary, p.description")
  if not descEl then return nil end
  local cleaned = html
  
  local el = html_select_first(cleaned, "#content, .chapter-content, #chapter-content, #chaptercontent, .read-content, .reading-content, article.content")
  if not el then return "" end
  return applyStandardContentTransforms(html_text(el.html))
end

function getChapterTitle(html, url)
  local el = html_select_first(html, ".chapter-title, h1")
  if not el then
    el = html_select_first(html, "title")
  end
  return el and string_clean(el.text) or nil
end
