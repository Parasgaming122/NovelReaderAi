-- Metadata
id       = "wuxia_click"
name     = "Wuxia.click"
version  = "1.0.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[wuxia_click] ✓ Bypass loaded")
else
    print("[wuxia_click] ⚠ Direct HTTP mode")
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

baseUrl  = "https://wuxia.click/"
language = "en"
icon     = "https://wuxia.click/favicon.ico"

-- Next.js-based site with __NEXT_DATA__ JSON blob
-- All data available in <script id="__NEXT_DATA__"> tag

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
  local jsonText = scriptEl.text or scriptEl.inner_text or ""
  if jsonText == "" then return nil end
  return jsonText
end

-- Find query data by key prefix in __NEXT_DATA__
local function findQueryData(nextDataJson, keyPrefix)
  if not nextDataJson then return nil end
  
  -- This is a simplified extraction - full JSON parsing would be needed
  -- For now, we try to extract using regex patterns
  
  -- Look for the key pattern near our desired keyPrefix
  local pattern = '"' .. keyPrefix .. '[^"]*"'
  if string_contains(nextDataJson, pattern) then
    return nextDataJson
  end
  
  return nil
end

-- Extract novel slug from URL
local function extractSlug(bookUrl)
  return string.match(bookUrl, "/novel/([^/?#]+)") or ""
end

-- Catalog (home page only - no pagination)
function getCatalogList(index)
  if index > 0 then return { items = {}, hasNext = false } end
  
  local r = fetchPage(baseUrl)
if not r then return { items = {}, hasNext = false } end

  local items = {}
  local seenUrls = {}
  
  -- Extract novel links from home page
for _, a in ipairs(html_select(r, "a[href*='/novel/']")) do
    local href = a.href
    if href and href ~= "" then
      local url = absUrl(href)
      -- Skip if we've already seen this URL or if it looks like a chapter link
      if not seenUrls[url] and not string_match(href, "/chapter/") then
        seenUrls[url] = true
        
        local title = string_clean(a.text)
          :gsub("\n", " ")
          :gsub("%s+", " ")
          :trim()
        
        if #title >= 2 then
          local cover = html_attr(get_element_html(a), "img[src]", "src") or ""
          if cover ~= "" and not string_starts_with(cover, "http") then
            cover = absUrl(cover)
          end
          
          table.insert(items, {
            title = title,
            url = url,
            cover = cover
          })
        end
      end
    end
  end
  
  return { items = items, hasNext = false }
end

-- Search
function getCatalogSearch(index, query)
  if not query or query == "" then return { items = {}, hasNext = false } end
  if index > 0 then return { items = {}, hasNext = false } end
  
  local searchUrl = baseUrl .. "search?q=" .. url_encode(query)
  
  local r = fetchPage(searchUrl)
if not r then return { items = {}, hasNext = false } end

  local items = {}
  local seenUrls = {}
  
  -- Try parsing __NEXT_DATA__ first
  local nextData = extractNextData(r.body)
  
  if nextData and string_contains(nextData, "search") then
    -- Extract search results from JSON
    -- Look for name/image/slug patterns
    local results = regex_match(nextData, '"name"%s*:%s*"([^"]+)"[^}]*"slug"%s*:%s*"([^"]+)"[^}]*"image"%s*:%s*"([^"]*)"')
    
    if #results > 0 then
      for _, match in ipairs(results) do
        local name = string.match(match, '"name"%s*:%s*"([^"]+)"')
        local slug = string.match(match, '"slug"%s*:%s*"([^"]+)"')
        local image = string.match(match, '"image"%s*:%s*"([^"]*)"')
        
        if name and name ~= "" and slug and slug ~= "" then
          local url = baseUrl .. "novel/" .. slug
          if not seenUrls[url] then
            seenUrls[url] = true
            table.insert(items, {
              title = name,
              url = url,
              cover = image or ""
            })
          end
        end
      end
    end
  end
  
  -- Fallback: parse HTML links
  if #items == 0 then
for _, a in ipairs(html_select(r, "a[href*='/novel/']")) do
      local href = a.href
      if href and href ~= "" then
        local url = absUrl(href)
        if not seenUrls[url] and not string_match(href, "/chapter/") then
          seenUrls[url] = true
          
          local title = string_clean(a.text):gsub("\n", " "):gsub("%s+", " "):trim()
          
          if #title >= 2 then
            local cover = html_attr(get_element_html(a), "img[src]", "src") or ""
            table.insert(items, { title = title, url = url, cover = cover })
          end
        end
      end
    end
  end
  
  return { items = items, hasNext = true }
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
  
  -- Try extracting from __NEXT_DATA__ first
  local nextData = extractNextData(body)
  if nextData then
    local nameMatch = string_match(nextData, '"name"%s*:%s*"([^"]+)"')
    if nameMatch and nameMatch ~= "" then return nameMatch end
  end
  
  -- Fallback to HTML
  local el = html_select_first(body, "h1, .novel-title")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  
  -- Try extracting from __NEXT_DATA__ first
  local nextData = extractNextData(body)
  if nextData then
    local imageMatch = string_match(nextData, '"image"%s*:%s*"([^"]+)"')
    if imageMatch and imageMatch ~= "" and imageMatch ~= "null" then 
      return imageMatch 
    end
  end
  
  -- Fallback to HTML
  local cover = html_attr(body, "img[src*='/covers/'], img[src*='/images/'], .novel-cover img[src]", "src")
  return cover and cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  
  -- Try extracting from __NEXT_DATA__ first
  local nextData = extractNextData(body)
  if nextData then
    local descMatch = string_match(nextData, '"description"%s*:%s*"([^"]*)"')
    if descMatch and descMatch ~= "" then 
      -- Unescape JSON string
      descMatch = string_replace(descMatch, "\\n", "\n")
      return applyStandardContentTransforms(descMatch)
    end
  end
  
  -- Fallback to HTML
  local el = html_select_first(body, ".description, .synopsis, .novel-description")
  if el then return applyStandardContentTransforms(html_text(el.html)) end
  return nil
end

-- Chapter list (generated from chapter count in __NEXT_DATA__)
function getChapterList(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return {} end
  
  local slug = extractSlug(bookUrl)
  if slug == "" then return {} end
  
  -- Try extracting chapter count from __NEXT_DATA__
  local nextData = extractNextData(body)
  local chapterCount = 0
  
  if nextData then
    -- Look for "chapters":N pattern
    local countMatch = string_match(nextData, '"chapters"%s*:(%d+)')
    if countMatch then
      chapterCount = tonumber(countMatch) or 0
    end
  end
  
  -- If we couldn't extract chapter count, return empty
  if chapterCount <= 0 then return {} end
  
  -- Generate chapter list: CH 1, CH 2, ... CH N
  local chapters = {}
  for i = 1, chapterCount do
    table.insert(chapters, {
      title = "CH " .. tostring(i),
      url = baseUrl .. "chapter/" .. slug .. "-" .. tostring(i)
    })
  end
  
  return chapters
end

-- Chapter text (extracted from __NEXT_DATA__)
function getChapterText(html, url)
  -- Try extracting from __NEXT_DATA__ first
  local nextData = extractNextData(html)
  if nextData then
    -- Look for "text":"..." pattern (chapter content)
    -- This is complex due to escaped quotes; simplified extraction
    local textMatch = string_match(nextData, '"text"%s*:"((?:[^"\\]|\\.)*)"')
    if textMatch and textMatch ~= "" then
      -- Unescape JSON string
      textMatch = string_replace(textMatch, "\\n", "\n")
      textMatch = string_replace(textMatch, '\\"', '"')
      textMatch = string_replace(textMatch, "\\/", "/")
      return applyStandardContentTransforms(textMatch)
    end
  end
  
  -- Fallback: try to find content in HTML
  local cleaned = html
  
  local el = html_select_first(cleaned, ".chapter-content, #chapter-content, article, main")
  if el then return applyStandardContentTransforms(html_text(el.html)) end
  
  return ""
end

function getChapterTitle(html, url)
  -- Try extracting from __NEXT_DATA__ first
  local nextData = extractNextData(html)
  if nextData then
    local titleMatch = string_match(nextData, '"title"%s*:"([^"]+)"')
    if titleMatch and titleMatch ~= "" then return titleMatch end
  end
  
  -- Fallback to HTML
  local el = html_select_first(html, "h1, .chapter-title, title")
  return el and string_clean(el.text) or nil
end
