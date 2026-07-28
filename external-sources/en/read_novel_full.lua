-- Metadata
id       = "read_novel_full"
name     = "ReadNovelFull"
version  = "1.0.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[read_novel_full] ✓ Bypass loaded")
else
    print("[read_novel_full] ⚠ Direct HTTP mode")
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

baseUrl  = "https://readnovelfull.com/"
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

-- Catalog (most popular)
function getCatalogList(index)
  local page = index + 1
  local url = baseUrl .. "novel-list/most-popular-novel"
  if page > 1 then url = url .. "?page=" .. tostring(page) end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

local archiveEl = html_select_first(r, ".col-novel-main.archive")
  if not archiveEl then return { items = {}, hasNext = true } end
  
  local items = {}
  for _, row in ipairs(html_select(archiveEl.html, ".row")) do
    local link = html_select_first(row.html, "a[href]")
    if link then
      local title = string_clean(link.text)
      local bookUrl = absUrl(link.href)
      local cover = html_attr(row.html, "img[src]", "src") or ""
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
    isLast = #children > 0 and string_contains(children[#children].class or "", "disabled")
  else
    isLast = true
  end
  
  return { items = items, hasNext = not isLast }
end

-- Search
function getCatalogSearch(index, query)
  if not query or query == "" then return { items = {}, hasNext = false } end
  
  local page = index + 1
  local url = baseUrl .. "novel-list/search?keyword=" .. url_encode(query)
  if page > 1 then url = url .. "&page=" .. tostring(page) end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

local archiveEl = html_select_first(r, ".col-novel-main.archive")
  if not archiveEl then return { items = {}, hasNext = true } end
  
  local items = {}
  for _, row in ipairs(html_select(archiveEl.html, ".row")) do
    local link = html_select_first(row.html, "a[href]")
    if link then
      local title = string_clean(link.text)
      local bookUrl = absUrl(link.href)
      local cover = html_attr(row.html, "img[src]", "src") or ""
      if title ~= "" and bookUrl ~= "" then
        table.insert(items, { title = title, url = bookUrl, cover = cover })
      end
    end
  end
  
  return { items = items, hasNext = not isLast }
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
  local el = html_select_first(body, "h3.title, .book-info h3, #chapter-heading")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local cover = html_attr(body, ".book img[src]", "src")
  return cover and cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, "#tab-description, .desc-text")
  if el then return applyStandardContentTransforms(html_text(el.html)) end
  return nil
end

-- Chapter list (AJAX endpoint)
function getChapterList(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return {} end
  
  -- Extract novel ID from rating element
  local idEl = html_select_first(body, "#rating")
  local novelId = idEl and html_attr_raw(idEl, "data-novel-id")
  if not novelId or novelId == "" then return {} end
  
  local apiUrl = baseUrl .. "ajax/chapter-archive?novelId=" .. novelId
  local r = fetchPage(apiUrl)
if not r then return {} end

  local chapters = {}
for _, a in ipairs(html_select(r, "a[href]")) do
    local title = string_clean(a.text)
    local href = a.href
    if href and href ~= "" then
      -- Ensure absolute URL
      local url = absUrl(href)
      if title ~= "" and url ~= "" then
        table.insert(chapters, { title = title, url = url })
      end
    end
  end
  
  return chapters
end

-- Chapter text
function getChapterText(html, url)
  local cleaned = html
  local el = html_select_first(cleaned, "#chr-content, .chapter-content, #chapter-content")
  if not el then return "" end
  return applyStandardContentTransforms(html_text(el.html))
end

function getChapterTitle(html, url)
  -- ReadNovelFull doesn't show chapter titles prominently on the page
  return nil
end
