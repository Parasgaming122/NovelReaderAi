id       = "truthnovel"
name     = "Truth Novel"
version  = "1.1.0"

-- ── Bypass Module (Auto-loaded) ────────────────────────────────
local bp = nil
local bp_ok = pcall(function() bp = require("bypasser") end)
if bp_ok and bp then
    print("[truthnovel] ✓ Bypass loaded")
else
    print("[truthnovel] ⚠ Direct HTTP mode")
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

baseUrl  = "https://truthnovel.top"
language = "ar"
icon     = "https://raw.githubusercontent.com/HnDK0/external-sources/main/icons/truthnovel.png"

local _cover = baseUrl .. "/wp-content/uploads/2024/12/نسخة-الفصل-الف-الصغيرة-للموقع-العربي.jpg"
local _pageCache = {}
local function fetchPage(url)
    if _pageCache[url] then return _pageCache[url] end
    local r = fetchPage(url)
    if r.success then _pageCache[url] = r.body end
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
    text = string.gsub(text, "(?i)\\A[\\s\\p{Z}\\uFEFF]*((Chapter\\s+\\d+)[^\\n\\r]*[\\n\\r\\s]*)+", "")
    text = string.gsub(text, "(?im)^\\s*(Translator|Editor|Proofreader|Read\\s+(at|on|latest))[:\\s][^\\n\\r]{0,70}(\\r?\\n|$)", "")
    text = string.gsub(text, "(?m)^\\s*اذكر الله\\s*/+\\s*\\n?", "")
    text = string.gsub(text, "(?s)\\n={3,}.*", "")
    text = string_trim(text)
    return text
end

function getCatalogList(index)
    if index > 0 then
        return { items = {}, hasNext = false }
    end
    return {
        items = {
            {
                title = "Lord of Truth",
                url   = baseUrl .. "/list/257/",
                cover = _cover
            }
        },
        hasNext = false
    }
end

function getCatalogSearch(index, query)
    return getCatalogList(index)
end

function getBookTitle(bookUrl)
    return "Lord of Truth"
end

function getBookCoverImageUrl(bookUrl)
    return _cover
end

function getBookDescription(bookUrl)
    return "Lord of Truth / Master of Truth"
end

function getBookGenres(bookUrl)
    return { "Fantasy" }
end

function getChapterList(bookUrl)
    bookUrl = bookUrl:gsub("/?$", "/")
    local r = fetchPage(bookUrl)
if not r then
        log_error("truthnovel: getChapterList failed for " .. bookUrl)
        return {}
    end
    
    local chapters = {}
for _, a in ipairs(html_select(r, "a.w4pl_post_title")) do
        local title = string_clean(a.text)
        local url = absUrl(a.href)
        if title ~= "" and url ~= "" then
            table.insert(chapters, { title = title, url = url })
        end
    end
    
    if #chapters == 0 then
for _, a in ipairs(html_select(r, "a.post_title")) do
            local title = string_clean(a.text)
            local url = absUrl(a.href)
            if title ~= "" and url ~= "" then
                table.insert(chapters, { title = title, url = url })
            end
        end
    end
    
    table.sort(chapters, function(a, b)
        local na = tonumber((a.title or ""):match("^(%d+)")) or 0
        local nb = tonumber((b.title or ""):match("^(%d+)")) or 0
        return na < nb
    end)
    
    return chapters
end

function getChapterListHash(bookUrl)
    bookUrl = bookUrl:gsub("/?$", "/")
    local r = fetchPage(bookUrl)
if not r then return nil end
local links = html_select(r, "a.w4pl_post_title")
    if #links == 0 then
    links = html_select(r, "a.post_title")
    end
    return #links > 0 and links[1].href or nil
end

function getChapterText(html, url)
    if not html or html == "" then return "" end
    
    local cleaned = html