-- Metadata
id       = "novel_updates"
name     = "NovelUpdates"
version  = "1.0.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[novel_updates] ✓ Bypass loaded")
else
    print("[novel_updates] ⚠ Direct HTTP mode")
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

baseUrl  = "https://www.novelupdates.com/"
language = "en"

-- NOTE: Requires login for chapter access
-- Chapter links redirect to external sites

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

-- Check if last page based on pagination
local function isLastPage(body)
  local nav = html_select_first(body, "div.digg_pagination")
  if not nav then return true end
  local children = html_select(nav.html, "*")
  if #children == 0 then return true end
  local lastChild = children[#children]
  return string_contains(lastChild.class or "", "current")
end

-- Catalog (novel listing - sorted by last updated)
function getCatalogList(index)
  local page = index + 1
  local url = baseUrl .. "novelslisting/?sort=7&order=1&status=1&st=1"
  if page > 1 then url = url .. "&pg=" .. tostring(page) end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, el in ipairs(html_select(r, ".search_main_box_nu")) do
    local titleLink = html_select_first(el.html, ".search_title > a[href]")
    if titleLink then
      local title = string_clean(titleLink.text)
      local bookUrl = titleLink.href or ""
      local cover = html_attr(el.html, ".search_img_nu > img[src]", "src") or ""
      
      -- Skip "no image found" placeholder
      if string_contains(cover, "noimagefound") then cover = "" end
      
      if title ~= "" and bookUrl ~= "" then
        table.insert(items, { title = title, url = bookUrl, cover = cover })
      end
    end
  end
  
  return { items = items, hasNext = not isLastPage(r.body) }
end

-- Search (series-finder)
function getCatalogSearch(index, query)
  if not query or query == "" then return { items = {}, hasNext = false } end
  
  local page = index + 1
  local url = baseUrl .. "series-finder?sf=1&sh=" .. url_encode(query) .. "&sort=sdate&order=desc"
  if page > 1 then url = url .. "&pg=" .. tostring(page) end
  
  local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

  local items = {}
for _, el in ipairs(html_select(r, ".search_main_box_nu")) do
    local titleLink = html_select_first(el.html, ".search_title > a[href]")
    if titleLink then
      local title = string_clean(titleLink.text)
      local bookUrl = titleLink.href or ""
      local cover = html_attr(el.html, ".search_img_nu > img[src]", "src") or ""
      
      if string_contains(cover, "noimagefound") then cover = "" end
      
      if title ~= "" and bookUrl ~= "" then
        table.insert(items, { title = title, url = bookUrl, cover = cover })
      end
    end
  end
  
  return { items = items, hasNext = not isLastPage(r.body) }
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
  local el = html_select_first(body, ".seriestitl")
  return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local cover = html_attr(body, "div.seriesimg > img[src]", "src")
  -- Skip "no image found" placeholder
  if cover and string_contains(cover, "noimagefound") then return nil end
  return cover and cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return nil end
  local el = html_select_first(body, "#editdescription")
  if el then return applyStandardContentTransforms(html_text(el.html)) end
  return nil
end

-- Chapter list (requires login - uses AJAX POST endpoint)
-- NOTE: This may not work without proper authentication
function getChapterList(bookUrl)
  local body = fetchPage(bookUrl)
  if not body then return {} end
  
  -- Extract required form values
  local grrGroups = html_attr(body, "#grr_groups", "value")
  local mypostId = html_attr(body, "#mypostid", "value")
  
  if not grrGroups or grrGroups == "" or not mypostId or mypostId == "" then
    log_error("novel_updates: Cannot extract form values from " .. bookUrl .. " (login may be required)")
    return {}
  end
  
  -- The original uses POST request; we'll try GET with parameters
  -- Note: This likely requires authentication cookies to work
  local ajaxUrl = baseUrl .. "wp-admin/admin-ajax.php?action=nd_getchapters&mygrr=" .. url_encode(grrGroups) .. "&mygroupfilter=&mypostid=" .. url_encode(mypostId)
  
  local r = fetchPage(ajaxUrl)
if not r then return {} end

  local chapters = {}
  -- Find all <a> tags with data-id attribute (chapter links)
for _, a in ipairs(html_select(r, "a[data-id][href]")) do
    local href = a.href
    if href and href ~= "" then
      -- Get title from span's title attribute
      local span = html_select_first(get_element_html(a), "span[title]")
      local title = span and html_attr_raw(span, "title") or ""
      
      -- Ensure URL is absolute (may start with //)
      local url = href
      if string_starts_with(href, "//") then
        url = "https:" .. href
      elseif not string_starts_with(href, "http") then
        url = absUrl(href)
      end
      
      if title ~= "" and url ~= "" then
        table.insert(chapters, { title = title, url = url })
      end
    end
  end
  
  -- Reverse to chronological order (newest first on site)
  local reversed = {}
  for i = #chapters, 1, -1 do
    table.insert(reversed, chapters[i])
  end
  return reversed
end

-- Chapter text (NovelUpdates redirects to external sites - no content here)
function getChapterText(html, url)
  -- NovelUpdates doesn't host chapter content; it redirects to source sites
  return ""
end

function getChapterTitle(html, url)
  return nil
end
