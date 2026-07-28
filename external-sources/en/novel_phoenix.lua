-- Metadata
id       = "novel_phoenix"
name     = "NovelPhoenix"
version  = "1.0.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[novel_phoenix] ✓ Bypass loaded")
else
    print("[novel_phoenix] ⚠ Direct HTTP mode")
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

baseUrl  = "https://novelphoenix.com/"
language = "en"
icon     = "https://novelphoenix.com/logo.ico"

-- Cloudflare options (site may use CF protection)
cf_options = {
    whitelist = true,
    ignore_markers = { "novelphoenix" }
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

-- Check if last page based on pagination
local function isLastPage(body)
  local nav = html_select_first(body, "ul.pagination")
  if not nav then return true end
  local children = html_select(nav.html, "li")
  if #children == 0 then return true end
  local lastLi = children[#children]
  return string_contains(lastLi.class or "", "disabled")
end

-- Parse novel item from <li> element
local function parseNovelItem(liHtml)
  local link = html_select_first(liHtml, "a[href][title]") 
    or html_select_first(liHtml, "a[href*='/novel/']")
  if not link then return nil end
  
  local href = link.href or ""
  if href == "" then return nil end
  
  local title = html_attr_raw(link, "title")
  if not title or title == "" then
    local titleEl = html_select_first(liHtml, ".novel-title, h4.novel-title, .title")
    title = titleEl and string_clean(titleEl.text) or ""
  end
  title = string_trim(title:gsub(" Rank .*", ""))
  
  if #title < 2 then return nil end
  
  local cover = html_attr(liHtml, "img.lazy[data-src]", "data-src")
    or html_attr(liHtml, "img[data-src]", "data-src")
    or html_attr(liHtml, "img[src]", "src")
    or ""
  
  if string_starts_with(cover, "data:") then cover = "" end
  if cover ~= "" and not string_starts_with(cover, "http") then
    cover = absUrl(cover)
  end
  
  return {
    title = title,
    url = absUrl(href),
    cover = cover
  }
end

-- Catalog (browse all novels sorted by new)
function getCatalogList(index)
  local page = index + 1
  local url = baseUrl .. "genre-all/sort-new/status-all/all-novel"
  if page > 1 then url = url .. "?page=" .. tostring(page) end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
  local seenUrls = {}
  
for _, li in ipairs(html_select(r, "li.novel-item")) do
    local item = parseNovelItem(li.html)
    if item and not seenUrls[item.url] then
      seenUrls[item.url] = true
      table.insert(items, item)
    end
  end
  
  return { items = items, hasNext = not isLastPage(r.body) and #items > 0 }
end

-- Search (use ?keyword= parameter, NOT ?q=)
function getCatalogSearch(index, query)
  if not query or query == "" then return { items = {}, hasNext = false } end
  
  local page = index + 1
  local url = baseUrl .. "search?keyword=" .. url_encode(query)
  if page > 1 then url = url .. "&page=" .. tostring(page) end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  -- IMPORTANT: Only use ul.novel-list.chapters (actual search results)
  local items = {}
  local seenUrls = {}
  
for _, li in ipairs(html_select(r, "ul.novel-list.chapters li.novel-item")) do
    local item = parseNovelItem(li.html)
    if item and not seenUrls[item.url] then
      seenUrls[item.url] = true
      table.insert(items, item)
    end
  end
  
  return { items = items, hasNext = not isLastPage(r.body) and #items > 0 }
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
  local el = html_select_first(body, "h1.novel-title")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local cover = html_attr(body, "meta[property=og:image]", "content")
    or html_attr(body, ".novel-header .cover img[src]", "src")
    or html_attr(body, "figure.cover img[src]", "src")
  return cover and cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local summaryEl = html_select_first(body, "div.summary div.content, div.summary")
  if not summaryEl then return nil end
  -- Remove headers and expand buttons
  local cleaned = html
  
  local el = html_select_first(cleaned, "#content, #chapter-container .d-chapter-content")
  if not el then return "" end
  return applyStandardContentTransforms(html_text(el.html))
end

function getChapterTitle(html, url)
  local el = html_select_first(html, "#chapter-article .chapter-title, .chapter-title")
  return el and string_clean(el.text) or nil
end
