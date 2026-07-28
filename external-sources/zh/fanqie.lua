-- ── Metadata ────────────────────────────────────────────────────────────────

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[fanqie] ✓ Bypass loaded")
else
    print("[fanqie] ⚠ Direct HTTP mode")
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

id       = "fanqie"
name     = "FanQie Novel"
version  = "1.0.0"
baseUrl  = "https://fanqienovel.com/"
language = "zh"
icon     = "https://raw.githubusercontent.com/HnDK0/external-sources/main/icons/fanqie.png"
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
    local url = baseUrl .. "api/book/list?category_id=0&page=" .. tostring(page) .. "&page_size=20"
    
    local r = fetchPage(url, { charset = "UTF-8" })
if not r then return { items = {}, hasNext = false } end

    local items = {}
    -- Try parsing as JSON first (API response)
    local data = json_parse(r.body)
    if data and data.data and data.data.book_list then
        for _, book in ipairs(data.data.book_list) do
            table.insert(items, {
                title = book.book_name or "",
                url   = absUrl(baseUrl .. "page/" .. tostring(book.book_id)),
                cover = book.thumb_url and absUrl(book.thumb_url) or nil
            })
        end
    else
        -- Fallback to HTML scraping
for _, item in ipairs(html_select(r, ".book-item, .novel-item, [class*='book']")) do
            local titleEl = html_select_first(item.html, "h3 a, .title a, a.name")
            if titleEl then
                local cover = html_attr(item.html, "img.cover, img.book-cover", "src")
                table.insert(items, {
                    title = string_trim(titleEl.text),
                    url   = absUrl(titleEl.href),
                    cover = absUrl(cover ~= "" and cover or nil)
                })
            end
        end
    end
    
    return { items = items, hasNext = #items > 0 }
end

-- ── Search ───────────────────────────────────────────────────────────────────

function getCatalogSearch(index, query)
    if index > 0 then return { items = {}, hasNext = false } end
    
    local searchUrl = baseUrl ~ "api/search?query=" .. url_encode(query)
    local r = fetchPage(searchUrl, { charset = "UTF-8" })
    
if not r then return { items = {}, hasNext = false } end

    local items = {}
    local data = json_parse(r.body)
    if data and data.data and data.data.search_data then
        for _, book in ipairs(data.data.search_data) do
            table.insert(items, {
                title = book.book_name or book.name or "",
                url   = absUrl(baseUrl .. "page/" .. tostring(book.book_id or book.id)),
                cover = book.thumb_url and absUrl(book.thumb_url) or nil
            })
        end
    else
for _, item in ipairs(html_select(r, ".search-result-item, .book-item")) do
            local titleEl = html_select_first(item.html, "h3 a, .title a")
            if titleEl then
                local cover = html_attr(item.html, "img", "src")
                table.insert(items, {
                    title = string_trim(titleEl.text),
                    url   = absUrl(titleEl.href),
                    cover = absUrl(cover ~= "" and cover or nil)
                })
            end
        end
    end
    
    return { items = items, hasNext = false }
end

-- ── Book Details ────────────────────────────────────────────────────────────

function getBookTitle(bookUrl)
    local r = fetchPage(bookUrl, { charset = "UTF-8" })
if not r then return nil end
local el = html_select_first(r, "h1.book-name, .book-info h1, h1.mt40")
    return el and string_trim(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
    local r = fetchPage(bookUrl, { charset = "UTF-8" })
if not r then return nil end
    local cover = html_attr(r.body, ".book-cover img", "src") 
               or html_attr(r.body, "img.mw100", "src")
    return cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
    local r = fetchPage(bookUrl, { charset = "UTF-8" })
if not r then return nil end
local el = html_select_first(r, ".book-intro, .intro-content, .desc-text")
    return el and string_trim(el.text) or nil
end

-- ── Chapter List ────────────────────────────────────────────────────────────

function getChapterList(bookUrl)
    local bookId = string.match(bookUrl, "/page/(%d+)")
    if not bookId then return {} end
    
    local apiUrl = baseUrl .. "api/reader/chapter_list?book_id=" .. bookId
    local r = fetchPage(apiUrl, { charset = "UTF-8" })
if not r then return {} end

    local chapters = {}
    local data = json_parse(r.body)
    if data and data.data and data.data.chapter_list then
        for _, chapter in ipairs(data.data.chapter_list) do
            table.insert(chapters, {
                title = chapter.title or chapter.chapter_title or "",
                url   = absUrl(baseUrl .. "reader/" .. tostring(chapter.chapter_id or chapter.id))
            })
        end
    else
        -- Fallback to HTML parsing
        local pageR = fetchPage(bookUrl, { charset = "UTF-8" })
        if pageR.success then
            for _, a in ipairs(html_select(pageR.body, ".chapter-list a, .directory-list a")) do
                if a.href and a.href ~= "" then
                    table.insert(chapters, {
                        title = string_trim(a.text),
                        url   = absUrl(a.href)
                    })
                end
            end
        end
    end
    
    return chapters
end

function getChapterListHash(bookUrl)
    local r = fetchPage(bookUrl, { charset = "UTF-8" })
if not r then return nil end
local el = html_select_first(r, ".update-time, .last-update")
    return el and string_trim(el.text) or nil
end

-- ── Chapter Text ────────────────────────────────────────────────────────────

function getChapterText(html)
    local cleaned = html
    
    local el = html_select_first(cleaned, ".reader-content, .chapter-content, .content, #readerContent")
    if not el then 
        el = html_select_first(cleaned, ".text-content, article.content")
    end
    if not el then return "" end
    
    return applyStandardContentTransforms(html_text(el.html))
end
