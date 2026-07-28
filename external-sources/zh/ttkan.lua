-- Metadata
id       = "ttkan"
name     = "TTKan"
version  = "1.0.1"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[ttkan] ✓ Bypass loaded")
else
    print("[ttkan] ⚠ Direct HTTP mode")
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

baseUrl  = "https://www.ttkan.co/"
language = "zh"
icon     = "https://raw.githubusercontent.com/Parasgaming122/external-sources/main/icons/ttkan.png"

-- Cloudflare options (site uses CF protection)
cf_options = {
    whitelist = true,
    ignore_markers = { "ttkan" }
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
  text = string.gsub(text, "(?i)\\A[\\s\\p{Z}\\uFEFF]*((第[\\d一二三四五六七八九十百]+[章节]|Chapter\\s+\\d+|Глава\\s+\\d+)[^\\n\\r]*[\\n\\r\\s]*)+", "")
  text = string.gsub(text, "(?im)^\\s*(翻译|译者|编辑|校对|更新|阅读|最新阅读)[:\\s：][^\\n\\r]{0,70}(\\r?\\n|$)", "")
  text = string_trim(text)
  return text
end

-- Extract novel_id from book URL like /novel/chapters/{novel_id}
local function extractNovelId(bookUrl)
  return string.match(bookUrl, "/novel/chapters/([^/?#]+)")
end

-- Build cover URL from slug in book URL
local function buildCoverUrl(bookUrl)
  local slug = string.match(bookUrl, "/([^/?#]+)/?$")
  if not slug or slug == "" then return "" end
  return "https://static.ttkan.co/cover/" .. slug .. ".jpg?w=250&h=300&q=100"
end

-- Catalog
function getCatalogList(index)
  local url = "https://www.ttkan.co/novel/rank"
  if index > 0 then url = url .. "?page=" .. tostring(index + 1) end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, card in ipairs(html_select(r, ".rank_list > div")) do
    local titleEl = html_select_first(card.html, "h2")
    local aEl     = html_select_first(card.html, "a[href*='/novel/chapters/']")
    if titleEl and aEl then
      local bookUrl = absUrl(aEl.href)
      local t = string_clean(titleEl.text)
      if bookUrl ~= "" and t ~= "" then
        table.insert(items, {
          title = t,
          url   = bookUrl,
          cover = buildCoverUrl(bookUrl)
        })
      end
    end
  end
  
  return { items = items, hasNext = #items > 0 }
end

-- Search
function getCatalogSearch(index, query)
  local encoded = url_encode(query)
  local url = "https://www.ttkan.co/novel/search?q=" .. encoded
  if index > 0 then url = url .. "&page=" .. tostring(index + 1) end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, card in ipairs(html_select(r, ".novel_cell")) do
    local titleEl = html_select_first(card.html, "h3")
    local aEl     = html_select_first(card.html, "a[href*='/novel/chapters/']")
    if titleEl and aEl then
      local bookUrl = absUrl(aEl.href)
      local t = string_clean(titleEl.text)
      if bookUrl ~= "" and t ~= "" then
        table.insert(items, {
          title = t,
          url   = bookUrl,
          cover = buildCoverUrl(bookUrl)
        })
      end
    end
  end
  
  return { items = items, hasNext = #items > 0 }
end

-- Book details
function getBookTitle(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, "h1")
  if el then return string_clean(el.text) end
  return nil
end

function getBookCoverImageUrl(bookUrl)
  local cover = buildCoverUrl(bookUrl)
  if cover ~= "" then return cover end
  return nil
end

function getBookDescription(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, ".description")
  if el then return string_trim(el.text) end
  return nil
end

-- Chapter list (JSON API)
function getChapterList(bookUrl)
  local novelId = extractNovelId(bookUrl)
  if not novelId or novelId == "" then
    log_error("ttkan: cannot extract novelId from " .. bookUrl)
    return {}
  end
  
  local apiUrl = "https://www.ttkan.co/api/nq/amp_novel_chapters?language=tw&novel_id=" .. novelId
  
  local r = fetchPage(apiUrl)
if not r then
    log_error("ttkan: API failed " .. tostring(r.code) .. " " .. apiUrl)
    return {}
  end
  
  local chapters = {}
  local idx = 1
  
  local names = regex_match(r.body, '"chapter_name"\\s*:\\s*"([^"]+)"')
  for _, match in ipairs(names) do
    local chapterName = string.match(match, '"chapter_name"%s*:%s*"([^"]+)"')
    if chapterName then
      chapterName = unescape_unicode(chapterName)
      local chUrl = "https://www.ttkan.co/novel/pagea/" .. novelId .. "_" .. tostring(idx) .. ".html"
      table.insert(chapters, { title = chapterName, url = chUrl })
      idx = idx + 1
    end
  end
  
  return chapters
end

-- Hash for updates
function getChapterListHash(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, "button.btn_show_all_chapters")
  if el then return string_clean(el.text) end
  return nil
end

-- Chapter text
function getChapterText(html, url)
  local cleaned = html
  local el = html_select_first(cleaned, ".content")
  if not el then return "" end
  return applyStandardContentTransforms(html_text(el.html))
end
