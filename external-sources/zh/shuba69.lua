-- ══════════════════════════════════════════════════════════════
--  69Shuba Source - Version 2.0.0 with Bypass Support
--  Site: https://www.69shuba.com/
--  Last Updated: 2026-07-25
--
--  CHANGES v2.0:
--  - Added bypasser module integration for CF protection
--  - All HTTP requests route through bypass
--  - Fixed regex_replace compatibility issues
-- ══════════════════════════════════════════════════════════════

id       = "shuba69"
name     = "69shuba"
version  = "2.0.0"
baseUrl  = "https://www.69shuba.com/"
language = "zh"
icon     = "69shuba.png"
charset  = "GBK"

-- ── Bypass Module ────────────────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[69Shuba] ✓ Bypass loaded")
else
    print("[69Shuba] ⚠ Direct HTTP mode")
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

local function postPage(url, data, opts)
    opts = opts or {}
    if bp then
        local html = bp.search(url, data)
        if html and html ~= "" then return html end
    end
    
    local r = http_post(url, data, opts)
    if r.success then return r.body end
    return nil
end

-- ── Catalog ──────────────────────────────────────────────────

function getCatalogList(index)
    local page = index + 1
    local url = baseUrl .. "novels/monthvisit_0_0_" .. tostring(page) .. ".htm"
    
    local body = fetchPage(url)
    if not body then return { items = {}, hasNext = false } end
    
    local items = {}
    for _, li in ipairs(html_select(body, "ul#article_list_content li")) do
        local titleEl = html_select_first(li.html, "div.newnav h3 a")
        if titleEl then
            local cover = html_attr(li.html, "a.imgbox img", "data-src")
            table.insert(items, {
                title = string_trim(titleEl.text),
                url   = absUrl(titleEl.href),
                cover = absUrl(cover)
            })
        end
    end
    
    return { items = items, hasNext = #items > 0 }
end

-- ── Search ──────────────────────────────────────────────────

function getCatalogSearch(index, query)
    if index > 0 then return { items = {}, hasNext = false } end
    
    local payload = "searchkey=" .. url_encode_charset(query, "GBK") .. "&searchtype=all"
    local body = postPage("https://www.69shuba.com/modules/article/search.php", payload, {
        headers = { ["Content-Type"] = "application/x-www-form-urlencoded" },
        charset = "GBK"
    })
    
    if not body then return { items = {}, hasNext = false } end
    
    local items = {}
    for _, li in ipairs(html_select(body, "div.newbox ul li")) do
        local titleEl = html_select_first(li.html, "h3 a:last-child")
        if titleEl then
            local cover = html_attr(li.html, "a.imgbox img", "data-src")
            table.insert(items, {
                title = string_trim(titleEl.text),
                url   = absUrl(titleEl.href),
                cover = absUrl(cover)
            })
        end
    end
    
    return { items = items, hasNext = false }
end

-- ── Book Details ────────────────────────────────────────────

function getBookTitle(bookUrl)
    local body = fetchPage(bookUrl)
    if not body then return nil end
    local el = html_select_first(body, "div.booknav2 h1 a")
    return el and string_trim(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
    local body = fetchPage(bookUrl)
    if not body then return nil end
    local cover = html_attr(body, "div.bookimg2 img", "src")
    return cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
    local body = fetchPage(bookUrl)
    if not body then return nil end
    local el = html_select_first(body, "div.navtxt")
    return el and string_trim(el.text) or nil
end

-- ── Chapter List ─────────────────────────────────────────────

function getChapterList(bookUrl)
    local id = string.match(bookUrl, "/(%d+)%.htm$")
    if not id then return {} end
    local listUrl = baseUrl .. id .. "/"
    
    local body = fetchPage(listUrl)
    if not body then return {} end
    
    local chapters = {}
    local elements = html_select(body, "div#catalog ul li a")
    for i = #elements, 1, -1 do
        local a = elements[i]
        table.insert(chapters, {
            title = string_trim(a.text),
            url   = absUrl(a.href)
        })
    end
    return chapters
end

function getChapterListHash(bookUrl)
    local body = fetchPage(bookUrl)
    if not body then return nil end
    local el = html_select_first(body, ".infolist li:nth-child(2)")
    return el and el.text or nil
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
                       :gsub("<div[^>]*txtinfo[^>]*>.*</div>", "")
                       :gsub("<div[^>]*bottom%-ad[^>]*>.*</div>", "")
                       :gsub("<div[^>]*bottem2[^>]*>.*</div>", "")
                       :gsub("<div[^>]*visible%-xs[^>]*>.*</div>", "")
                       :gsub("<script[^>]*>.*</script>", "")
    
    local el = html_select_first(cleaned, "div.txtnav")
    if not el then return "" end
    
    return cleanText(html_text(el.html))
end
