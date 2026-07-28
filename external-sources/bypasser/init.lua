--[[
    Bypasser Init - Entry Point
    ===========================
    This file provides the main interface for sources to use the bypasser.
    
    USAGE in source files:
        local bp = require("bypasser")
        local html = bp.fetch("https://example.com")
]]

-- Load configuration
local config = require("bypasser.config")
local core = require("bypasser.core")
local helpers = require("bypasser.helpers")

-- ============================================
-- PUBLIC API
-- ============================================

local M = {}

-- Copy core functions
M.fetch = core.fetch
M.smartFetch = core.smartFetch
M.fetchViaTrawl = core.fetchViaTrawl
M.hybridFetch = core.hybridFetch
M.fetchChapter = core.fetchChapter
M.search = core.search
M.getStatus = core.getStatus
M.clearCookies = core.clearCookies
M.resetRateLimit = core.resetRateLimit

-- Copy helper functions
M.trim = helpers.trim
M.cleanChapterText = helpers.cleanChapterText
M.stripHtml = helpers.stripHtml
M.decodeHtmlEntities = helpers.decodeHtmlEntities
M.absoluteUrl = helpers.absoluteUrl
M.getDomain = helpers.getDomain
M.getPath = helpers.getPath
M.addQueryParam = helpers.addQueryParam
M.selectFirst = helpers.selectFirst
M.selectAll = helpers.selectAll
M.getText = helpers.getText
M.getAttr = helpers.getAttr
M.extractChapterContent = helpers.extractChapterContent
M.parseChapterList = helpers.parseChapterList
M.urlEncode = helpers.urlEncode
M.buildSearchUrl = helpers.buildSearchUrl

-- ============================================
-- LEGACY COMPATIBILITY (for old source format)
-- ============================================

-- Check if bypass is available (for conditional logic)
function M.isAvailable()
    return true  -- Standalone mode always available
end

-- Legacy get() function (returns {success, body} table)
function M.get(url, options)
    local html = M.smartFetch(url, options)
    if html and html ~= "" then
        return { success = true, body = html }
    end
    return { success = false, body = "" }
end

-- Legacy post() function
function M.post(url, data, options)
    local result = M.search(url, data, options)
    if result and result ~= "" then
        return { success = true, body = result }
    end
    return { success = false, body = "" }
end

-- ============================================
-- INFO
-- ============================================

M.version = "1.0.0"
M.mode = config.mode
M.description = "Standalone Cloudflare Bypasser for NovelDokusha"

return M
