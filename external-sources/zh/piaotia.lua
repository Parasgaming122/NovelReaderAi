-- ── Метаданные ────────────────────────────────────────────────────────────────
id       = "piaotia"
name     = "PiaoTia"
version  = "1.0.0"
baseUrl  = "https://www.piaotia.com"
language = "zh"
charset  = "GBK"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[piaotia] ✓ Bypass loaded")
else
    print("[piaotia] ⚠ Direct HTTP mode")
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

icon     = "https://raw.githubusercontent.com/HnDK0/external-sources/main/icons/piaotia.png"

-- ── Хелперы ───────────────────────────────────────────────────────────────────

local function absUrl(href)
  if not href or href == "" then return "" end
  if string_starts_with(href, "http") then return href end
  if string_starts_with(href, "//") then return "https:" .. href end
  return url_resolve(baseUrl, href)
end

-- Строит URL обложки по паттерну: /FOLDERID/BOOKID/ или /FOLDERID/BOOKID.html
-- https://www.piaotia.com/files/article/image/{folderId}/{bookId}/{bookId}s.jpg
local function buildCoverUrl(bookUrl)
  local folderId, bookId = string.match(bookUrl, "/(%d+)/(%d+)%.html$")
  if not folderId then
    folderId, bookId = string.match(bookUrl, "/(%d+)/(%d+)/?$")
  end
  if not folderId then return "" end
  return "https://www.piaotia.com/files/article/image/" .. folderId .. "/" .. bookId .. "/" .. bookId .. "s.jpg"
end

-- Преобразует URL страницы книги (/bookinfo/) в URL списка глав (/html/)
local function chapterListUrl(bookUrl)
  if string.find(bookUrl, "/bookinfo/") then
    local u = bookUrl:gsub("/bookinfo/", "/html/"):gsub("%.html$", "/")
    return u
  end
  if string_ends_with(bookUrl, "/index.html") then
    return bookUrl:gsub("/index%.html$", "/")
  end
  if string_ends_with(bookUrl, ".html") then
    return bookUrl:gsub("%.html$", "/")
  end
  return bookUrl:gsub("/?$", "/")
end

local function applyStandardContentTransforms(text)
  if not text or text == "" then return "" end
  text = string_normalize(text)
  local domain = baseUrl:gsub("https?://", ""):gsub("^www%.", ""):gsub("/$", "")
  text = string.gsub(text, "(?i)" .. domain .. ".*?\\n", "")
  text = string.gsub(text, "(?i)\\A[\\s\\p{Z}\\uFEFF]*((第\\s*\\d+|Chapter\\s+\\d+)[^\\n\\r]*[\\n\\r\\s]*)+", "")
  text = string_trim(text)
  return text
end

-- ── Каталог ───────────────────────────────────────────────────────────────────

function getCatalogList(index)
  local page = index + 1
  local url = baseUrl .. "/modules/article/index.php?fullflag=1&page=" .. tostring(page)
  
  local r = fetchPage(url, { charset = "GBK" })
if not r then
    log_error("piaotia getCatalogList: HTTP " .. tostring(r.code))
    return { items = {}, hasNext = false }
  end
  
  local items = {}
  
  -- .href на элементах из html_select работает корректно для полного документа.
  -- Используем a[href*='/bookinfo/'] — точный селектор только ссылок на книги.
for _, a in ipairs(html_select(r, "a[href*='/bookinfo/']")) do
    local bookUrl = absUrl(a.href)
    local t = string_clean(a.text)
    if bookUrl ~= "" and t ~= "" then
      table.insert(items, { title = t, url = bookUrl, cover = buildCoverUrl(bookUrl) })
    end
  end
  
  return { items = items, hasNext = #items > 0 }
end

-- ── Поиск (GET, GBK, редирект на книгу при единственном результате) ───────────

function getCatalogSearch(index, query)
  local page = index + 1
  local encoded = url_encode_charset(query, "GBK")
  -- %CB%D1+%CB%F7 = "搜 索" (кнопка Submit) в GBK
  local url = baseUrl .. "/modules/article/search.php?searchtype=articlename&searchkey=" .. encoded .. "&Submit=%CB%D1+%CB%F7&page=" .. tostring(page)
  
  local r = fetchPage(url, { charset = "GBK" })
if not r then return { items = {}, hasNext = false } end

  -- Определяем — попали ли мы на страницу книги (редирект при 1 результате)
  -- Jsoup не даёт финальный URL, зато можно проверить наличие canonical или og:url
  local ogUrl = html_attr(r.body, "meta[property='og:url']", "content")
  if ogUrl == "" then
    ogUrl = html_attr(r.body, "link[rel='canonical']", "href")
  end
  
  local isBookPage = string.find(r.body, "id=\"content\"") ~= nil
                  and string.find(r.body, "bookinfo") ~= nil
    
  if isBookPage and ogUrl ~= "" and string.find(ogUrl, "/bookinfo/") then
local titleEl = html_select_first(r, "div#content h1")
    local title = titleEl and string_clean(titleEl.text) or ""
    local bookUrl = absUrl(ogUrl)
    return {
      items = { { title = title, url = bookUrl, cover = buildCoverUrl(bookUrl) } },
      hasNext = false
    }
  end
  
  local items = {}
for _, a in ipairs(html_select(r, "a[href*='/bookinfo/']")) do
    local bookUrl = absUrl(a.href)
    local t = string_clean(a.text)
    if bookUrl ~= "" and t ~= "" then
      table.insert(items, { title = t, url = bookUrl, cover = buildCoverUrl(bookUrl) })
    end
  end
  
  return { items = items, hasNext = #items > 0 }
end

-- ── Детали книги ──────────────────────────────────────────────────────────────

function getBookTitle(bookUrl)
  local r = fetchPage(bookUrl, { charset = "GBK" })
if not r then return nil end
local el = html_select_first(r, "div#content h1")
  if el then return string_clean(el.text) end
  return nil
end

function getBookCoverImageUrl(bookUrl)
  local cover = buildCoverUrl(bookUrl)
  if cover ~= "" then return cover end
  local r = fetchPage(bookUrl, { charset = "GBK" })
if not r then return nil end
  local src = html_attr(r.body, "div#content img", "src")
  if src ~= "" then return absUrl(src) end
  return nil
end

function getBookDescription(bookUrl)
  local r = fetchPage(bookUrl, { charset = "GBK" })
if not r then return nil end
local el = html_select_first(r, "div[style*='float:left']")
  if el then return string_trim(el.text) end
  return nil
end

-- ── Список глав (AJAX: /html/{bookId}/) ──────────────────────────────────────

function getChapterList(bookUrl)
  local listUrl = chapterListUrl(bookUrl)
  
  local r = fetchPage(listUrl, { charset = "GBK" })
if not r then
    log_error("piaotia: getChapterList failed for " .. listUrl)
    return {}
  end
  
  local chapters = {}
for _, a in ipairs(html_select(r, "div.centent ul li a, div#content ul li a")) do
    local href = a.href
    local chUrl
    if string_starts_with(href, "http") then
      chUrl = href
    elseif string_starts_with(href, "/") then
      chUrl = baseUrl .. href
    else
      chUrl = url_resolve(listUrl, href)
    end
    if chUrl ~= "" then
      table.insert(chapters, {
        title = string_trim(a.text),
        url   = chUrl
      })
    end
  end
  
  return chapters
end

-- ── Хэш для обновлений ────────────────────────────────────────────────────────

function getChapterListHash(bookUrl)
  local r = fetchPage(bookUrl, { charset = "GBK" })
if not r then return nil end
local el = html_select_first(r, "table.grid a[href*='html']:first-of-type")
  if el then return el.href end
  return nil
end

-- ── Текст главы ───────────────────────────────────────────────────────────────
--
-- Сайт использует document.write() для вставки div#content:
--   <script language="javascript">GetFont();</script>
-- после которого идёт сам текст главы вне тега.
--
-- Решение: заменяем тег скрипта на открывающий <div id="content">,
-- затем разбираем исправленный HTML через Jsoup.
-- html_remove очищает мусор (h1, script, div внутри), html_text возвращает текст.

function getChapterText(html, url)
  -- Заменяем маркер document.write на открывающий div
  local fixed = html:gsub(
    '<script%s+language%s*=%s*"?javascript"?>GetFont%(%);</script>',
    '<div id="content">'
  )
  fixed = fixed:gsub(
    "<script%s+language%s*=javascript>GetFont%(%);</script>",
    '<div id="content">'
  )
  
  local cleaned = html