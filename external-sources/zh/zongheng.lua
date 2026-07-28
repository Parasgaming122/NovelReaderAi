-- ── Metadata ────────────────────────────────────────────────────────────────

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[zongheng] ✓ Bypass loaded")
else
    print("[zongheng] ⚠ Direct HTTP mode")
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

id       = "zongheng"
name     = "ZongHeng Literature"
version  = "1.0.0"
baseUrl  = "https://book.zongheng.com/"
language = "zh"
icon     = "https://raw.githubusercontent.com/HnDK0/external-sources/main/icons/zongheng.png"
charset  = "UTF-8"

-- ── Helper Functions ─────────────────────────────────────────────────────────

local function absUrl(href)
    if href == "" then return "" end
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
    text = string.gsub(text, "(?im)^\\s*\\(本章完\\)\\s*$", "")
    text = string_trim(text)
    return text
end

-- ── Catalog ──────────────────────────────────────────────────────────────────

function getCatalogList(index)
    local page = index + 1
    local url = "https://www.zongheng.com/rank/yuepiao.html?page=" .. tostring(page)
    
    local r = fetchPage(url, { charset = "UTF-8" })
if not r then return { items = {}, hasNext = false } end

    local items = {}
for _, item in ipairs(html_select(r, ".rankitem_list li, .rank-book-item")) do
        local titleEl = html_select_first(item.html, ".bookname a, h2 a, .title a")
        if titleEl then
            local cover = html_attr(item.html, ".book-img img", "src") 
                       or html_attr(item.html, "img.bookcover", "src")
            table.insert(items, {
                title = string_trim(titleEl.text),
                url   = absUrl(titleEl.href),
                cover = absUrl(cover ~= "" and cover or nil)
            })
        end
    end
    
    return { items = items, hasNext = #items > 0 }
end

-- ── Search ───────────────────────────────────────────────────────────────────

function getCatalogSearch(index, query)
    if index > 0 then return { items = {}, hasNext = false } end
    
    local searchUrl = "https://search.zongheng.com/s?keyword=" .. url_encode(query)
    local r = fetchPage(searchUrl, { charset = "UTF-8" })
    
if not r then return { items = {}, hasNext = false } end

    local items = {}
for _, item in ipairs(html_select(r, ".search-result-list li, .result-item")) do
        local titleEl = html_select_first(item.html, ".book-name a, h2 a, .tit a")
        if titleEl then
            local cover = html_attr(item.html, ".book-img img", "src")
            table.insert(items, {
                title = string_trim(titleEl.text),
                url   = absUrl(titleEl.href),
                cover = absUrl(cover ~= "" and cover or nil)
            })
        end
    end
    
    return { items = items, hasNext = false }
end

-- ── Book Details ────────────────────────────────────────────────────────────

function getBookTitle(bookUrl)
    local r = fetchPage(bookUrl, { charset = "UTF-8" })
if not r then return nil end
local el = html_select_first(r, ".book-info h1, .info h1, h1.book-name")
    return el and string_trim(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
    local r = fetchPage(bookUrl, { charset = "UTF-8" })
if not r then return nil end
    local cover = html_attr(r.body, ".book-pic img", "src") 
               or html_attr(r.body, ".book-cover img", "src")
    return cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
    local r = fetchPage(bookUrl, { charset = "UTF-8" })
if not r then return nil end
local el = html_select_first(r, ".book-dec, .book-desc, .intro, .description")
    return el and string_trim(el.text) or nil
end

-- ── Chapter List ────────────────────────────────────────────────────────────

function getChapterList(bookUrl)
    local r = fetchPage(bookUrl, { charset = "UTF-8" })
if not r then return {} end

    local chapters = {}
    -- Try multiple possible selectors for chapter list
local elements = html_select(r, ".chapter-list li a, .volume-chapters a, ul.chapter-list a")
    for _, a in ipairs(elements) do
        if a.href and a.href ~= "" then
            table.insert(chapters, {
                title = string_trim(a.text),
                url   = absUrl(a.href)
            })
        end
    end
    
    -- If no chapters found, try to find catalog link and fetch from there
    if #chapters == 0 then
local catalogLink = html_select_first(r, ".more-chapter a, a.catalog-link, .all-chapter a")
        if catalogLink and catalogLink.href then
            local catalogUrl = absUrl(catalogLink.href)
            local cr = fetchPage(catalogUrl, { charset = "UTF-8" })
            if cr.success then
                for _, a in ipairs(html_select(cr.body, "li a, .chapter-item a")) do
                    if a.href and a.href ~= "" then
                        table.insert(chapters, {
                            title = string_trim(a.text),
                            url   = absUrl(a.href)
                        })
                    end
                end
            end
        end
    end
    
    return chapters
end

function getChapterListHash(bookUrl)
    local r = fetchPage(bookUrl, { charset = "UTF-8" })
if not r then return nil end
local el = html_select_first(r, ".update-time, .time, .book-info .num")
    return el and string_trim(el.text) or nil
end

-- ── Chapter Text ────────────────────────────────────────────────────────────

function getChapterText(html)
    local cleaned = html
    
    local el = html_select_first(cleaned, ".content, .chapter-content, .reader-content, #chapterContent")
    if not el then 
        el = html_select_first(cleaned, ".text-content, .article-text")
    end
    if not el then return "" end
    
    return applyStandardContentTransforms(html_text(el.html))
end
