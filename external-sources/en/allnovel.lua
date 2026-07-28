-- ── Метаданные ────────────────────────────────────────────────────────────────
id       = "allnovel"
name     = "AllNovel"
version  = "1.0.3"
baseUrl  = "https://allnovel.org/"
language = "en"
icon     = "https://raw.githubusercontent.com/HnDK0/external-sources/main/icons/allnovel.png"

-- ── Хелперы ───────────────────────────────────────────────────────────────────

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[allnovel] ✓ Bypass loaded")
else
    print("[allnovel] ⚠ Direct HTTP mode")
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

-- novelBinCoverUrl: строим URL обложки из слага книги (src из каталога игнорируем)
local function transformCover(bookUrl)
  if not bookUrl or bookUrl == "" then return "" end
  local slug = string.match(bookUrl, "/([^/?#]+)%.html$") or string.match(bookUrl, "/([^/?#]+)/?$") or ""
  if slug == "" then return "" end
  return "https://images.novelbin.me/novel/" .. slug .. ".jpg"
end

local function applyStandardContentTransforms(text)
  if not text or text == "" then return "" end
  text = string_normalize(text)
  local domain = baseUrl:gsub("https?://", ""):gsub("^www%.", ""):gsub("/$", "")
  text = string.gsub(text, "(?i)" .. domain .. ".*?\\n", "")
  text = string.gsub(text, "(?i)\\A[\\s\\p{Z}\\uFEFF]*((Глава\\s+\\d+|Chapter\\s+\\d+)[^\\n\\r]*[\\n\\r\\s]*)+", "")
  text = string.gsub(text, "(?im)^\\s*(Translator|Editor|Proofreader|Read\\s+(at|on|latest))[:\\s][^\\n\\r]{0,70}(\\r?\\n|$)", "")
  text = string_trim(text)
  return text
end

-- ── Каталог ───────────────────────────────────────────────────────────────────

function getCatalogList(index)
  local page = index + 1
  local url = baseUrl .. "latest-release-novel"
  if page > 1 then url = url .. "?page=" .. tostring(page) end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, row in ipairs(html_select(r, ".col-truyen-main .row")) do
    local titleEl = html_select_first(row.html, "div.col-xs-7 > div > h3 > a")
    if titleEl then
      local bookUrl = absUrl(titleEl.href)
      table.insert(items, {
        title = string_clean(titleEl.text),
        url   = bookUrl,
        cover = transformCover(bookUrl)
      })
    end
  end
  
local hasNext = html_select_first(r, ".pagination .next, li.next a") ~= nil
  return { items = items, hasNext = hasNext }
end

-- ── Поиск ─────────────────────────────────────────────────────────────────────

function getCatalogSearch(index, query)
  local page = index + 1
  local url = baseUrl .. "search?keyword=" .. url_encode(query)
  if page > 1 then url = url .. "&page=" .. tostring(page) end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, row in ipairs(html_select(r, ".col-truyen-main .row")) do
    local titleEl = html_select_first(row.html, "div.col-xs-7 > div > h3 > a")
    if titleEl then
      local bookUrl = absUrl(titleEl.href)
      table.insert(items, {
        title = string_clean(titleEl.text),
        url   = bookUrl,
        cover = transformCover(bookUrl)
      })
    end
  end
  
local hasNext = html_select_first(r, ".pagination .next, li.next a") ~= nil
  return { items = items, hasNext = hasNext }
end

-- ── Детали книги ──────────────────────────────────────────────────────────────

function getBookTitle(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, "h3.title")
  if el then return string_clean(el.text) end
  return nil
end

function getBookCoverImageUrl(bookUrl)
  local cover = transformCover(bookUrl)
  if cover ~= "" then return cover end
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, ".book img[src]")
  if el then return absUrl(el.src) end
  return nil
end

function getBookDescription(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, ".desc-text")
  if el then return string_trim(el.text) end
  return nil
end

-- ── Список глав (PAGE_BASED) ──────────────────────────────────────────────────

function getChapterList(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return {} end

  local maxPage = 1
local lastPageEl = html_select_first(r, "#list-chapter > ul:nth-child(3) > li.last > a")
  if lastPageEl then
    local href = lastPageEl.href or ""
    local p = string.match(href, "[?&]page=(%d+)")
    if p then maxPage = tonumber(p) or 1 end
  end
  
  -- Собираем URL всех страниц (кроме первой — она уже загружена)
  local pageUrls = {}
  for page = 2, maxPage do
    table.insert(pageUrls, bookUrl .. "?page=" .. tostring(page))
  end
  
  -- Параллельная загрузка остальных страниц
  local pageResults = {}
  if #pageUrls > 0 then
    pageResults = http_get_batch(pageUrls)
  end
  
  local chapters = {}
  
  -- Страница 1 уже есть
for _, a in ipairs(html_select(r, "ul.list-chapter li a")) do
    local chUrl = absUrl(a.href)
    if chUrl ~= "" then
      table.insert(chapters, { title = string_clean(a.text), url = chUrl })
    end
  end
  
  -- Остальные страницы из batch (порядок сохранён)
  for _, pr in ipairs(pageResults) do
    if pr.success then
      for _, a in ipairs(html_select(pr.body, "ul.list-chapter li a")) do
        local chUrl = absUrl(a.href)
        if chUrl ~= "" then
          table.insert(chapters, { title = string_clean(a.text), url = chUrl })
        end
      end
    end
  end
  
  return chapters
end

-- ── Хэш для обновлений ────────────────────────────────────────────────────────

function getChapterListHash(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, ".l-chapters li:first-child a")
  if el then return el.href end
  return nil
end

-- ── Текст главы ───────────────────────────────────────────────────────────────

function getChapterText(html, url)
  local cleaned = html