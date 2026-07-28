-- Metadata
id       = "royal_road"
name     = "RoyalRoad"
version  = "1.0.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[royal_road] ✓ Bypass loaded")
else
    print("[royal_road] ⚠ Direct HTTP mode")
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

baseUrl  = "https://www.royalroad.com/"
language = "en"

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

-- Catalog (best-rated fictions)
function getCatalogList(index)
  local page = index + 1
  local url = baseUrl .. "fictions/best-rated?page=" .. tostring(page)
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, el in ipairs(html_select(r, ".fiction-list-item")) do
    -- Second <a> is usually the fiction link (first is author)
    local links = html_select(el.html, "a[href]")
    local link = links[2] -- Get second link (fiction link)
    if link then
      local title = string_clean(link.text)
      local bookUrl = absUrl(link.href)
      local cover = html_attr(el.html, "img[src]", "src") or ""
      if title ~= "" and bookUrl ~= "" then
        table.insert(items, { title = title, url = bookUrl, cover = cover })
      end
    end
  end
  
  -- Check pagination
local nav = html_select_first(r, "ul.pagination")
  local hasNext = false
  if nav then
    local children = html_select(nav.html, "li")
    hasNext = #children > 0 and not string_contains(children[#children].class or "", "active")
  else
    hasNext = true
  end
  
  return { items = items, hasNext = not hasNext }
end

-- Search (only first page)
function getCatalogSearch(index, query)
  if not query or query == "" then return { items = {}, hasNext = false } end
  if index > 0 then return { items = {}, hasNext = false } end
  
  local url = baseUrl .. "fictions/search?title=" .. url_encode(query)
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, el in ipairs(html_select(r, ".fiction-list-item")) do
    local links = html_select(el.html, "a[href]")
    local link = links[2]
    if link then
      local title = string_clean(link.text)
      local bookUrl = absUrl(link.href)
      local cover = html_attr(el.html, "img[src]", "src") or ""
      if title ~= "" and bookUrl ~= "" then
        table.insert(items, { title = title, url = bookUrl, cover = cover })
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
  local el = html_select_first(body, "h1.fiction-title, .fic-title h1")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local cover = html_attr(body, ".cover-art-container img[src]", "src")
  return cover and cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, ".description, .fiction-description")
  if el then return applyStandardContentTransforms(html_text(el.html)) end
  return nil
end

-- Chapter list
function getChapterList(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return {} end
  
  local chapters = {}
  for _, row in ipairs(html_select(body, ".chapter-row")) do
    local link = html_select_first(row.html, "a[href]")
    if link then
      local title = string_clean(link.text)
      local url = absUrl(link.href)
      if title ~= "" and url ~= "" then
        table.insert(chapters, { title = title, url = url })
      end
    end
  end
  
  return chapters
end

-- Chapter text (handle hidden content via CSS rules)
function getChapterText(html, url)
  -- Extract hidden class names from style tags
  local styles = html_select(html, "style")
  local hiddenClasses = {}
  for _, style in ipairs(styles) do
    local cssText = style.text or ""
    for cls in regex_match(cssText, "(\\.\\w+)\\s*\\{[^}]*display:\\s*none[^}]*\\}") do
      local className = string.match(cls, "%.(%w+)")
      if className then table.insert(hiddenClasses, "." .. className) end
    end
  end
  
  -- Build remove selectors
  local removeSelectors = {"script", "style", "a", ".ads-title", ".hidden"}
  for _, cls in ipairs(hiddenClasses) do
    table.insert(removeSelectors, cls)
  end
  
  local cleaned = html