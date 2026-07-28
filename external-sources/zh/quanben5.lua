-- ── Метаданные ────────────────────────────────────────────────────────────────
id       = "quanben5"
name     = "Quanben5"
version  = "1.0.0"
baseUrl  = "https://big5.quanben5.com/"
language = "zh"
icon     = "https://raw.githubusercontent.com/HnDK0/external-sources/main/icons/quanben5.png"

-- ── Хелперы ───────────────────────────────────────────────────────────────────

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[quanben5] ✓ Bypass loaded")
else
    print("[quanben5] ⚠ Direct HTTP mode")
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

-- ── Кастомный base64 (аналог JS-кодирования сайта) ───────────────────────────
--
-- Алгоритм из JavaScript quanben5.com:
--   staticChars = "PXhw7UT1B0a9kQDKZsjIASmOezxYG4CHo5Jyfg2b8FLpEvRr3WtVnlqMidu6cN"
--   Для каждого символа строки:
--     num0 = indexOf(char) в staticChars
--     если найден → код = staticChars[(num0+3) % 62], иначе код = char
--     добавляем: rand_char + код + rand_char
--
-- Важно: rand_char тоже из staticChars — но при декодировании на сервере
-- они игнорируются (каждый второй символ — полезный).
-- Для детерминированности используем фиксированный "случайный" символ: staticChars[0] = 'P'

local STATIC_CHARS = "PXhw7UT1B0a9kQDKZsjIASmOezxYG4CHo5Jyfg2b8FLpEvRr3WtVnlqMidu6cN"

local function customBase64Encode(str)
  local result = {}
  for i = 1, #str do
    local char = str:sub(i, i)
    local num0 = STATIC_CHARS:find(char, 1, true)
    local code
    if num0 then
      -- Lua: find возвращает 1-based индекс → конвертируем в 0-based для % 62
      local idx0 = num0 - 1
      local newIdx = (idx0 + 3) % 62
      code = STATIC_CHARS:sub(newIdx + 1, newIdx + 1)
    else
      code = char
    end
    -- Вместо случайного символа используем 'P' (первый в staticChars)
    table.insert(result, "P")
    table.insert(result, code)
    table.insert(result, "P")
  end
  return table.concat(result)
end

-- encodeURI: кодирует строку как JavaScript encodeURI
-- Не кодирует: буквы, цифры, ; , / ? : @ & = + $ # - _ . ! ~ * ' ( )
-- Кодирует пробел как %20, % как %25, китайские символы как %XX%XX%XX
local function encodeURI(input)
  local result = {}
  -- Используем url_encode и потом декодируем то, что не надо кодировать
  -- Проще: итерируем побайтово
  local bytes = {}
  for i = 1, #input do
    bytes[i] = input:byte(i)
  end
  local i = 1
  while i <= #bytes do
    local b = bytes[i]
    local char = string.char(b)
    -- Не кодируем: ASCII буквы, цифры, и специальные символы как в encodeURI
    if (b >= 65 and b <= 90) or   -- A-Z
       (b >= 97 and b <= 122) or  -- a-z
       (b >= 48 and b <= 57) or   -- 0-9
       char == "-" or char == "_" or char == "." or char == "!" or
       char == "~" or char == "*" or char == "'" or char == "(" or
       char == ")" or char == ";" or char == "," or char == "/" or
       char == "?" or char == ":" or char == "@" or char == "&" or
       char == "=" or char == "+" or char == "$" or char == "#" then
      table.insert(result, char)
    else
      table.insert(result, string.format("%%%02X", b))
    end
    i = i + 1
  end
  return table.concat(result)
end

-- ── Каталог ───────────────────────────────────────────────────────────────────

function getCatalogList(index)
  local page = index + 1
  local url
  if page == 1 then
    url = baseUrl .. "category/1.html"
  else
    url = baseUrl .. "category/1_" .. tostring(page) .. ".html"
  end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, card in ipairs(html_select(r, ".pic_txt_list")) do
    local titleEl = html_select_first(card.html, "h3 a")
    if titleEl then
      local bookUrl = absUrl(titleEl.href)
      local cover   = html_attr(card.html, ".pic img", "src")
      local t = string_clean(titleEl.text)
      if bookUrl ~= "" and t ~= "" then
        table.insert(items, { title = t, url = bookUrl, cover = absUrl(cover) })
      end
    end
  end
  
  return { items = items, hasNext = #items > 0 }
end

-- ── Поиск (JSONP API с кастомным base64) ─────────────────────────────────────

function getCatalogSearch(index, query)
  if index > 0 then return { items = {}, hasNext = false } end
  
  -- Шаг 1: encodeURI(query)
  local encodedKeywords = encodeURI(query)
  -- Шаг 2: customBase64(encodeURI(query))
  local b64 = customBase64Encode(encodedKeywords)
  -- Шаг 3: encodeURI(base64result) → b параметр
  local bParam = encodeURI(b64)
  local timestamp = tostring(os_time())
  
  local searchUrl = baseUrl .. "?c=book&a=search.json&callback=search&t=" .. timestamp
    .. "&keywords=" .. encodedKeywords .. "&b=" .. bParam
    
  local r = http_get(searchUrl, {
    headers = { ["Referer"] = baseUrl .. "search.html" }
  })
  if not r.success then return { items = {}, hasNext = false } end
  
  -- Парсим JSONP: search({...})
  -- Ищем "content":"<html>" внутри
  local jsonBody = r.body
  local contentStart = jsonBody:find('"content":"', 1, true)
  if not contentStart then return { items = {}, hasNext = false } end
  
  local valueStart = contentStart + 11  -- длина '"content":"'
  -- Ищем конец строки (незаэкранированную кавычку)
  local valueEnd = valueStart
  while valueEnd <= #jsonBody do
    local c = jsonBody:sub(valueEnd, valueEnd)
    if c == '"' and jsonBody:sub(valueEnd - 1, valueEnd - 1) ~= '\\' then
      break
    end
    valueEnd = valueEnd + 1
  end
  
  local htmlContent = jsonBody:sub(valueStart, valueEnd - 1)
  -- Убираем экранирование
  htmlContent = htmlContent:gsub('\\"', '"'):gsub('\\/', '/'):gsub('\\n', '\n')
  -- Декодируем \uXXXX через встроенный API
  htmlContent = unescape_unicode(htmlContent)
  
  local items = {}
  for _, card in ipairs(html_select(htmlContent, ".pic_txt_list")) do
    local titleEl = html_select_first(card.html, "h3 a")
    if titleEl then
      local href = titleEl.href
      if href == "" then href = html_attr(card.html, "h3 a", "href") end
      local bookUrl = absUrl(href)
      local cover   = html_attr(card.html, ".pic img", "src")
      local t = string_clean(titleEl.text)
      if bookUrl ~= "" and t ~= "" then
        table.insert(items, { title = t, url = bookUrl, cover = absUrl(cover) })
      end
    end
  end
  
  return { items = items, hasNext = false }
end

-- ── Детали книги ──────────────────────────────────────────────────────────────

function getBookTitle(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, "span.name")
  if el then return string_clean(el.text) end
  return nil
end

function getBookCoverImageUrl(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
  local src = html_attr(r.body, ".box .pic img", "src")
  if src ~= "" then return absUrl(src) end
  return nil
end

function getBookDescription(bookUrl)
  local r = fetchPage(bookUrl)
if not r then return nil end
  local cleaned = r.body