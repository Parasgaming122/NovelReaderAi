-- Metadata
id       = "saikai"
name     = "Saikai"
version  = "1.0.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[saikai] ✓ Bypass loaded")
else
    print("[saikai] ⚠ Direct HTTP mode")
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

baseUrl  = "https://saikaiscan.com.br/"
language = "pt"

-- Cloudflare options (site may have CF protection)
cf_options = {
    whitelist = true,
    ignore_markers = { "saikai" }
    }
    
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
  text = string_trim(text)
  return text
end

-- Catalog (uses external API: api.saikai.com.br)
function getCatalogList(index)
  local page = index + 1
  -- Saikai uses REST API for catalog
  local apiUrl = "https://api.saikai.com.br/api/stories"
                  .. "?format=1&q=&status=null&genres=&country=null"
                  .. "&sortProperty=title&sortDirection=asc"
                  .. "&page=" .. tostring(page) 
                  .. "&per_page=12"
                  .. "&relationships=language,type,format"
  
  local r = fetchPage(apiUrl)
if not r then return { items = {}, hasNext = false } end

  local items = {}
  
  -- Fallback to scraping the website's series page
  local url = baseUrl .. "series"
  local webR = fetchPage(url)
  
  if webR.success then
    -- Try to extract book links from the page
    for _, a in ipairs(html_select(webR.body, 'a[href*="/series/"]')) do
      local title = string_clean(a.text)
      local href = absUrl(a.href)
      
      if title ~= "" and #title >= 2 and href ~= "" then
        local cover = html_attr(a.html, "img", "src")
        table.insert(items, {
          title = title,
          url   = href,
          cover = absUrl(cover or "")
        })
      end
    end
    
    -- Deduplicate
    local seen = {}
    local uniqueItems = {}
    for _, item in ipairs(items) do
      if not seen[item.url] then
        seen[item.url] = true
        table.insert(uniqueItems, item)
      end
    end
    
    -- Assume there are more pages if we got items
    return { items = uniqueItems, hasNext = #uniqueItems > 0 }
  end
  
  return { items = {}, hasNext = false }
end

-- Search (uses same API with q parameter)
function getCatalogSearch(index, query)
  if not query or query == "" then 
    return { items = {}, hasNext = false } 
  end
  
  local page = index + 1
  local apiUrl = "https://api.saikai.com.br/api/stories"
                  .. "?format=1&q=" .. url_encode(query)
                  .. "&status=null&genres=&country=null"
                  .. "&sortProperty=title&sortDirection=asc"
                  .. "&page=" .. tostring(page) 
                  .. "&per_page=12"
                  .. "&relationships=language,type,format"
  
  local r = fetchPage(apiUrl)
if not r then return { items = {}, hasNext = false } end

  local items = {}
  
  -- Fallback: search via website
  local searchUrl = baseUrl .. "search?q=" .. url_encode(query)
  local webR = fetchPage(searchUrl)
  
  if webR.success then
    for _, a in ipairs(html_select(webR.body, 'a[href*="/series/"]')) do
      local title = string_clean(a.text)
      local href = absUrl(a.href)
      
      if title ~= "" and #title >= 2 and href ~= "" then
        table.insert(items, {
          title = title,
          url   = href,
          cover = ""
        })
      end
    end
    
    -- Deduplicate
    local seen = {}
    local uniqueItems = {}
    for _, item in ipairs(items) do
      if not seen[item.url] then
        seen[item.url] = true
        table.insert(uniqueItems, item)
      end
    end
    
    return { items = uniqueItems, hasNext = false }
  end
  
  return { items = {}, hasNext = false }
end

-- Book details
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
  local el = html_select_first(body, "h1, .story-title, .series-title")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local cover = html_attr(body, ".story-header img", "src")
         or html_attr(body, ".series-thumb img", "src")
  return cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, "#synopsis-content, .synopsis, .description")
  return el and string_trim(html_text(el.html)) or nil
end

-- Chapter list (complex extraction from Nuxt.js __NUXT__ data or HTML list)
function getChapterList(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return {} end
  
  local chapters = {}
  
  -- Method 1: Try to extract from ul.__chapters li elements
  local chapterItems = html_select(body, "ul.__chapters li")
  
  if #chapterItems > 0 then
    for _, li in ipairs(chapterItems) do
      local aTag = html_select_first(li.html, "a")
      local titleEl = html_select_first(li.html, ".__chapters--title")
      
      if aTag then
        local title = titleEl and string_clean(titleEl.text) or string_clean(aTag.text)
        local href = absUrl(aTag.href)
        
        if title ~= "" and href ~= "" then
          table.insert(chapters, {
            title = title,
            url   = href
          })
        end
      end
    end
  else
    -- Method 2: Look for any chapter-like links on the page
    -- Saikai chapter URLs typically contain /ler/series/
    for _, a in ipairs(html_select(body, 'a[href*="/ler/"], a[href*="/chapter"], a[href*="/cap"]')) do
      local title = string_clean(a.text)
      local href = absUrl(a.href)
      
      if title ~= "" and href ~= "" then
        table.insert(chapters, {
          title = title,
          url   = href
        })
      end
    end
  end
  
  -- Deduplicate by URL
  local seen = {}
  local uniqueChapters = {}
  for _, ch in ipairs(chapters) do
    if not seen[ch.url] then
      seen[ch.url] = true
      table.insert(uniqueChapters, ch)
    end
  end
  
  return uniqueChapters
end

function getChapterListHash(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, "ul.__chapters li:last-child a, a[href*='/ler/']:last-child")
  return el and el.href or nil
end

-- Chapter text
function getChapterText(html, url)
  local cleaned = html, "script", "style", ".chapter-nav", .ads, .share-buttons, .sidebar")
  if not el then return "" end
  return applyStandardContentTransforms(html_text(el.html))
end
