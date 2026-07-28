id       = "novelfire"
name     = "NovelFire"
version  = "1.0.6"
baseUrl  = "https://novelfire.net"
language = "en"
icon     = "https://raw.githubusercontent.com/HnDK0/external-sources/main/icons/novelfire.png"

-- ── Хелперы ───────────────────────────────────────────────────────────────────

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[novelfire] ✓ Bypass loaded")
else
    print("[novelfire] ⚠ Direct HTTP mode")
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
    text = string.gsub(text, "(?i)\\A[\\s\\p{Z}\\uFEFF]*((Глава\\s+\\d+|Chapter\\s+\\d+)[^\\n\\r]*[\\n\\r\\s]*)+", "")
    text = string.gsub(text, "(?im)^\\s*(Translator|Editor|Proofreader|Read\\s+(at|on|latest))[:\\s][^\\n\\r]{0,70}(\\r?\\n|$)", "")
    text = string_trim(text)
    return text
end

-- ── Каталог ───────────────────────────────────────────────────────────────────

function getCatalogList(index)
    local page = index + 1
    local url = baseUrl .. "/search-adv?ctgcon=and&totalchapter=0&ratcon=min&rating=0&status=-1&sort=rank-top&page=" .. page
    
    local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

    local items = {}
for _, card in ipairs(html_select(r, ".novel-list > .novel-item")) do
        local titleEl = html_select_first(card.html, ".novel-title")
        local linkEl  = html_select_first(card.html, ".novel-title a")
        local cover   = html_attr(card.html, "img", "data-src")
        if cover == "" then cover = html_attr(card.html, "img", "src") end
        
        if titleEl and linkEl then
            table.insert(items, {
                title = string_clean(titleEl.text),
                url   = absUrl(linkEl.href),
                cover = absUrl(cover)
            })
        end
    end
    return { items = items, hasNext = #items > 0 }
end

-- ── Поиск ─────────────────────────────────────────────────────────────────────

function getCatalogSearch(index, query)
    local page = index + 1
    local url = baseUrl .. "/search?keyword=" .. url_encode(query) .. "&page=" .. page
    
    local r = fetchPage(url)
if not r then return { items = {}, hasNext = false } end

    local items = {}
for _, card in ipairs(html_select(r, ".novel-list.chapters .novel-item")) do
        local titleEl = html_select_first(card.html, ".novel-title")
        local linkEl  = html_select_first(card.html, "a")
        local cover   = html_attr(card.html, "img", "src")
        
        if titleEl and linkEl then
            table.insert(items, {
                title = string_clean(titleEl.text),
                url   = absUrl(linkEl.href),
                cover = absUrl(cover)
            })
        end
    end
    return { items = items, hasNext = #items > 0 }
end

-- ── Детали книги ──────────────────────────────────────────────────────────────

function getBookTitle(bookUrl)
    local r = fetchPage(bookUrl)
if not r then return nil end
local el = html_select_first(r, "h1.novel-title")
    return el and string_clean(el.text) or nil
end

function getBookCoverImageUrl(bookUrl)
    local r = fetchPage(bookUrl)
if not r then return nil end
    local cover = html_attr(r.body, "img[src*='server-1']", "src")
    if cover == "" then cover = html_attr(r.body, ".cover img", "src") end
    return cover ~= "" and absUrl(cover) or nil
end

function getBookDescription(bookUrl)
    local r = fetchPage(bookUrl)
if not r then return nil end
    local cleaned = r.body