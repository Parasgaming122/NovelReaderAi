-- ── Метаданные ────────────────────────────────────────────────────────────────
id       = "baca_lightnovel"
name     = "Baca Lightnovel"
version  = "1.0.1"
baseUrl  = "https://bacalightnovel.co/"
language = "id"
icon     = "https://raw.githubusercontent.com/HnDK0/external-sources/main/icons/bacalightnovel.png"

-- ── Хелперы ───────────────────────────────────────────────────────────────────

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[baca_lightnovel] ✓ Bypass loaded")
else
    print("[baca_lightnovel] ⚠ Direct HTTP mode")
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
  text = string.gsub(text, "(?i)\\A[\\s\\p{Z}\\uFEFF]*((Bab\\s+\\d+|Chapter\\s+\\d+)[^\\n\\r]*[\\n\\r\\s]*)+", "")
  text = string.gsub(text, "(?im)^\\s*(Penerjemah|Editor|Proofreader|Baca\\s+(di|di+sini))[:\\s][^\\n\\r]{0,70}(\\r?\\n|$)", "")
  text = string_trim(text)
  return text
end

local function parseCatalogItems(body, preferDataSrc)
  local items = {}
  for _, a in ipairs(html_select(body, ".listupd > .maindet .mdthumb a")) do
    local bookUrl = absUrl(a.href)
    local title = html_attr(a.html, "img", "title")
    if title == "" then title = html_attr(a.html, "img", "alt") end
    local cover = ""
    if preferDataSrc then
      cover = html_attr(a.html, "img[data-src]", "data-src")
    end
    if cover == "" then
      cover = html_attr(a.html, "img[src]", "src")
    end
    if bookUrl ~= "" then
      table.insert(items, {
        title = string_clean(title),
        url   = bookUrl,
        cover = absUrl(cover)
      })
    end
  end
  return items
end

-- ── Каталог ───────────────────────────────────────────────────────────────────

function getCatalogList(index)
  local url
  if index == 0 then
    url = baseUrl .. "series/"
  else
    url = baseUrl .. "series/?page=" .. tostring(index + 1) .. "&order=populer"
  end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = parseCatalogItems(r.body, true)
  return { items = items, hasNext = #items > 0 }
end

-- ── Поиск ─────────────────────────────────────────────────────────────────────

function getCatalogSearch(index, query)
  local url
  if index == 0 then
    url = baseUrl:gsub("/$", "") .. "/?s=" .. url_encode(query)
  else
    url = baseUrl:gsub("/$", "") .. "/page/" .. tostring(index + 1) .. "/?s=" .. url_encode(query)
  end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = parseCatalogItems(r.body, false)
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
local el = html_select_first(r, ".sertothumb img")
  if el then
    local src = el.src
    if src == "" then src = el:attr("data-src") end
    return absUrl(src)
  end
  return nil
end

function getBookDescription(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, ".entry-content")
  if el then return string_trim(el.text) end
  return nil
end

-- ── Список глав (NONE + reverseChapters) ─────────────────────────────────────

function getChapterList(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return {} end

  local chapters = {}
for _, a in ipairs(html_select(r, ".eplister li > a:not(.dlpdf)")) do
    local chUrl = absUrl(a.href)
    if chUrl ~= "" then
      local titleEl = html_select_first(a.html, ".epl-title")
      table.insert(chapters, {
        title = titleEl and string_clean(titleEl.text) or string_clean(a.text),
        url   = chUrl
      })
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
local el = html_select_first(r, ".epcurlast")
  if el then return string_clean(el.text) end
  return nil
end

-- ── Текст главы ───────────────────────────────────────────────────────────────

function getChapterText(html, url)
  local cleaned = html