-- ── Метаданные ────────────────────────────────────────────────────────────────

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[ifreedom] ✓ Bypass loaded")
else
    print("[ifreedom] ⚠ Direct HTTP mode")
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

id       = "ifreedom"
name     = "iFreedom"
version  = "1.1.3"
baseUrl  = "https://ifreedom.su/"
language = "ru"
icon     = "https://raw.githubusercontent.com/HnDK0/external-sources/main/icons/ifreedom.png"

-- ── Хелперы ───────────────────────────────────────────────────────────────────

local function absUrl(href)
  if not href or href == "" then return "" end
  if string_starts_with(href, "http") then return href end
  if string_starts_with(href, "//") then return "https:" .. href end
  return url_resolve(baseUrl, href)
end

local function normalizeNovelUrl(url)
  if not url or url == "" then return "" end
  if url:find("%?") then return url end
  if url:sub(-1) ~= "/" then
    return url .. "/"
  end
  return url
end

local function applyStandardContentTransforms(text)
  if not text or text == "" then return "" end
  text = string_normalize(text)
  local domain = baseUrl:gsub("https?://", ""):gsub("^www%.", ""):gsub("/$", "")
  text = string.gsub(text, "(?i)" .. domain .. ".*?\\n", "")
  text = string.gsub(text, "(?i)\\A[\\s\\p{Z}\\uFEFF]*((Глава\\s+\\d+|Chapter\\s+\\d+)[^\\n\\r]*[\\n\\r\\s]*)+", "")
  text = string.gsub(text, "(?im)^\\s*(Перевод|Переводчик|Редакция|Редактор|Аннотация|Сайт|Источник|Студия)[:\\s][^\\n\\r]{0,70}(\\r?\\n|$)", "")
  text = string.gsub(text, "(?im)^\\s*(Translator|Editor|Proofreader|Read\\s+(at|on|latest))[:\\s][^\\n\\r]{0,70}(\\r?\\n|$)", "")
  text = string_trim(text)
  return text
end

-- ── Каталог ───────────────────────────────────────────────────────────────────

function getCatalogList(index)
  local url = baseUrl .. "vse-knigi/?sort=" .. url_encode("По рейтингу")
              .. "&bpage=" .. tostring(index + 1)
    
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, card in ipairs(html_select(r, ".booksearch .item-book-slide")) do
    local titleEl = html_select_first(card.html, ".block-book-slide-title")
    local bookUrl = normalizeNovelUrl(absUrl(html_attr(card.html, "a", "href")))
    local cover   = absUrl(html_attr(card.html, "img", "src"))
    if titleEl and bookUrl ~= "" then
      table.insert(items, {
        title = string_clean(titleEl.text),
        url   = bookUrl,
        cover = cover
      })
    end
  end
  
  return { items = items, hasNext = #items > 0 }
end

-- ── Поиск ─────────────────────────────────────────────────────────────────────

function getCatalogSearch(index, query)
  local url = baseUrl .. "vse-knigi/?searchname=" .. url_encode(query) .. "&bpage=" .. tostring(index + 1)
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, card in ipairs(html_select(r, ".booksearch .item-book-slide")) do
    local titleEl = html_select_first(card.html, ".block-book-slide-title")
    local bookUrl = normalizeNovelUrl(absUrl(html_attr(card.html, "a", "href")))
    local cover   = absUrl(html_attr(card.html, "img", "src"))
    if titleEl and bookUrl ~= "" then
      table.insert(items, {
        title = string_clean(titleEl.text),
        url   = bookUrl,
        cover = cover
      })
    end
  end
  
  return { items = items, hasNext = #items > 0 }
end

-- ── Детали книги ──────────────────────────────────────────────────────────────

function getBookTitle(bookUrl)
  bookUrl = normalizeNovelUrl(bookUrl)
  
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, "h1")
  if el then return string_clean(el.text) end
  return nil
end

function getBookCoverImageUrl(bookUrl)
  bookUrl = normalizeNovelUrl(bookUrl)
  
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, "div.book-img.block-book-slide-img > img")
  if el then return absUrl(el.src) end
  return nil
end

function getBookDescription(bookUrl)
  bookUrl = normalizeNovelUrl(bookUrl)
  
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, "[data-name=\"Описание\"]")
  if el then return string_trim(el.text) end
  return nil
end

function getBookGenres(bookUrl)
  bookUrl = normalizeNovelUrl(bookUrl)
  
  local r = fetchPage(bookUrl)
if not r then return {} end

  local genres = {}
for _, block in ipairs(html_select(r, "div.book-info-list")) do
    local icon = html_select_first(block.html, "svg.icon-tabler-tag")
    if icon then
      for _, a in ipairs(html_select(block.html, "a")) do
        local label = string_trim(a.text)
        if label ~= "" then table.insert(genres, label) end
      end
    end
  end
  
  if #genres == 0 then
for _, a in ipairs(html_select(r, "div.genreslist a")) do
      local label = string_trim(a.text)
      if label ~= "" then table.insert(genres, label) end
    end
  end
  
  return genres
end

-- ── Список глав ───────────────────────────────────────────────────────────────

function getChapterList(bookUrl)
  bookUrl = normalizeNovelUrl(bookUrl)
  
  local r = fetchPage(bookUrl)
if not r then return {} end

  local chapters = {}
for _, a in ipairs(html_select(r, "div.chapterinfo a")) do
    local chUrl = absUrl(a.href)
    if chUrl ~= "" then
      table.insert(chapters, {
        title = string_clean(a.text),
        url   = chUrl
      })
    end
  end
  
  local reversed = {}
  for i = #chapters, 1, -1 do
    table.insert(reversed, chapters[i])
  end
  return reversed
end

-- ── Хэш для обновлений ────────────────────────────────────────────────────────

function getChapterListHash(bookUrl)
  bookUrl = normalizeNovelUrl(bookUrl)
  
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, "div.book-info-list:has(svg.icon-tabler-list-check) div")
  if el then return string_clean(el.text) end
  return nil
end

-- ── Текст главы ───────────────────────────────────────────────────────────────

function getChapterText(html, url)
  local cleaned = html