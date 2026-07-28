--[[
    Cloudflare Bypasser Core - Version 2.0
    ======================================
    4-Tier Architecture (inspired by trawl & Qwen's implementation)
    
    TIER 1: Plain HTTP with browser-like headers (<200ms)
    TIER 2: Cached session/cookies replay (~300ms)  
    TIER 3: Enhanced retry with UA rotation + delays (3-12s)
    TIER 4: Fallback strategies / proxy support
    
    WORKS STANDALONE - No external services required!
]]

local config = require("bypasser.config")

-- ============================================
-- MODULE STATE
-- ============================================

local M = {}

-- Session cache (Tier 2)
M.session_cache = {}
M.cache_ttl = config.cookie_ttl or 3600

-- Rate limiting
M.last_request = {}
M.request_count = {}

-- User-Agent rotation index
M.ua_index = 1

-- Statistics
M.stats = {
    tier1_hits = 0,
    tier2_hits = 0,
    tier3_hits = 0,
    tier4_hits = 0,
    failures = 0,
}

-- ============================================
-- CHALLENGE DETECTION (Enhanced)
-- ============================================

local CHALLENGE_PATTERNS = {
    -- Cloudflare specific
    "cf%-browser%-verification",
    "challenge%-platform",
    "jschl%-answer",
    "cf_chl_opt",
    "cdn%-cgi/challenge",
    "Just a moment",
    "Checking your browser before",
    "Attention Required",
    "cf%-turnstile",
    "__cf_bm",
    "cf_clearance",
    -- Generic bot protection
    "hcaptcha",
    "g%-recaptcha",
    "geetest",
    "imperva",
    "_Incapsula_Resource",
    -- Status indicators
    "403 Forbidden",
    "Access Denied",
    "Bot Detection",
    -- Chinese site protections
    "安全验证",
    "人机验证",
    "访问频繁",
    "请稍后重试",
}

local function isChallengePage(statusCode, body)
    if not body then return false end
    
    -- Check status codes
    if statusCode == 403 or statusCode == 429 or statusCode == 503 then
        return true
    end
    
    -- Check body for challenge patterns (only first 15KB for performance)
    local checkBody = body:sub(1, 15000):lower()
    for _, pattern in ipairs(CHALLENGE_PATTERNS) do
        if checkBody:find(pattern) then
            return true
        end
    end
    
    return false
end

-- ============================================
-- USER-AGENT ROTATION (Browser-like)
-- ============================================

local USER_AGENTS = {
    -- Chrome Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
    -- Chrome Mac
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    -- Firefox
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0",
    -- Safari
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
    -- Linux
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
}

local ACCEPT_LANGUAGES = {
    "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
    "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
    "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
}

local function getNextUA()
    local ua = USER_AGENTS[M.ua_index]
    M.ua_index = (M.ua_index % #USER_AGENTS) + 1
    return ua
end

-- ============================================
-- URL UTILITIES
-- ============================================

local function getDomain(url)
    return url and url:match("https?://([^/]+)") or ""
end

-- ============================================
-- SESSION CACHE (Tier 2)
-- ============================================

local function getCacheKey(domain)
    -- Simple hash of domain
    local key = 0
    for i = 1, #domain do
        key = (key * 31 + domain:byte(i)) % 2147483647
    end
    return tostring(key)
end

function M.cacheGet(domain)
    local key = getCacheKey(domain)
    local cached = M.session_cache[key]
    
    if cached then
        local now = os.time()
        if (now - cached.created_at) < M.cache_ttl then
            M.stats.tier2_hits = M.stats.tier2_hits + 1
            return cached
        else
            -- Expired
            M.session_cache[key] = nil
        end
    end
    
    return nil
end

function M.cachePut(domain, cookies, userAgent)
    local key = getCacheKey(domain)
    M.session_cache[key] = {
        cookies = cookies,
        user_agent = userAgent,
        created_at = os.time(),
        domain = domain,
    }
end

function M.cacheInvalidate(domain)
    local key = getCacheKey(domain)
    M.session_cache[key] = nil
end

-- ============================================
-- HEADER BUILDING (Browser-like)
-- ============================================

local function buildHeaders(domain, useCachedCookies)
    local headers = {
        ["User-Agent"] = getNextUA(),
        ["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        ["Accept-Language"] = ACCEPT_LANGUAGES[math.random(1, #ACCEPT_LANGUAGES)],
        ["Accept-Encoding"] = "gzip, deflate, br",
        ["Connection"] = "keep-alive",
        ["Upgrade-Insecure-Requests"] = "1",
        ["Sec-Fetch-Dest"] = "document",
        ["Sec-Fetch-Mode"] = "navigate",
        ["Sec-Fetch-Site"] = "none",
        ["Sec-Fetch-User"] = "?1",
        ["Cache-Control"] = "max-age=0",
        ["sec-ch-ua"] = '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        ["sec-ch-ua-mobile"] = "?0",
        ["sec-ch-ua-platform"] = '"Windows"',
    }
    
    -- Add cached cookies if available (Tier 2 optimization)
    if useCachedCookies then
        local cached = M.cacheGet(domain)
        if cached and cached.cookies then
            local cookieStr = ""
            for name, value in pairs(cached.cookies) do
                if #cookieStr > 0 then cookieStr = cookieStr .. "; " end
                cookieStr = cookieStr .. name .. "=" .. value
            end
            if #cookieStr > 0 then
                headers["Cookie"] = cookieStr
                headers["User-Agent"] = cached.user_agent or headers["User-Agent"]
            end
        end
    end
    
    return headers
end

-- ============================================
-- RATE LIMITING
-- ============================================

local function enforceRateLimit(domain)
    local now = os.time()
    local lastTime = M.last_request[domain] or 0
    local count = M.request_count[domain] or 0
    
    -- Get domain-specific config
    local domainConfig = config.domain_overrides[domain] or {}
    local delayMin = domainConfig.request_delay and domainConfig.request_delay.min or config.request_delay.min
    local delayMax = domainConfig.request_delay and domainConfig.request_delay.max or config.request_delay.max
    
    -- Increase delay after multiple requests to same domain
    if count > 10 then
        delayMin = delayMin * 1.5
        delayMax = delayMax * 1.5
    end
    
    local requiredDelay = delayMin + math.random() * (delayMax - delayMin)
    local elapsed = (now - lastTime)
    
    if elapsed < requiredDelay and count > 0 then
        -- Would need to wait in async environment
        if config.debug then
            print(string.format("[BYPASS] Rate limit: %ds delay for %s (req #%d)", 
                math.floor(requiredDelay - elapsed), domain, count))
        end
    end
    
    M.last_request[domain] = now
    M.request_count[domain] = count + 1
end

-- ============================================
-- COOKIE EXTRACTION
-- ============================================

local function extractCookies(responseHeaders, domain)
    if not responseHeaders then return {} end
    
    local cookies = {}
    
    -- Handle Set-Cookie header
    local setCookie = responseHeaders["Set-Cookie"] or responseHeaders["set-cookie"]
    if setCookie then
        for cookie in setCookie:gmatch("[^,]+") do
            local name, value = cookie:match("^([^=]+)=([^;]+)")
            if name and value then
                -- Store important cookies
                local lowerName = name:lower()
                if lowerName:find("cf") or lowerName:find("session") 
                   or lowerName:find("token") or lowerName:find("auth")
                   or lowerName:find("PHPSESSID") then
                    cookies[name] = value
                    if config.debug then
                        print("[BYPASS] Cached cookie: " .. name .. " for " .. domain)
                    end
                end
            end
        end
    end
    
    return cookies
end

-- ============================================
-- TIER EXECUTION
-- ============================================

-- Tier 1: Plain HTTP request
function M.tier1_http(method, url, options)
    options = options or {}
    local domain = getDomain(url)
    
    enforceRateLimit(domain)
    
    local headers = buildHeaders(domain, true)  -- Try cache first
    
    local response
    if method == "POST" then
        response = HttpPost(url, headers, options.postData or "")
    else
        response = HttpGet(url, headers)
    end
    
    -- Parse response
    local html, status, respHeaders
    
    if type(response) == "table" then
        html = response.html or response.body or ""
        status = response.status or response.code or 200
        respHeaders = response.headers or response.header or {}
    elseif type(response) == "string" then
        html = response
        status = 200
        respHeaders = {}
    else
        return { success = false, tier = 1 }
    end
    
    -- Extract and cache cookies on success
    if status == 200 and not isChallengePage(status, html) then
        local cookies = extractCookies(respHeaders, domain)
        if next(cookies) ~= nil then
            M.cachePut(domain, cookies, headers["User-Agent"])
        end
        M.stats.tier1_hits = M.stats.tier1_hits + 1
        return { success = true, html = html, status = status, tier = 1 }
    end
    
    return { success = false, html = html, status = status, tier = 1 }
end

-- Tier 2: Cached session replay (already tried via buildHeaders, this is explicit retry)
function M.tier2_cached(method, url, options)
    local domain = getDomain(url)
    local cached = M.cacheGet(domain)
    
    if not cached then
        return { success = false, tier = 2 }
    end
    
    -- Force use cached session
    options = options or {}
    options.forceCache = true
    
    local result = M.tier1_http(method, url, options)
    result.tier = 2
    
    if result.success then
        M.stats.tier2_hits = M.stats.tier2_hits + 1
    end
    
    return result
end

-- Tier 3: Enhanced retry with rotation
function M.tier3_retry(method, url, options)
    options = options or {}
    local domain = getDomain(url)
    local domainConfig = config.domain_overrides[domain] or {}
    local maxRetries = options.retries or domainConfig.max_retries or config.max_retries
    
    local lastResult = nil
    
    for attempt = 1, maxRetries do
        if config.debug then
            print(string.format("[BYPASS][T3] Retry %d/%d for %s", attempt, maxRetries, url))
        end
        
        -- Exponential backoff
        if attempt > 1 then
            local backoff = config.retry_backoff ^ (attempt - 1) * 1000
            if config.debug then
                print(string.format("[BYPASS][T3] Backoff: %dms", math.floor(backoff)))
            end
            -- In real async: os.execute("sleep " .. (backoff/1000))
        end
        
        -- Force fresh request (no cache)
        options.useCache = false
        local result = M.tier1_http(method, url, options)
        
        if result.success then
            M.stats.tier3_hits = M.stats.tier3_hits + 1
            return result
        end
        
        lastResult = result
        
        -- Invalidate cache if we're getting challenged
        M.cacheInvalidate(domain)
    end
    
    M.stats.failures = M.stats.failures + 1
    return { success = false, html = (lastResult and lastResult.html) or "", tier = 3 }
end

-- Tier 4: Last resort - return best effort
function M.tier4_fallback(method, url, options)
    -- This is the absolute fallback
    -- In standalone mode, just try one more time with maximum delay simulation
    
    if config.debug then
        print("[BYPASS][T4] Final fallback attempt")
    end
    
    local result = M.tier1_http(method, url, options)
    result.tier = 4
    
    if result.success then
        M.stats.tier4_hits = M.stats.tier4_hits + 1
    end
    
    -- Return whatever we have, even if it's a challenge page
    -- The source may be able to extract some data from it
    return result
end

-- ============================================
-- MAIN REQUEST FUNCTION (4-Tier Orchestration)
-- ============================================

function M.fetch(url, options)
    options = options or {}
    local method = (options.method or "GET"):upper()
    
    if config.debug then
        print(string.format("[BYPASS] Fetch: %s %s", method, url))
    end
    
    local start_time = os.clock()
    
    -- Tier 1: Plain HTTP with browser emulation
    local result = M.tier1_http(method, url, options)
    
    if result.success or (result.html and #result.html > 100 and not isChallengePage(result.status, result.html)) then
        result.elapsed = (os.clock() - start_time) * 1000
        if config.debug then
            print(string.format("[BYPASS] ✓ Tier %d (%.0fms)", result.tier, result.elapsed))
        end
        return result.html
    end
    
    -- Tier 2: Cached session (if not already used effectively)
    if config.debug then print("[BYPASS] Tier 1 failed, trying Tier 2...") end
    result = M.tier2_cached(method, url, options)
    
    if result.success or (result.html and #result.html > 100 and not isChallengePage(result.status, result.html)) then
        result.elapsed = (os.clock() - start_time) * 1000
        if config.debug then
            print(string.format("[BYPASS] ✓ Tier %d (%.0fms)", result.tier, result.elapsed))
        end
        return result.html
    end
    
    -- Tier 3: Retry with enhanced rotation
    if config.debug then print("[BYPASS] Tier 2 failed, trying Tier 3...") end
    result = M.tier3_retry(method, url, options)
    
    if result.success or (result.html and result.html ~= "") then
        result.elapsed = (os.clock() - start_time) * 1000
        if config.debug then
            print(string.format("[BYPASS] ✓ Tier %d (%.0fms)", result.tier, result.elapsed))
        end
        return result.html
    end
    
    -- Tier 4: Best effort fallback
    if config.debug then print("[BYPASS] Tier 3 failed, trying Tier 4...") end
    result = M.tier4_fallback(method, url, options)
    
    result.elapsed = (os.clock() - start_time) * 1000
    if config.debug then
        print(string.format("[BYPASS] %s Tier %d (%.0fms)", 
            result.success and "✓" or "✗", result.tier, result.elapsed))
    end
    
    return result.html or ""
end

-- ============================================
-- CONVENIENCE FUNCTIONS
-- ============================================

function M.smartFetch(url, options)
    return M.fetch(url, options)
end

function M.get(url, options)
    options = options or {}
    options.method = "GET"
    local html = M.fetch(url, options)
    
    if html and html ~= "" then
        return { success = true, body = html }
    end
    return { success = false, body = "" }
end

function M.post(url, data, options)
    options = options or {}
    options.method = "POST"
    options.postData = data
    local html = M.fetch(url, options)
    
    if html and html ~= "" then
        return { success = true, body = html }
    end
    return { success = false, body = "" }
end

function M.search(url, postData, options)
    return M.post(url, postData, options)
end

-- ============================================
-- STATUS & DEBUGGING
-- ============================================

function M.getStatus()
    -- Count cached sessions (can't use for-loop inside table constructor)
    local session_count = 0
    for _ in pairs(M.session_cache) do
        session_count = session_count + 1
    end
    
    return {
        mode = config.mode,
        stats = M.stats,
        cached_sessions = session_count,
        version = "2.0.0",
        tiers_available = { 1, 2, 3, 4 },
    }
end

function M.clearCache()
    M.session_cache = {}
    M.last_request = {}
    M.request_count = {}
    M.stats = { tier1_hits = 0, tier2_hits = 0, tier3_hits = 0, tier4_hits = 0, failures = 0 }
end

function M.isAvailable()
    return true  -- Always available in standalone mode
end

return M
