-- ══════════════════════════════════════════════════════════════
--  TimoTxt Source (提莫書屋) - Version 4.0.0 with Full Bypass
--  Site: https://www.timotxt.com/
--  Last Updated: 2026-07-25
--  Status: FULL BYPASS INTEGRATION
--
--  CHANGES v4.0:
--  - Complete rewrite using new bypasser module
--  - All HTTP requests go through CF bypass
--  - Browser-like headers, cookie persistence, retry logic
--  - Works WITHOUT external Trawl hosting (standalone mode)
-- ══════════════════════════════════════════════════════════════

-- ── Metadata ──────────────────────────────────────────────────
id       = "timotxt"
name     = "TimoTxt"
version  = "4.0.0"
baseUrl  = "https://www.timotxt.com/"
language = "zh"
icon     = "https://i1.timotxt.com/images/timo.png"
charset  = "UTF-8"

-- Cloudflare options
cf_options = {
    whitelist = true,
    ignore_markers = { "timotxt", "cloudflare" }
    }
    
-- ── Constants ────────────────────────────────────────────────
local IMAGE_CDN = "https://i1.timotxt.com"

-- ── Bypass Module Loading ─────────────────────────────────────
local bp = nil
local bp_ok, bp_err = pcall(require, "bypasser")
if bp_ok then
    bp = require("bypasser")
    print("[TimoTxt] ✓ Bypass module loaded (mode: " .. tostring(bp.mode) .. ")")
else
    print("[TimoTxt] ⚠ Bypass not available, using direct HTTP")
end

-- ── Helper Functions ─────────────────────────────────────────

local function absUrl(href)
    if not href or href == "" then return "" end
    if string_starts_with(href, "http") then return href end
    if string_starts_with(href, "//") then return "https:" .. href end
    return url_resolve(baseUrl, href)
end

local function cleanText(text)
    if not text or text == "" then return "" end
    text = string_trim(text)
    
    local junkPatterns = {
        "溫馨提示", "手機小說閱讀網", "手機用戶",
        "最新更新時間", "提莫書屋", "timotxt.com",
        "請記住本站域名", "手機用戶請訪問",
        "網站即將改版", "可能會造成閱讀進度丟失"
    }
    for _, pattern in ipairs(junkPatterns) do
        text = text:gsub(pattern, "")
    end
    text = text:gsub("\n%s*\n%s*\n", "\n\n")
    return string_trim(text)
end

-- Smart fetch function that uses bypasser when available
local _pageCache = {}
local function fetchPage(url)
    if _pageCache[url] then return _pageCache[url] end
    
    local body = nil
    
    -- Use bypasser if available
    if bp then
        body = bp.smartFetch(url, { retries = 3 })
    else
        -- Fallback to direct http_get
        local r = fetchPage(url)
        if r.success then body = r.body end
    end
    
    if body then
        _pageCache[url] = body
    end
    
    return body
end

-- ── Catalog (Browse Main Page) ──────────────────────────────

function getCatalogList(index)
    local url = baseUrl
    if index > 5 then return { items = {}, hasNext = false } end
    
    local body = fetchPage(url)
    if not body then return { items = {}, hasNext = false } end
    
    local items = {}
    
    -- Try multiple selectors for book lists
    local selectors = {
        "section.mt-3 ul.list.flex > li",
        "ul.list.flex.one.two-700 > li",
        "ul.news > li"
    }
    
    for _, sel in ipairs(selectors) do
        for _, li in ipairs(html_select(body, sel)) do
            local link = html_select_first(li.html, "h3 a[href]")
            if link then
                local title = string_clean(link.text)
                local bookUrl = absUrl(link.href)
                local coverEl = html_select_first(li.html, "img[src]")
                local cover = coverEl and coverEl.src or ""
                
                if cover ~= "" and not string_starts_with(cover, "http") then
                    cover = IMAGE_CDN .. cover
                end
                
                if title ~= "" and bookUrl ~= "" then
                    table.insert(items, { title = title, url = bookUrl, cover = cover })
                end
            end
        end
        if #items > 0 then break end
    end
    
    return { items = items, hasNext = #items > 0 }
end

-- ── Search ──────────────────────────────────────────────────

function getCatalogSearch(index, query)
    if not query or query == "" then
        return { items = {}, hasNext = false }
    end
    if index > 0 then return { items = {}, hasNext = false } end
    
    -- Handle direct URL input
    if string_starts_with(query, "http") and string_contains(query, "timotxt.com") then
        local body = fetchPage(query)
        if not body then return { items = {}, hasNext = false } end
        
        local title = html_attr(body, "meta[property=og:title]", "content")
        if not title or title == "" then
            local titleEl = html_select_first(body, "h1.title, h1")
            title = titleEl and string_clean(titleEl.text)
        end
        
        if not title or title == "" then return { items = {}, hasNext = false } end
        
        local cover = html_attr(body, "meta[property=og:image]", "content") or ""
        
        return {
            items = {{ title = title, url = query, cover = cover }},
            hasNext = true
        }
    end
    
    -- Search via /search/{query} endpoint
    local searchUrl = baseUrl .. "search/" .. url_encode(query)
    local r = nil
    
    if bp then
        -- Use bypasser for search (handles Turnstile!)
        local html = bp.smartFetch(searchUrl, { retries = 5 })
        if html and html ~= "" then
            r = { success = true, body = html }
        else
            r = { success = false }
        end
    else
        r = http_get(searchUrl)
    end
    
    -- If GET fails, try POST
if not r then
        if bp then
            local html = bp.search(baseUrl .. "search.php", "keyword=" .. url_encode(query))
            if html and html ~= "" then
                r = { success = true, body = html }
            end
        else
            r = http_post(baseUrl .. "search.php", "keyword=" .. url_encode(query), {
                headers = { ["Content-Type"] = "application/x-www-form-urlencoded" }
            })
        end
    end
    
if not r then return { items = {}, hasNext = false } end

    local items = {}
    
for _, li in ipairs(html_select(r, "ul.list.flex > li, ul.list > li")) do
        local link = html_select_first(li.html, "h3 a[href], a[href]")
        if link then
            local title = string_clean(link.text)
            local bookUrl = absUrl(link.href)
            local coverEl = html_select_first(li.html, "img[src]")
            local cover = coverEl and coverEl.src or ""
            
            if cover ~= "" and not string_starts_with(cover, "http") then
                cover = IMAGE_CDN .. cover
            end
            
            if title ~= "" and bookUrl ~= "" then
                table.insert(items, { title = title, url = bookUrl, cover = cover })
            end
        end
    end
    
    return { items = items, hasNext = false }
end

-- ── Book Details ────────────────────────────────────────────

function getBookTitle(bookUrl)
    local body = fetchPage(bookUrl)
    if not body then return nil end
    
    local title = html_attr(body, "meta[property=og:title]", "content")
    if title and title ~= "" then return string_trim(title) end
    
    local el = html_select_first(body, "h1.title.is-2, h1.title, h1")
    return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
    local body = fetchPage(bookUrl)
    if not body then return nil end
    
    local cover = html_attr(body, "meta[property=og:image]", "content")
    if cover and cover ~= "" then
        if not string_starts_with(cover, "http") then
            cover = IMAGE_CDN .. cover
        end
        return absUrl(cover)
    end
    
    local imgEl = html_select_first(body, ".cover img[src], div.cover img[src], img.book-cover[src]")
    if imgEl and imgEl.src then
        return absUrl(imgEl.src)
    end
    
    return nil
end

function getBookDescription(bookUrl)
    local body = fetchPage(bookUrl)
    if not body then return nil end
    
    local metaDesc = html_attr(body, "meta[name=description]", "content")
    if metaDesc and metaDesc ~= "" and #metaDesc > 20 then 
        return string_trim(metaDesc) 
    end
    
    local el = html_select_first(body, ".intro, .description, .book-intro, p.desc, div.intro")
    if el then 
        local desc = string_clean(el.text)
        if desc and #desc > 10 then return desc end
    end
    
    return nil
end

-- ── Chapter List ─────────────────────────────────────────────

function getChapterList(bookUrl)
    local dirUrl = bookUrl
    if not string_ends_with(dirUrl, "/") then
        dirUrl = dirUrl .. "/"
    end
    dirUrl = dirUrl .. "dir"
    
    local body = fetchPage(dirUrl)
    if not body then
        body = fetchPage(bookUrl)
    end
    
    if not body then return {} end
    
    local chapters = {}
    
    -- Try all chapter list selectors
    local allLinks = html_select(body, "div.chaplist ul.all li a[href], ul.all li a[href]")
    if #allLinks > 0 then
        for _, a in ipairs(allLinks) do
            local title = string_clean(a.text)
            local url = absUrl(a.href)
            if title ~= "" and url ~= "" then
                table.insert(chapters, { title = title, url = url })
            end
        end
    else
        local links = html_select(body, "div.chaplist li a[href], ul.chaplist a[href], ul.chapter-list li a")
        for _, a in ipairs(links) do
            local title = string_clean(a.text)
            local url = absUrl(a.href)
            if title ~= "" and url ~= "" then
                table.insert(chapters, { title = title, url = url })
            end
        end
    end
    
    return chapters
end

function getChapterListHash(bookUrl)
    local body = fetchPage(bookUrl)
    if not body then return nil end
    
    local lastChap = html_select_first(body, "div.chaplist ul.all li:last-child a, ul.all li:last-child a")
    if lastChap then return lastChap.href end
    
    lastChap = html_select_first(body, "ul.news li:first-child a")
    return lastChap and lastChap.href or nil
end

-- ── Chapter Text Extraction ─────────────────────────────────

function getChapterText(html, url)
    local el = html_select_first(html, "div.chapter-content div.content")
    
    if not el then
        el = html_select_first(html, "div.content")
            or html_select_first(html, "#chapterContent")
            or html_select_first(html, ".text-content")
            or html_select_first(html, "article")
    end
    
    if not el then return "" end
    
    local text = html_text(el.html)
    text = cleanText(text)
    
    return text
end

function getChapterTitle(html, url)
    local el = html_select_first(html, "h1.imgtext, h1.chapter-title, h1")
    if el then
        local title = string_clean(el.text)
        if not title or title == "" then
            local navLink = html_select_first(html, "div.header ul.nav li:last-child a, .nav li a.imgtext")
            if navLink then
                title = string_clean(navLink.text)
            end
        end
        return title ~= "" and title or nil
    end
    return nil
end
