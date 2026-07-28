-- Metadata
id       = "wtrlab"
name     = "WTR-LAB"
version  = "1.0.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[wtrlab] ✓ Bypass loaded")
else
    print("[wtrlab] ⚠ Direct HTTP mode")
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

baseUrl  = "https://wtr-lab.com/"
language = "en"
icon     = "https://wtr-lab.com/favicon.ico"

-- Cloudflare options (site uses CF protection)
cf_options = {
    whitelist = true,
    ignore_markers = { "wtr-lab" }
    }
    
-- NOTE: This is a Chinese-to-English machine-translated novel source.
-- WARNING: Chapter text uses AES-256-GCM encryption.
-- The Lua environment may NOT support AES decryption natively.
-- This source is provided as-is; full functionality requires the Android app's
-- built-in crypto support.

-- Helpers
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
  text = string.gsub(text, "(?i)\\A[\\s\\p{Z}\\uFEFF]*((第[\\d一二三四五六七八九十百]+[章节]|Chapter\\s+\\d+)[^\\n\\r]*[\\n\\r\\s]*)+", "")
  text = string_trim(text)
  return text
end

-- Extract __NEXT_DATA__ JSON from HTML
local function extractNextData(body)
  local scriptEl = html_select_first(body, "script#__NEXT_DATA__")
  if not scriptEl then return nil end
  return scriptEl.text or scriptEl.inner_text or ""
end

-- Extract novel ID and slug from URL
local function parseNovelUrl(url)
  return string.match(url, "/novel/(%d+)/([^/?#]+)")
end

-- Catalog (novel-list with pagination)
function getCatalogList(index)
  local page = index + 1
  local url = baseUrl .. "en/novel-list?page=" .. tostring(page)
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local nextData = extractNextData(r.body)
  if not nextData then return { items = {}, hasNext = false } end
  
  -- Parse series from JSON (simplified extraction using regex)
  local items = {}
  
  -- Look for title patterns in the JSON
  local titles = regex_match(nextData, '"title"%s*:%s*"([^"]+)"')
  local rawIds = regex_match(nextData, '"raw_id"%s*:%s*"([^"]+)"')
  local slugs = regex_match(nextData, '"slug"%s*:%s*"([^"]+)"')
  local images = regex_match(nextData, '"image"%s*:%s*"([^"]+)"')
  
  for i, title in ipairs(titles) do
    if title and title ~= "" and rawIds[i] and slugs[i] then
      local rawId = rawIds[i]
      local slug = slugs[i]
      local cover = images[i] or ""
      local bookUrl = baseUrl .. "en/novel/" .. rawId .. "/" .. slug
      
      table.insert(items, {
        title = title,
        url = bookUrl,
        cover = cover
      })
    end
  end
  
  return { items = items, hasNext = #items > 0 }
end

-- Search (novel-finder)
function getCatalogSearch(index, query)
  if not query or query == "" then return { items = {}, hasNext = false } end
  
  local page = index + 1
  local url = baseUrl .. "en/novel-finder?text=" .. url_encode(query) .. "&page=" .. tostring(page)
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local nextData = extractNextData(r.body)
  if not nextData then return { items = {}, hasNext = false } end
  
  local items = {}
  local titles = regex_match(nextData, '"title"%s*:%s*"([^"]+)"')
  local rawIds = regex_match(nextData, '"raw_id"%s*:%s*"([^"]+)"')
  local slugs = regex_match(nextData, '"slug"%s*:%s*"([^"]+)"')
  local images = regex_match(nextData, '"image"%s*:%s*"([^"]+)"')
  
  for i, title in ipairs(titles) do
    if title and title ~= "" and rawIds[i] and slugs[i] then
      local rawId = rawIds[i]
      local slug = slugs[i]
      local cover = images[i] or ""
      local bookUrl = baseUrl .. "en/novel/" .. rawId .. "/" .. slug
      
      table.insert(items, {
        title = title,
        url = bookUrl,
        cover = cover
      })
    end
  end
  
  return { items = items, hasNext = #items > 0 }
end

-- Book details with caching
local _pageCache = {}
local function fetchPage(url)
  if _pageCache[url] then return _pageCache[url] end
  local r = fetchPage(url)
  if r.success then _pageCache[url] = r.body end
  return r.success and r.body or nil
end

function getBookTitle(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  
  local nextData = extractNextData(body)
  if nextData then
    -- Look for serie title in JSON
    local match = string_match(nextData, '"serie_data"%s*:%s*{[^}]*"data"%s*:%s*{[^}]*"title"%s*:%s*"([^"]*)"')
    if match and match ~= "" then return match end
    
    match = string_match(nextData, '"title"%s*:%s*"([^"]+)"')
    if match and match ~= "" then return match end
  end
  
  local el = html_select_first(body, "h1")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  
  local nextData = extractNextData(body)
  if nextData then
    local match = string_match(nextData, '"image"%s*:%s*"([^"]+)"')
    if match and match ~= "" and match ~= "null" then return match end
  end
  
  local cover = html_attr(body, "meta[property=og:image]", "content")
    or html_attr(body, ".series-cover img[src]", "src")
  return cover and cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  
  local nextData = extractNextData(body)
  if nextData then
    local match = string_match(nextData, '"description"%s*:%s*"([^"]*)"')
    if match and match ~= "" then 
      match = string_replace(match, "\\n", "\n")
      return applyStandardContentTransforms(match)
    end
  end
  
  local el = html_select_first(body, ".description, .synopsis")
  if el then return applyStandardContentTransforms(html_text(el.html)) end
  return nil
end

-- Chapter list (from API endpoint)
function getChapterList(bookUrl)
  local rawId, slug = parseNovelUrl(bookUrl)
  if not rawId or not slug then return {} end
  
  local apiUrl = baseUrl .. "api/chapters/" .. rawId
  
  local r = fetchPage(apiUrl)
if not r then return {} end

  -- Parse chapter list from JSON response
  local chapters = {}
  local titles = regex_match(r.body, '"title"%s*:%s*"([^"]+)"')
  local orders = regex_match(r.body, '"order"%s*:%s*(%d+)')
  
  for i, title in ipairs(titles) do
    local order = orders[i] and tonumber(orders[i]) or (i + 1)
    local chUrl = baseUrl .. "en/novel/" .. rawId .. "/" .. slug .. "/chapter-" .. tostring(order)
    
    table.insert(chapters, {
      title = tostring(order) .. ": " .. (title or ("Chapter " .. tostring(order))),
      url = chUrl
    })
  end
  
  return chapters
end

-- Chapter text (WARNING: May require AES decryption)
-- The actual chapter content is fetched from /api/reader/get via POST request
-- and may be AES-256-GCM encrypted. This implementation returns empty text
-- if encrypted content is detected.
function getChapterText(html, url)
  -- Try to find content in HTML first (unencrypted fallback)
  local cleaned = html
  
  local el = html_select_first(cleaned, ".chapter-content, .reading-content, article, #content, main")
  if el then
    local text = html_text(el.html)
    if text and text ~= "" and #text > 100 then
      return applyStandardContentTransforms(text)
    end
  end
  
  -- NOTE: Full WTR-LAB chapter text requires:
  -- 1. POST request to /api/reader/get with novel details
  -- 2. AES-256-GCM decryption of the response body
  -- This is NOT implemented here due to crypto library requirements.
  -- The Android app handles this natively.
  
  log_error("wtrlab: Chapter text requires AES decryption. Use the Android app for full functionality.")
  return ""
end

function getChapterTitle(html, url)
  local el = html_select_first(html, "h1")
  return el and string_clean(el.text) or nil
end
