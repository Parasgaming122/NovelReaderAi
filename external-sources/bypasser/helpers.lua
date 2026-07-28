--[[
    Bypasser Helpers
    ================
    Utility functions for NovelDokusha sources using the bypasser.
    
    These functions provide common patterns used across sources:
    - HTML parsing helpers
    - Text cleaning utilities
    - URL manipulation
    - Chapter content extraction
]]

local M = {}

-- ============================================
-- TEXT CLEANING
-- ============================================

-- Trim whitespace from both ends
function M.trim(text)
    if not text or type(text) ~= "string" then return "" end
    return text:match("^%s*(.-)%s*$") or ""
end

-- Clean chapter text (remove junk)
function M.cleanChapterText(text, sitePatterns)
    if not text or text == "" then return "" end
    
    text = M.trim(text)
    
    -- Common junk patterns to remove
    local defaultJunk = {
        -- Chinese novel site junk
        "溫馨提示",
        "手機小站閱讀網",
        "請記住本站域名",
        "手機用戶請瀏覽",
        "本站域名",
        "小說...*更新最快",
        "--%>%>",  -- HTML comment artifacts
        "<!%-%-.*%-%->",
        -- Ad/notice patterns
        "廣告",
        "推薦",
        "收藏本站",
        "加入書簽",
        "本章完",
        "未完待續",
        "百度搜索",
        "谷歌搜索",
    }
    
    local patterns = sitePatterns or defaultJunk
    
    for _, pattern in ipairs(patterns) do
        text = text:gsub(pattern, "")
    end
    
    -- Clean up multiple blank lines
    text = text:gsub("\n%s*\n%s*\n", "\n\n")
    
    return M.trim(text)
end

-- Remove HTML tags (simple version)
function M.stripHtml(html)
    if not html or html == "" then return "" end
    return html:gsub("<[^>]+>", ""):gsub("&nbsp;", " "):gsub("&amp;", "&"):gsub("&lt;", "<"):gsub("&gt;", ">"):gsub("&quot;", '"')
end

-- Decode HTML entities
function M.decodeHtmlEntities(text)
    if not text then return "" end
    local entities = {
        ["&nbsp;"] = " ",
        ["&amp;"] = "&",
        ["&lt;"] = "<",
        ["&gt;"] = ">",
        ["&quot;"] = '"',
        ["&#39;"] = "'",
        ["&apos;"] = "'",
    }
    for entity, char in pairs(entities) do
        text = text:gsub(entity, char)
    end
    return text
end

-- ============================================
-- URL UTILITIES
-- ============================================

-- Build absolute URL from relative
function M.absoluteUrl(base, relative)
    if not relative or relative == "" then return base end
    if relative:find("https?://") then return relative end
    
    local baseDomain = base:match("^(https?://[^/]+)")
    if not baseDomain then return base end
    
    if relative:find("^/") then
        return baseDomain .. relative
    else
        local basePath = base:match("^(.*/)[^/]*$") or baseDomain .. "/"
        return basePath .. relative
    end
end

-- Extract domain from URL
function M.getDomain(url)
    return url and url:match("https?://([^/]+)") or ""
end

-- Extract path from URL
function M.getPath(url)
    return url and url:match("https?://[^/]+(/.*)$") or "/"
end

-- Add query parameter to URL
function M.addQueryParam(url, key, value)
    local sep = url:find("%?") and "&" or "?"
    return url .. sep .. key .. "=" .. (value or "")
end

-- ============================================
-- HTML PARSING HELPERS
-- ============================================

-- Safe select first element
function M.selectFirst(html, selector)
    local ok, el = pcall(html_select_first, html, selector)
    if ok and el then return el end
    return nil
end

-- Safe select all elements
function M.selectAll(html, selector)
    local ok, els = pcall(html_select_all, html, selector)
    if ok and els then return els end
    return {}
end

-- Get text content safely
function M.getText(element)
    if not element then return "" end
    local ok, text = pcall(html_text, element.html or element)
    if ok and text then return text end
    return ""
end

-- Get attribute safely
function M.getAttr(element, attr)
    if not element or not attr then return "" end
    local ok, value = pcall(html_attr, element.html or element, attr)
    if ok and value then return value end
    return ""
end

-- Extract chapter content with common selectors
function M.extractChapterContent(html, selectors)
    if type(selectors) == "string" then
        selectors = { selectors }
    end
    
    for _, selector in ipairs(selectors) do
        local el = M.selectFirst(html, selector)
        if el then
            local text = M.getText(el)
            if text and #text > 100 then  -- Reasonable minimum length
                return text
            end
        end
    end
    
    return nil
end

-- ============================================
-- CHAPTER LIST HELPERS
-- ============================================

-- Parse chapter list from common patterns
function M.parseChapterList(html, itemSelector, linkSelector, titleSelector)
    local items = M.selectAll(html, itemSelector)
    local chapters = {}
    
    for _, item in ipairs(items) do
        local linkEl = M.selectFirst(item.html or "", linkSelector or "a")
        local titleEl = titleSelector and M.selectFirst(item.html or "", titleSelector)
        
        if linkEl then
            local url = M.getAttr(linkEl, "href")
            local title = titleEl and M.getText(titleEl) or M.getText(linkEl)
            
            if url and url ~= "" then
                table.insert(chapters, {
                    url = url,
                    title = M.trim(title),
                })
            end
        end
    end
    
    return chapters
end

-- ============================================
-- SEARCH HELPERS
-- ============================================

-- Encode URL parameters
function M.urlEncode(str)
    if not str then return "" end
    str = tostring(str)
    str = str:gsub("\n", "\r\n")
    str = str:gsub("([^%w %-%_%.%~])", function(c)
        return string.format("%%%02X", string.byte(c))
    end)
    str = str:gsub(" ", "+")
    return str
end

-- Build search URL
function M.buildSearchUrl(baseUrl, queryParam, searchTerm)
    return baseUrl .. "?" .. queryParam .. "=" .. M.urlEncode(searchTerm)
end

-- ============================================
-- DEBUG / LOGGING
-- ============================================

-- Conditional debug print
function M.debug(message, ...)
    -- Can be toggled via config
    local bypasserConfig = require("bypasser.config")
    if bypasserConfig.debug then
        print(string.format("[BYPER-HELPER] " .. message, ...))
    end
end

return M
