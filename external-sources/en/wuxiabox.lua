-- Metadata
id       = "wuxiabox"
name     = "WuxiaBox"
version  = "1.0.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[wuxiabox] ✓ Bypass loaded")
else
    print("[wuxiabox] ⚠ Direct HTTP mode")
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

baseUrl  = "https://www.wuxiabox.com/"
language = "en"

-- Cloudflare options (site may have CF protection)
cf_options = {
    whitelist = true,
    ignore_markers = { "wuxiabox" }
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

-- Catalog (uses /category/all.html with pagination)
function getCatalogList(index)
  local page = index + 1
  local url
  if page == 1 then
    url = baseUrl .. "category/all.html"
  else
    url = baseUrl .. "category/all/" .. tostring(page) .. ".html"
  end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
  -- Book links: a[href*="/novel/"] but skip chapter links (those have _<N>.html)
for _, a in ipairs(html_select(r, 'a[href*="/novel/"]')) do
    local href = a.href or ""
    
    -- Skip chapter links (pattern: <slug>_<N>.html)
    if not string_match(href, "_%d+%.html$") then
      local title = a.attr.title 
        or html_select_first(a.html, "h2, h3, h4, .title, .novel-title")
        and ""
        or string_clean(a.text)
      
      -- Skip short titles (likely navigation)
      if title ~= "" and #title >= 2 then
        local cover = html_attr(a.html, "img[data-src]", "data-src")
                   or html_attr(a.html, "img", "src")
                   or ""
        
        table.insert(items, {
          title = string_trim(title),
          url   = absUrl(href),
          cover = absUrl(cover)
        })
      end
    end
  end
  
  -- Deduplicate by URL
  local seen = {}
  local uniqueItems = {}
  for _, item in ipairs(items) do
    if not seen[item.url] then
      seen[item.url] = true
      table.insert(uniqueItems, item)
    end
  end
  
local hasNext = html_select_first(r, "a.next[href]") ~= nil
or html_select_first(r, ".pagination a[rel=next]") ~= nil
  return { items = uniqueItems, hasNext = hasNext }
end

-- Search (uses /search.html?searchkey=<query>)
function getCatalogSearch(index, query)
  if not query or query == "" then 
    return { items = {}, hasNext = false } 
  end
  
  local page = index + 1
  local url = baseUrl .. "search.html?searchkey=" .. url_encode(query)
  if page > 1 then
    url = url .. "&page=" .. tostring(page)
  end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, a in ipairs(html_select(r, 'a[href*="/novel/"]')) do
    local href = a.href or ""
    
    -- Skip chapter links
    if not string_match(href, "_%d+%.html$") then
      local title = a.attr.title 
        or string_clean(a.text)
      
      if title ~= "" and #title >= 2 then
        local cover = html_attr(a.html, "img[data-src]", "data-src")
                   or html_attr(a.html, "img", "src")
                   or ""
        
        table.insert(items, {
          title = string_trim(title),
          url   = absUrl(href),
          cover = absUrl(cover)
        })
      end
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
  
local hasNext = html_select_first(r, "a.next[href]") ~= nil
or html_select_first(r, ".pagination a[rel=next]") ~= nil
  return { items = uniqueItems, hasNext = hasNext }
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
  local el = html_select_first(body, "h1")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  -- Cover image contains /d/file/cover in src
  local cover = html_attr(body, 'img[src*="/d/file/cover"]', "src")
         or html_attr(body, ".novel-header .cover img", "src")
         or html_attr(body, "figure.cover img", "src")
         or html_attr(body, 'meta[property="og:image"]', "content")
  return cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local descEl = html_select_first(body, "div.summary div.content")
               or html_select_first(body, "div.summary")
               or html_select_first(body, "p.description")
  if descEl then
    local cleaned = html