-- ── Метаданные ────────────────────────────────────────────────────────────────
id       = "twkan"
name     = "TWKan"
version  = "1.0.0"
baseUrl  = "https://twkan.com/"
language = "zh"
icon     = "https://raw.githubusercontent.com/HnDK0/external-sources/main/icons/twkan.png"

-- ── Хелперы ───────────────────────────────────────────────────────────────────

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[twkan] ✓ Bypass loaded")
else
    print("[twkan] ⚠ Direct HTTP mode")
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

-- ── Каталог ───────────────────────────────────────────────────────────────────

function getCatalogList(index)
  local page = index + 1
  local url
  if page == 1 then
    url = "https://twkan.com/novels/newhot_2_0_1.html"
  else
    url = "https://twkan.com/novels/newhot_2_0_" .. tostring(page) .. ".html"
  end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, li in ipairs(html_select(r, "#article_list_content li")) do
    local titleEl = html_select_first(li.html, "h3 a")
    if titleEl then
      local bookUrl = absUrl(titleEl.href)
      local cover   = html_attr(li.html, "img", "data-src")
      local t = string_clean(titleEl.text)
      if bookUrl ~= "" and t ~= "" then
        table.insert(items, { title = t, url = bookUrl, cover = absUrl(cover) })
      end
    end
  end
  
  return { items = items, hasNext = #items > 0 }
end

-- ── Поиск ─────────────────────────────────────────────────────────────────────

function getCatalogSearch(index, query)
  local page = index + 1
  local encoded = url_encode(query)
  local url = "https://twkan.com/search/" .. encoded .. "/" .. tostring(page) .. ".html"
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, li in ipairs(html_select(r, "#article_list_content li, .search-result li, li")) do
    local titleEl = html_select_first(li.html, "h3 a, h3")
    local aEl     = html_select_first(li.html, "a[href*='/book/']")
    if titleEl and aEl then
      local bookUrl = absUrl(aEl.href)
      local cover   = html_attr(li.html, "img", "data-src")
      local t = string_clean(titleEl.text)
      if bookUrl ~= "" and t ~= "" then
        table.insert(items, { title = t, url = bookUrl, cover = absUrl(cover) })
      end
    end
  end
  
  return { items = items, hasNext = #items > 0 }
end

-- ── Детали книги ──────────────────────────────────────────────────────────────

function getBookTitle(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, "h1 a")
  if el then return string_clean(el.text) end
  return nil
end

function getBookCoverImageUrl(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
  local src = html_attr(r.body, ".bookimg2 img", "src")
  if src ~= "" then return absUrl(src) end
  return nil
end

function getBookDescription(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, "#tab_info .navtxt p")
  if el then return string_trim(el.text) end
  return nil
end

-- ── Список глав (AJAX) ────────────────────────────────────────────────────────

function getChapterList(bookUrl)
  local bookId = string.match(bookUrl, "/book/([^/.]+)%.html")
  if not bookId then
    log_error("twkan: cannot extract bookId from " .. bookUrl)
    return {}
  end
  
  local ajaxUrl = "https://twkan.com/ajax_novels/chapterlist/" .. bookId .. ".html"
  local r = fetchPage(ajaxUrl)
if not r then
    log_error("twkan: AJAX failed " .. tostring(r.code))
    return {}
  end
  
  local chapters = {}
for _, a in ipairs(html_select(r, "ul li a[href]")) do
    local chUrl = absUrl(a.href)
    local t = string_trim(a.text)
    if chUrl ~= "" then
      table.insert(chapters, { title = t, url = chUrl })
    end
  end
  
  return chapters
end

-- ── Хэш для обновлений ────────────────────────────────────────────────────────

function getChapterListHash(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, ".infolist li:nth-child(2)")
  if el then return string_clean(el.text) end
  return nil
end

-- ── Текст главы ───────────────────────────────────────────────────────────────

function getChapterText(html, url)
  local cleaned = html