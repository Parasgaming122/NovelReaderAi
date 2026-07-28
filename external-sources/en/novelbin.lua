-- ── Метаданные ───────────────────────────────────────────────────────────────
id        = "NovelBin"
name      = "Novel Bin"
version   = "1.1.1"
baseUrl   = "https://novelbin.com/"
language  = "en"
icon      = "https://raw.githubusercontent.com/HnDK0/external-sources/main/icons/novelbin.png"
status    = "dead"

-- ── Кэш страниц (1 запрос вместо 4–5) ────────────────────────────────────────

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[NovelBin] ✓ Bypass loaded")
else
    print("[NovelBin] ⚠ Direct HTTP mode")
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

local _pageCache = {}

local function fetchPage(url)
  if _pageCache[url] then return _pageCache[url] end
  local r = fetchPage(url)
if r then
    _pageCache[url] = r.body
    return r.body
  end
  return nil
end

-- ── Хелперы ───────────────────────────────────────────────────────────────────

local function absUrl(href)
  if not href or href == "" then return "" end
  if string_starts_with(href, "http") then return href end
  if string_starts_with(href, "//") then return "https:" .. href end
  return url_resolve(baseUrl, href)
end

local function transformCoverUrl(coverUrl, bookUrl)
  if not bookUrl or bookUrl == "" then return coverUrl end
  local slug = bookUrl:match("([^/?#]+)%.html$") or bookUrl:match("([^/?#]+)/?$")
  if slug then
    return "https://images.novelbin.me/novel/" .. slug .. ".jpg"
  end
  return coverUrl
end

local function applyStandardContentTransforms(text)
  if not text or text == "" then return "" end
  text = string_normalize(text)
  local domain = baseUrl:gsub("https?://", ""):gsub("^www%.", ""):gsub("/$", "")
  text = string.gsub(text, "(?i)" .. domain .. ".*?\\n", "")
  text = string.gsub(text, "(?i)\\A[\\s\\p{Z}\\uFEFF]*((Глава\\s+\\d+|Chapter\\s+\\d+)[^\\n\\r]*[\\n\\r\\s]*)+", "")
  text = string.gsub(text, "(?im)^\\s*(Translator|Editor|Proofreader|Read\\s+(at|on|latest))[:\\s][^\\n\\r]{0,70}(\\r?\\n|$)", "")
  text = string.gsub(text, "(?i)Remove\\s+Ads\\s+From\\s+\\$\\d+", "")
  text = string_trim(text)
  return text
end

local function parseCatalogItems(body, useDataSrc)
  local items = {}
  for _, row in ipairs(html_select(body, ".col-novel-main .row")) do
    local titleEl = html_select_first(row.html, ".novel-title a")
    if titleEl then
      local currentUrl = absUrl(titleEl.href)
      local cover = ""
      if useDataSrc then
        cover = html_attr(row.html, "img[data-src]", "data-src")
      end
      if cover == "" then
        cover = html_attr(row.html, "img[src]", "src")
      end
      table.insert(items, {
        title = string_trim(titleEl.text),
        url   = currentUrl,
        cover = transformCoverUrl(cover, currentUrl)
      })
    end
  end
  return items
end

-- ── Извлечение novelId из страницы книги (для AJAX) ──────────────────────────

local function extractNovelId(body, bookUrl)
  local ogUrl = html_attr(body, "meta[property='og:url']", "content")
  if ogUrl == "" then
    log_error("extractNovelId: no og:url meta in " .. bookUrl)
    return nil
  end
  local m = regex_match(ogUrl, "([^/?#]+)/*$")
  if not m[1] then
    log_error("extractNovelId: cannot extract novelId from og:url=" .. ogUrl)
    return nil
  end
  return m[1]
end

-- ── AJAX-запрос архива глав ───────────────────────────────────────────────────

local function fetchChapterArchive(novelId, bookUrl)
  local ajaxUrl = baseUrl:gsub("/$", "") .. "/ajax/chapter-archive?novelId=" .. novelId
  local ar = http_get(ajaxUrl, {
    headers = {
      ["Referer"]          = bookUrl,
      ["X-Requested-With"] = "XMLHttpRequest",
    }
  })
  if not ar.success then
    log_error("fetchChapterArchive: AJAX failed code=" .. tostring(ar.code))
    return nil
  end
  return ar.body
end

-- ── Парсинг глав из HTML шаблона ─────────────────────────────────────────────

local function parseChaptersFromArchive(archiveHtml)
  local tmpl = html_select_first(archiveHtml, "template[data-chapter-item-template]")
  if not tmpl then
    log_error("parseChaptersFromArchive: template element not found")
    return {}
  end
  
  local chapters = {}
  for _, a in ipairs(html_select(tmpl.html, "a[href]")) do
    local span  = html_select_first(a.html, "span.nchr-text")
    local title = span and string_trim(span.text) or ""
    if title == "" then title = string_trim(a.title or "") end
    if title == "" then title = string_trim(a.text) end
    if title == "" then title = a.href end
    table.insert(chapters, { title = title, url = a.href })
  end
  return chapters
end

-- ── Каталог ───────────────────────────────────────────────────────────────────

function getCatalogList(index)
  local page = index + 1
  local url = baseUrl .. "sort/top-view-novel"
  if page > 1 then url = url .. "?page=" .. page end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = parseCatalogItems(r.body, true)
  return { items = items, hasNext = #items > 0 }
end

-- ── Поиск ─────────────────────────────────────────────────────────────────────

function getCatalogSearch(index, query)
  local page = index + 1
  local url = baseUrl .. "search?keyword=" .. url_encode(query)
  if page > 1 then url = url .. "&page=" .. page end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = parseCatalogItems(r.body, false)
  return { items = items, hasNext = #items > 0 }
end

-- ── Детали книги (все через кэш — 1 запрос) ──────────────────────────────────

function getBookTitle(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, "h3.title")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local url = html_attr(body, "meta[property='og:image']", "content")
  return url ~= "" and absUrl(url) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, "div.desc-text")
  return el and string_trim(el.text) or nil
end

function getBookGenres(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return {} end
  local genres = {}
  for _, li in ipairs(html_select(body, "ul.info.info-meta li, ul.info-meta li")) do
    local h3 = html_select_first(li.html, "h3")
    if h3 and string_trim(h3.text) == "Genre:" then
      for _, a in ipairs(html_select(li.html, "a")) do
        local g = string_trim(a.text)
        if g ~= "" then table.insert(genres, g) end
      end
      break
    end
  end
  return genres
end

-- ── Список глав ───────────────────────────────────────────────────────────────
-- NovelBin отдаёт все главы одним AJAX-запросом (chapter-archive).
-- totalPages = 1, движок при обновлении перечитывает только эту страницу.

function parsePage(bookUrl, page)
  if page > 1 then
    return { chapters = {}, totalPages = 1 }
  end
  
  local body = fetchPage(bookUrl)
  if not body then
    log_error("parsePage: failed to load " .. bookUrl)
    return { chapters = {}, totalPages = 1 }
  end
  
  local novelId = extractNovelId(body, bookUrl)
  if not novelId then
    return { chapters = {}, totalPages = 1 }
  end
  
  local archiveHtml = fetchChapterArchive(novelId, bookUrl)
  if not archiveHtml then
    return { chapters = {}, totalPages = 1 }
  end
  
  local chapters = parseChaptersFromArchive(archiveHtml)
  log_error("parsePage: found " .. tostring(#chapters) .. " chapters")
  return { chapters = chapters, totalPages = 1 }
end

-- ── Текст главы ───────────────────────────────────────────────────────────────

function getChapterText(html)
  local el = html_select_first(html, "#chr-content")
  if not el then return "" end
  local cleaned = el.html