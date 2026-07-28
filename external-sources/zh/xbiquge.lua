-- ══════════════════════════════════════════════════════════════
--  XBiQuGe Source - Version 2.0.0 with Bypass Support
--  Site: https://www.xbiquge.info/
--  Last Updated: 2026-07-25
--
--  CHANGES v2.0:
--  - Added bypasser module integration for CF protection
--  - All HTTP requests route through bypass
--  - Fixed regex_replace compatibility issues
-- ══════════════════════════════════════════════════════════════

id       = "xbiquge"
name     = "XBiQuGe"
version  = "2.0.0"
baseUrl  = "https://www.xbiquge.info/"
language = "zh"
icon     = "xbiquge.png"
charset  = "GBK"

-- ── Bypass Module ────────────────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[XBiQuGe] ✓ Bypass loaded")
else
    print("[XBiQuGe] ⚠ Direct HTTP mode")
end

-- ── Helpers ──────────────────────────────────────────────────

local function absUrl(href)
    if href == "" then return "" end
    if string_starts_with(href, "http") then return href end
    if string_starts_with(href, "//") then return "https:" .. href end
    return url_resolve(baseUrl, href)
end

local function cleanText(text)
    if not text or text == "" then return "" end
    text = string_normalize(text)
    
    -- Remove domain references (using gsub instead of regex_replace)
    local domain = baseUrl:gsub("https?://", ""):gsub("^www%.", ""):gsub("/$", "")
    text = text:gsub(domain .. ".-\n", "")
    
    -- Remove chapter headers that duplicate title
    text = text:gsub("^%s*(第[一二三四五六七八九十百%d]+[章节][^\n\r]*[\n\r%s]*)+", "")
    text = text:gsub("^%s*(Chapter%s+%d+[^\n\r]*[\n\r%s]*)+", "")
    
    -- Remove "(本章完)" markers
    text = text:gsub("%s*%(本章完%)%s*$", "")
    
    return string_trim(text)
end

local function fetchPage(url, opts)
    opts = opts or {}
    if bp then
        local html = bp.smartFetch(url, { retries = 3 })
        if html and html ~= "" then return html end
    end
    
    local r = fetchPage(url, { charset = charset })
    if r.success then return r.body end
    return nil
end

-- ── Catalog ──────────────────────────────────────────────────

function getCatalogList(index)
    local page = index + 1
    local sortTypes = { "0_1", "2_1", "1_1", "4_1" }
    local sortKey = sortTypes[(page % #sortTypes) + 1]
    local pageNum = math.floor(page / #sortTypes) + 1
    local url = baseUrl .. "sort/" .. sortKey .. "/" .. tostring(pageNum) .. ".html"
    
    local body = fetchPage(url)
    if not body then return { items = {}, hasNext = false } end
    
    local items = {}
    for _, item in ipairs(html_select(body, ".novellist li, .result-list li, div[id='content'] li")) do
        local titleEl = html_select_first(item.html, "a:first-child")
        if titleEl then
            table.insert(items, {
                title = string_trim(titleEl.text),
                url   = absUrl(titleEl.href),
                cover = nil
            })
        end
    end
    
    return { items = items, hasNext = #items > 0 }
end

-- ── Search ──────────────────────────────────────────────────

function getCatalogSearch(index, query)
    if index > 0 then return { items = {}, hasNext = false } end
    
    local searchUrl = baseUrl .. "modules/article/wss.php?keyword=" .. url_encode_charset(query, "GBK")
    local body = fetchPage(searchUrl)
    
    if not body then return { items = {}, hasNext = false } end
    
    local items = {}
    for _, item in ipairs(html_select(body, ".result-list li, .novellist li, div.result-item")) do
        local titleEl = html_select_first(item.html, "a:first-child, h2 a, .bookname a")
        if titleEl then
            table.insert(items, {
                title = string_trim(titleEl.text),
                url   = absUrl(titleEl.href),
                cover = nil
            })
        end
    end
    
    return { items = items, hasNext = false }
end

-- ── Book Details ────────────────────────────────────────────

function getBookTitle(bookUrl)
    local body = fetchPage(bookUrl)
    if not body then return nil end
    local el = html_select_first(body, "#info h1, .book-info h1, h1")
    return el and string_trim(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
    local body = fetchPage(bookUrl)
    if not body then return nil end
    local cover = html_attr(body, "#fmimg img", "src") 
               or html_attr(body, ".book-img img", "src")
    return cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
    local body = fetchPage(bookUrl)
    if not body then return nil end
    local el = html_select_first(body, "#intro, .book-intro, .intro, #description")
    return el and string_trim(el.text) or nil
end

-- ── Chapter List ─────────────────────────────────────────────

function getChapterList(bookUrl)
    local body = fetchPage(bookUrl)
    if not body then return {} end
    
    local chapters = {}
    local elements = html_select(body, "#list dl dd a, .chapter-list li a, div.list dl dd a")
    for _, a in ipairs(elements) do
        if a.href and a.href ~= "" then
            table.insert(chapters, {
                title = string_trim(a.text),
                url   = absUrl(a.href)
            })
        end
    end
    return chapters
end

function getChapterListHash(bookUrl)
    local body = fetchPage(bookUrl)
    if not body then return nil end
    local el = html_select_first(body, "#info p:last-child, .update-info, .time")
    return el and string_trim(el.text) or nil
end

-- ── Chapter Text ─────────────────────────────────────────────

function getChapterText(html)
    local pageUrl = html_attr(html, "link[rel='canonical']", "href")
    if pageUrl == "" then
        pageUrl = html_attr(html, "meta[property='og:url']", "content")
    end
    
    if pageUrl ~= "" then
        local body = fetchPage(pageUrl)
        if body then html = body end
    end
    
    -- Clean HTML using gsub instead of html_remove
    local cleaned = html:gsub("<h1[^>]*>.*</h1>", "")
                       :gsub("<div[^>]*bottem2[^>]*>.*</div>", "")
                       :gsub("<div[^>]*bottem[^>]*>.*</div>", "")
                       :gsub("<div[^>]*con_top[^>]*>.*</div>", "")
                       :gsub("<script[^>]*>.*</script>", "")
    
    local el = html_select_first(cleaned, "#content, .content, .book-content, .text")
    if not el then return "" end
    
    return cleanText(html_text(el.html))
end
