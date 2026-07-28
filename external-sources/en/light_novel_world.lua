-- Metadata
id       = "light_novel_world"
name     = "LightNovelWorld"
version  = "1.0.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[light_novel_world] ✓ Bypass loaded")
else
    print("[light_novel_world] ⚠ Direct HTTP mode")
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

baseUrl  = "https://www.lightnovelworld.com/"
language = "en"
icon     = "https://static.lightnovelworld.com/content/img/lightnovelworld/favicon.png"

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

-- Catalog (popular novels)
function getCatalogList(index)
  local page = index + 1
  local url = baseUrl .. "genre/all/popular/all/"
  if page > 1 then url = url .. tostring(page) .. "/" end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, el in ipairs(html_select(r, ".novel-item")) do
    local book = html_select_first(el.html, "a[title]")
    if book then
      local title = html_attr_raw(book, "title") or ""
      local bookUrl = absUrl(book.href)
      local cover = html_attr(el.html, ".novel-cover > img[data-src]", "data-src") or ""
      
      if title ~= "" and bookUrl ~= "" then
        table.insert(items, { title = title, url = bookUrl, cover = cover })
      end
    end
  end
  
  -- Check pagination
local nav = html_select_first(r, "ul.pagination")
  local isLast = true
  if nav then
    local children = html_select(nav.html, "li")
    isLast = #children > 0 and string_contains(children[#children].class or "", "active")
  else
    isLast = true
  end
  
  return { items = items, hasNext = not isLast }
end

-- Search (currently returns empty - TODO: fix to see more than first page)
function getCatalogSearch(index, query)
  -- Search not fully implemented in original; returns empty for now
  return { items = {}, hasNext = false }
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
  local el = html_select_first(body, ".novel-info .title, h1.title")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local cover = html_attr(body, ".cover > img[data-src]", "data-src")
  return cover and cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, ".summary > .content, .novel-summary")
  if el then return applyStandardContentTransforms(html_text(el.html)) end
  return nil
end

-- Chapter list (paginated - up to 200 pages)
function getChapterList(bookUrl)
  local allChapters = {}
  
  -- Build base chapters URL
  local baseChaptersUrl = bookUrl
  if not string_ends_with(baseChaptersUrl, "/") then
    baseChaptersUrl = baseChaptersUrl .. "/"
  end
  baseChaptersUrl = baseChaptersUrl .. "chapters/"
  
  -- Safety cap at 200 pages
  for page = 1, 200 do
    local pageUrl = baseChaptersUrl .. "page-" .. tostring(page) .. "/"
    
    local r = fetchPage(pageUrl)
if not r then break end
    
    local pageChapters = {}
for _, li in ipairs(html_select(r, ".chapter-list > li > a")) do
      local title = html_attr_raw(li, "title") or string_clean(li.text)
      local url = absUrl(li.href)
      if title ~= "" and url ~= "" then
        table.insert(pageChapters, { title = title, url = url })
      end
    end
    
    if #pageChapters == 0 then break end
    
    for _, ch in ipairs(pageChapters) do
      table.insert(allChapters, ch)
    end
  end
  
  return allChapters
end

-- Chapter text
function getChapterText(html, url)
  local cleaned = html
  local el = html_select_first(cleaned, "#chapter-container, .chapter-content, #chapter-content")
  if not el then return "" end
  return applyStandardContentTransforms(html_text(el.html))
end

function getChapterTitle(html, url)
  local el = html_select_first(html, ".chapter-title, h1.title")
  return el and string_clean(el.text) or nil
end
