-- ── Метаданные ────────────────────────────────────────────────────────────────

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[ranobehub] ✓ Bypass loaded")
else
    print("[ranobehub] ⚠ Direct HTTP mode")
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

id       = "ranobehub"
name     = "RanobeHub"
version  = "1.0.1"
baseUrl  = "https://ranobehub.org"
language = "ru"
icon     = "https://raw.githubusercontent.com/HnDK0/external-sources/main/icons/ranobehub.png"

-- ── Константы ─────────────────────────────────────────────────────────────────

local apiBase = "https://ranobehub.org/api/"

-- ── Хелперы ───────────────────────────────────────────────────────────────────

local function absUrl(href)
  if not href or href == "" then return "" end
  if string_starts_with(href, "http") then return href end
  if string_starts_with(href, "//") then return "https:" .. href end
  return url_resolve(baseUrl, href)
end

local function extractId(bookUrl)
  local segment = bookUrl:gsub(baseUrl .. "/ranobe/", ""):match("^([^/?#]+)")
  if not segment then return nil end
  return segment:match("^(%d+)")
end

local function applyStandardContentTransforms(text)
  if not text or text == "" then return "" end
  text = string_normalize(text)
  local domain = baseUrl:gsub("https?://", ""):gsub("^www%.", ""):gsub("/$", "")
  text = string.gsub(text, "(?i)" .. domain .. ".*?\\n", "")
  text = string.gsub(text, "(?i)\\A[\\s\\p{Z}\\uFEFF]*((Глава\\s+\\d+|Chapter\\s+\\d+)[^\\n\\r]*[\\n\\r\\s]*)+", "")
  text = string_trim(text)
  return text
end

local function pickTitle(names, fallback)
  if not names then return fallback or "" end
  return names.rus or names.eng or names.original or fallback or ""
end

local function parseResource(data)
  local items = {}
  if not data or not data.resource then return items end
  for _, novel in ipairs(data.resource) do
    local title = pickTitle(novel.names, novel.name)
    local id    = tostring(novel.id or "")
    local cover = novel.poster and novel.poster.medium or ""
    if title ~= "" and id ~= "" then
      table.insert(items, {
        title = string_clean(title),
        url   = baseUrl .. "/ranobe/" .. id,
        cover = absUrl(cover)
      })
    end
  end
  return items
end

-- ── Каталог ───────────────────────────────────────────────────────────────────

function getCatalogList(index)
  local page = index + 1
  local url = apiBase .. "search?page=" .. tostring(page) .. "&sort=computed_rating&status=0&take=40"
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end
  local data = json_parse(r.body)
  local items = parseResource(data)
  return { items = items, hasNext = #items > 0 }
end

-- ── Поиск ─────────────────────────────────────────────────────────────────────

function getCatalogSearch(index, query)
  if index > 0 then return { items = {}, hasNext = false } end
  local url = apiBase .. "fulltext/global?query=" .. url_encode(query) .. "&take=10"
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end
  local results = json_parse(r.body)
  if not results then return { items = {}, hasNext = false } end
  local items = {}
  for _, block in ipairs(results) do
    if type(block) == "table" then
      local meta = block.meta
      if meta and meta.key == "ranobe" and block.data then
        for _, novel in ipairs(block.data) do
          local title = pickTitle(novel.names, novel.name)
          local id    = tostring(novel.id or "")
          local cover = novel.image and novel.image:gsub("/small", "/medium") or ""
          if title ~= "" and id ~= "" then
            table.insert(items, {
              title = string_clean(title),
              url   = baseUrl .. "/ranobe/" .. id,
              cover = absUrl(cover)
            })
          end
        end
      end
    end
  end
  return { items = items, hasNext = false }
end

-- ── Детали книги ──────────────────────────────────────────────────────────────

local function fetchBookData(bookUrl)
  local id = extractId(bookUrl)
  if not id then return nil end
  local r = fetchPage(apiBase .. "ranobe/" .. id)
if not r then return nil end
  local parsed = json_parse(r.body)
  return parsed and parsed.data or nil
end

function getBookTitle(bookUrl)
  local data = fetchBookData(bookUrl)
  if not data then return nil end
  local title = pickTitle(data.names, data.name)
  return title ~= "" and string_clean(title) or nil
end

function getBookCoverImageUrl(bookUrl)
  local data = fetchBookData(bookUrl)
  if not data then return nil end
  local cover = data.posters and data.posters.medium or ""
  return cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local data = fetchBookData(bookUrl)
  if not data then return nil end
  local desc = data.description or ""
  desc = string.gsub(desc, "<[^>]*>", "")
  return string_trim(desc) ~= "" and string_trim(desc) or nil
end

function getBookGenres(bookUrl)
  local data = fetchBookData(bookUrl)
  if not data or not data.tags then return {} end
  local genres = {}
  local function addTags(tagArray)
    if not tagArray then return end
    for _, tag in ipairs(tagArray) do
      local label = (tag.names and (tag.names.rus or tag.names.eng)) or tag.title or ""
      label = string_trim(label)
      if label ~= "" then table.insert(genres, label) end
    end
  end
  addTags(data.tags.genres)
  addTags(data.tags.events)
  return genres
end

-- ── Список глав ───────────────────────────────────────────────────────────────

function getChapterList(bookUrl)
  local id = extractId(bookUrl)
  if not id then
    log_error("ranobehub: cannot extract id from " .. bookUrl)
    return {}
  end
  local r = fetchPage(apiBase .. "ranobe/" .. id .. "/contents")
if not r then
    log_error("ranobehub: contents failed code=" .. tostring(r.code))
    return {}
  end
  local data = json_parse(r.body)
  if not data or not data.volumes then return {} end
  local chapters = {}
  for _, volume in ipairs(data.volumes) do
    local volNum = tostring(volume.num or "")
    if volume.chapters then
      for _, chapter in ipairs(volume.chapters) do
        local chNum = tostring(chapter.num or "")
        local title = chapter.name or ("Chapter " .. chNum)
        local chUrl = baseUrl .. "/ranobe/" .. id .. "/" .. volNum .. "/" .. chNum
        table.insert(chapters, {
          title  = string_clean(title),
          url    = chUrl,
          volume = "Том " .. volNum
        })
      end
    end
  end
  return chapters
end

-- ── Хэш для обновлений ────────────────────────────────────────────────────────

function getChapterListHash(bookUrl)
  local id = extractId(bookUrl)
  if not id then return nil end
  local r = fetchPage(apiBase .. "ranobe/" .. id .. "/contents")
if not r then return nil end
  local data = json_parse(r.body)
  if not data or not data.volumes then return nil end
  local volumes = data.volumes
  local lastVol = volumes[#volumes]
  if not lastVol or not lastVol.chapters then return nil end
  local lastCh = lastVol.chapters[#lastVol.chapters]
  return lastCh and tostring(lastCh.num) or nil
end

-- ── Текст главы ───────────────────────────────────────────────────────────────

function getChapterText(html, url)
  local cleaned = html