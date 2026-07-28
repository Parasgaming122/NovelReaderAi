-- Metadata
id       = "light_novel_translations"
name     = "LightNovelsTranslations"
version  = "1.0.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[light_novel_translations] ✓ Bypass loaded")
else
    print("[light_novel_translations] ⚠ Direct HTTP mode")
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

baseUrl  = "https://lightnovelstranslations.com/"
language = "en"
icon     = "https://c10.patreonusercontent.com/4/patreon-media/p/campaign/458169/797a2e9b03094435947635c4da0fc683/eyJ3IjoyMDB9/1.jpeg?token-time=2145916800&token-hash=2gkkI3EgQqRPh5dQe9uxrULjURfQVm60BHKUdh91MtE%3D"

-- Helpers
local function absUrl(href)
  if not href or href == "" then return "" end
  if string_starts_with(href, "http") then return href end
  if string_starts_with(href, "//") then return "https:" .. href end
  return url_resolve(baseUrl, href)
end

local function cleanCoverUrl(url)
  if not url or url == "" then return "" end
  -- Remove query parameters from cover URL
  return -- regex_replace replaced by gsub: string.gsub(url, "\\?.*$", "")
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

-- Catalog (highest rated)
function getCatalogList(index)
  local page = index + 1
  local url = baseUrl .. "read/?sortby=highest-rated"
  if page > 1 then url = url .. "&page=" .. tostring(page) end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, el in ipairs(html_select(r, ".read_list-story-item")) do
    local titleEl = html_select_first(el.html, ".read_list-story-item--title a[href]")
    if titleEl then
      local title = string_clean(titleEl.text)
      local bookUrl = absUrl(titleEl.href)
      local cover = html_attr(el.html, ".item_thumb img[src]", "src") or ""
      
      if title ~= "" and bookUrl ~= "" then
        table.insert(items, {
          title = title,
          url = bookUrl,
          cover = cleanCoverUrl(cover),
          description = html_select_first(el.html, ".read_list-story-item--short_description") and string_clean(html_select_first(el.html, ".read_list-story-item--short_description").text) or ""
        })
      end
    end
  end
  
  return { items = items, hasNext = #items > 0 }
end

-- Search (uses admin-ajax.php JSON API)
function getCatalogSearch(index, query)
  if not query or query == "" then return { items = {}, hasNext = false } end
  if index > 0 then return { items = {}, hasNext = false } end
  
  -- Use the search API endpoint
  local apiUrl = baseUrl .. "wp-admin/admin-ajax.php?action=search_novel_header&search_key=" .. url_encode(query)
  
  local r = fetchPage(apiUrl)
if not r then return { items = {}, hasNext = false } end

  -- Parse JSON response manually (array of arrays: [[id, name, url, cover], ...])
  local items = {}
  
  -- Try to extract JSON array items
  -- Format: [["id","title","url","cover"], ...]
  local jsonStr = r.body
  
  -- Extract each sub-array using pattern matching
  local results = regex_match(jsonStr, '%["[^"]*",%s*"([^"]*)",%s*"([^"]*)",%s*"([^"]*)"]')
  
  -- Also try alternate format
  if #results == 0 then
    results = regex_match(jsonStr, '"(?:id|ID)"[^}]*"([^"]*)"[^}]*"(?:name|title|url|cover)[^}]*"([^"]*)"[^}]*"([^"]*)"[^}]*"([^"]*)"')
  end
  
  -- Simple fallback: look for URL patterns that indicate books
  if #results == 0 then
    -- The response might be a simple JSON array
    local urls = regex_match(jsonStr, '"(https?://[^"]+)"')
    local names = regex_match(jsonStr, '"([A-Za-z0-9][^"]{2,})"')
    
    for i, u in ipairs(urls) do
      if i <= #names and string_contains(u, "lightnovelstranslations") then
        table.insert(items, {
          title = names[i],
          url = u,
          cover = ""
        })
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
  local el = html_select_first(body, ".novel-title, h1.entry-title")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local cover = html_attr(body, ".novel-image img[src]", "src")
  if cover and cover ~= "" then
    return cleanCoverUrl(absUrl(cover))
  end
  return nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, ".novel_text")
  if not el then return nil end
  -- Remove alternate titles section
  local cleaned = el.html
  
  local el = html_select_first(cleaned, ".chapter-content, .entry-content, #chapter-content, .text-content")
  if not el then return "" end
  return applyStandardContentTransforms(html_text(el.html))
end

function getChapterTitle(html, url)
  local el = html_select_first(html, ".chapter-title, h1.entry-title, h1")
  return el and string_clean(el.text) or nil
end
