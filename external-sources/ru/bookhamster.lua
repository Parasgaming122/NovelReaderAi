-- ── Метаданные ────────────────────────────────────────────────────────────────

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[bookhamster] ✓ Bypass loaded")
else
    print("[bookhamster] ⚠ Direct HTTP mode")
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

id       = "bookhamster"
name     = "Bookhamster"
version  = "1.1.2"
baseUrl  = "https://bookhamster.ru/"
language = "ru"
icon     = "https://raw.githubusercontent.com/HnDK0/external-sources/main/icons/bookhamster.png"

-- ── Хелперы ───────────────────────────────────────────────────────────────────

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
for _, card in ipairs(html_select(r, "div.one-book-home")) do
    local titleEl = html_select_first(card.html, "div.title-home a")
    local bookUrl = absUrl(html_attr(card.html, "div.img-home > a", "href"))
    local cover   = absUrl(html_attr(card.html, "div.img-home > a > img", "src"))
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
for _, card in ipairs(html_select(r, "div.one-book-home")) do
    local titleEl = html_select_first(card.html, "div.title-home a")
    local bookUrl = absUrl(html_attr(card.html, "div.img-home > a", "href"))
    local cover   = absUrl(html_attr(card.html, "div.img-home > a > img", "src"))
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
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, "h1.entry-title")
  if el then return string_clean(el.text) end
  return nil
end

function getBookCoverImageUrl(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, "div.img-ranobe > img")
  if el then return absUrl(el.src) end
  return nil
end

function getBookDescription(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
  local desc = html_attr(r.body, "meta[name=description]", "content")
  if desc ~= "" then return string_trim(desc) end
  return nil
end

function getBookGenres(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return {} end

  local genres = {}
  -- bookhamster: div.data-ranobe содержит span.dashicons-book (без book-alt),
  -- значения жанров находятся в div.data-value внутри того же блока
for _, block in ipairs(html_select(r, "div.data-ranobe")) do
    local icon = html_select_first(block.html, "span[class*=dashicons-book]:not([class*=book-alt])")
    if icon then
      local valueEl = html_select_first(block.html, "div.data-value")
      if valueEl then
        for _, a in ipairs(html_select(valueEl.html, "a")) do
          local label = string_trim(a.text)
          if label ~= "" then table.insert(genres, label) end
        end
        -- если жанры без ссылок — берём весь текст
        if #genres == 0 then
          local label = string_trim(valueEl.text)
          if label ~= "" then table.insert(genres, label) end
        end
      end
      break
    end
  end
  
  -- bookhamster: альтернативный селектор через genreslist
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
  local r = fetchPage(bookUrl)
if not r then return {} end

  local chapters = {}
for _, li in ipairs(html_select(r, ".li-ranobe")) do
    local a = html_select_first(li.html, ".li-col1-ranobe a")
    if a then
      local chUrl = absUrl(a.href)
      if chUrl ~= "" then
        table.insert(chapters, {
          title = string_clean(a.text),
          url   = chUrl
        })
      end
    end
  end
  
  local reversed = {}
  for i = #chapters, 1, -1 do table.insert(reversed, chapters[i]) end
  return reversed
end

-- ── Хэш для обновлений ────────────────────────────────────────────────────────

function getChapterListHash(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, ".data-value")
  if el then return string_clean(el.text) end
  return nil
end

-- ── Текст главы ───────────────────────────────────────────────────────────────

function getChapterText(html, url)
  local cleaned = html