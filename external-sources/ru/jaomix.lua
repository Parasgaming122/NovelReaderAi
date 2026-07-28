-- ── Метаданные ────────────────────────────────────────────────────────────────

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[jaomix] ✓ Bypass loaded")
else
    print("[jaomix] ⚠ Direct HTTP mode")
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

id       = "jaomix"
name     = "Jaomix"
version  = "1.0.3"
baseUrl  = "https://jaomix.ru/"
language = "ru"
icon     = "https://raw.githubusercontent.com/HnDK0/external-sources/main/icons/jaomix.png"

-- ── Хелперы ───────────────────────────────────────────────────────────────────

local function absUrl(href)
  if not href or href == "" then return "" end
  if string_starts_with(href, "http") then return href end
  if string_starts_with(href, "//") then return "https:" .. href end
  return url_resolve(baseUrl, href)
end

local function transformCover(url)
  if not url or url == "" then return "" end
  return -- regex_replace replaced by gsub: string.gsub(url, "-150x150", "")
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

local AJAX_HEADERS = {
  headers = {
    -- User-Agent, Referer, Accept-Language подставляются движком автоматически.
    -- Указывай их здесь только если нужно переопределить дефолт.
    ["Accept"]           = "text/html, */*; q=0.01",
    ["X-Requested-With"] = "XMLHttpRequest",
    ["Origin"]           = "https://jaomix.ru",
    ["Sec-Fetch-Dest"]   = "empty",
    ["Sec-Fetch-Mode"]   = "cors",
    ["Sec-Fetch-Site"]   = "same-origin"
  }
  }
  
-- ── Каталог ───────────────────────────────────────────────────────────────────

function getCatalogList(index)
  local url
  if index == 0 then
    url = baseUrl
  else
    url = baseUrl .. "?gpage=" .. tostring(index + 1)
  end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, card in ipairs(html_select(r, "div.block-home > div.one")) do
    local titleEl = html_select_first(card.html, "div.title-home")
    local bookUrl = absUrl(html_attr(card.html, "div.img-home > a", "href"))
    local cover   = transformCover(absUrl(html_attr(card.html, "div.img-home > a > img", "src")))
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
  local url
  if index == 0 then
    url = baseUrl .. "?searchrn=" .. url_encode(query)
  else
    url = baseUrl .. "?searchrn=" .. url_encode(query) .. "&gpage=" .. tostring(index + 1)
  end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, card in ipairs(html_select(r, "div.block-home > div.one")) do
    local titleEl = html_select_first(card.html, "div.title-home")
    local bookUrl = absUrl(html_attr(card.html, "div.img-home > a", "href"))
    local cover   = transformCover(absUrl(html_attr(card.html, "div.img-home > a > img", "src")))
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
local el = html_select_first(r, "h1")
  if el then return string_clean(el.text) end
  return nil
end

function getBookCoverImageUrl(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, "div.img-book > img")
  if el then return transformCover(absUrl(el.src)) end
  return nil
end

function getBookDescription(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, "#desc-tab")
  if el then return string_trim(el.text) end
  return nil
end

function getBookGenres(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return {} end

  local genres = {}
for _, p in ipairs(html_select(r, "#info-book > p")) do
    local text = string_trim(p.text)
    if string_starts_with(text, "Жанры:") then
      local raw = text:gsub("^Жанры:%s*", "")
      for genre in raw:gmatch("[^,]+") do
        local label = string_trim(genre)
        if label ~= "" then table.insert(genres, label) end
      end
      break
    end
  end
  
  return genres
end

-- ── Количество AJAX-страниц ───────────────────────────────────────────────────

local function getTotalPages(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return 1 end

local opts = html_select(r, "select.sel-toc option")
  if #opts == 0 then
  opts = html_select(r, "select[onchange*='loadChaptList'] option")
  end
  if #opts > 0 then return #opts end
  return 1
end

-- ── Парсинг одной AJAX-страницы ───────────────────────────────────────────────

local function fetchAjaxPage(bookUrl, page)
  local ajaxUrl = baseUrl .. "wp-admin/admin-ajax.php"
  local headers = {}
  for k, v in pairs(AJAX_HEADERS.headers) do headers[k] = v end
  headers["Referer"] = bookUrl
  
  local pr = http_post(
    ajaxUrl,
    "action=loadpagenavchapstt&page=" .. tostring(page),
    { headers = headers }
  )
  if not pr.success then return {} end
  
  local chapters = {}
  for _, a in ipairs(html_select(pr.body, "div.title a[href]")) do
    local chUrl = absUrl(a.href)
    if chUrl ~= "" then
      local titleEl = html_select_first(a.html, "h2")
      table.insert(chapters, {
        title = titleEl and string_clean(titleEl.text) or string_clean(a.text),
        url   = chUrl
      })
    end
  end
  return chapters
end

-- ── parsePage — пагинированный список глав ────────────────────────────────────
--
-- Вызывается движком вместо getChapterList.
-- Возвращает { chapters = [...], totalPages = N }.
--
-- Сайт отдаёт главы в порядке "новые сверху" внутри каждой AJAX-страницы,
-- а сами страницы тоже идут от новых к старым (страница 1 = самые новые).
-- Мы разворачиваем оба уровня чтобы список глав шёл от старых к новым.
--
-- @param bookUrl   URL страницы книги
-- @param page      номер страницы (1-based), запрошенный движком
--
function parsePage(bookUrl, page)
  local totalPages = getTotalPages(bookUrl)
  
  -- Движок запрашивает страницы в порядке 1, 2, 3...
  -- На сайте страница 1 = самые новые, поэтому маппим:
  --   движок page 1  →  сайт page totalPages  (самые старые)
  --   движок page 2  →  сайт page totalPages-1
  --   ...
  --   движок page N  →  сайт page 1           (самые новые)
  local sitePage = totalPages - page + 1
  
  local raw = fetchAjaxPage(bookUrl, sitePage)
  
  -- Разворачиваем: сайт отдаёт новые сверху, нам нужны старые сверху
  local chapters = {}
  for i = #raw, 1, -1 do
    table.insert(chapters, raw[i])
  end
  
  sleep(math.random(150, 300))
  
  return {
    chapters   = chapters,
    totalPages = totalPages,
  }
end

-- ── Текст главы ───────────────────────────────────────────────────────────────

function getChapterText(html, url)
  local cleaned = html