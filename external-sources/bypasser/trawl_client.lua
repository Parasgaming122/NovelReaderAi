-- ══════════════════════════════════════════════════════════════
--  TRAWL Client Module
--  Handles communication with TRAWL server for Cloudflare bypass
-- ══════════════════════════════════════════════════════════════

local config = require("bypasser.config")

local M = {}

-- ── Internal State ───────────────────────────────────────────

local _cache = {}
local _stats = {
    total_requests = 0,
    trawl_requests = 0,
    direct_requests = 0,
    cache_hits = 0,
    errors = 0,
}

-- ── Utility Functions ─────────────────────────────────────────

local function log(msg, level)
    if not config.debug and (level ~= "ERROR") then return end
    
    local prefix = "[BYPASSER]"
    if level == "ERROR" then
        prefix = "[BYPASSER][ERROR]"
    elseif level == "DEBUG" then
        prefix = "[BYPASSER][DEBUG]"
    end
    
    print(prefix .. " " .. msg)
end

local function isDomainProtected(url)
    -- If no protected domains list, bypass all
    if not config.protected_domains or #config.protected_domains == 0 then
        return true
    end
    
    -- Extract domain from URL
    local domain = string.match(url, "://([^/]+)")
    if domain then
        -- Remove port if present
        domain = string.match(domain, "^([^:]+)") or domain
        -- Remove www. prefix for comparison
        domain = string.gsub(domain, "^www%.", "")
        
        -- Check against protected domains
        for _, protected in ipairs(config.protected_domains) do
            local p = string.gsub(protected, "^www%.", "")
            if domain == p or string.endswith(domain, "." .. p) then
                return true
            end
        end
    end
    
    return false
end

local function getCacheKey(url, method)
    return method .. ":" .. url
end

local function getCachedResponse(key)
    if not config.local_cache_enabled then return nil end
    
    local cached = _cache[key]
    if cached then
        local now = os.time()
        if (now - cached.timestamp) < config.local_cache_ttl then
            _stats.cache_hits = _stats.cache_hits + 1
            log("Cache hit for: " .. string.sub(url, 1, 50), "DEBUG")
            return cached.response
        else
            -- Expired, remove
            _cache[key] = nil
        end
    end
    return nil
end

local function setCachedResponse(key, response)
    if not config.local_cache_enabled then return end
    
    -- Limit cache size
    local count = 0
    for _ in pairs(_cache) do count = count + 1 end
    if count >= config.max_cache_entries then
        -- Remove oldest entry (simple approach)
        local oldest_key, oldest_time = nil, math.huge
        for k, v in pairs(_cache) do
            if v.timestamp < oldest_time then
                oldest_time = v.timestamp
                oldest_key = k
            end
        end
        if oldest_key then _cache[oldest_key] = nil end
    end
    
    _cache[key] = {
        response = response,
        timestamp = os.time()
    }
end

-- ── JSON Helpers (minimal implementation) ─────────────────────

-- Note: NovelDokusha may have JSON support. If not, we use simple string manipulation.
local function jsonEncode(obj)
    -- Simple JSON encoder for basic tables
    if type(obj) == "nil" then return "null" end
    if type(obj) == "string" then return '"' .. obj:gsub('"', '\\"') .. '"' end
    if type(obj) == "number" then return tostring(obj) end
    if type(obj) == "boolean" then return obj and "true" or "false" end
    if type(obj) == "table" then
        -- Check if array (sequential keys)
        local is_array = true
        local max_idx = 0
        for k, _ in pairs(obj) do
            if type(k) ~= "number" or k < 1 or k > max_idx + 1 then
                is_array = false
                break
            end
            max_idx = k
        end
        
        if is_array and max_idx > 0 then
            local parts = {}
            for i = 1, max_idx do
                parts[i] = jsonEncode(obj[i])
            end
            return "[" .. table.concat(parts, ",") .. "]"
        else
            local parts = {}
            for k, v in pairs(obj) do
                parts[#parts+1] = jsonEncode(k) .. ":" .. jsonEncode(v)
            end
            return "{" .. table.concat(parts, ",") .. "}"
        end
    end
    return "null"
end

-- Note: Full JSON decode would be complex. We'll extract what we need with patterns.
local function extractField(json, field)
    -- Extract a string field value from JSON
    local pattern = '"' .. field .. '"%s*:%s*"([^"]*)"'
    return string.match(json, pattern)
end

local function extractNestedField(json, field)
    -- Try to extract solution.response which contains HTML
    -- Handle escaped content
    local pattern = '"' .. field .. '"%s*:%s*"(.-)"'
    local match = string.match(json, pattern)
    if match then
        -- Unescape common escape sequences
        match = match:gsub("\\n", "\n")
        match = match:gsub("\\r", "\r")
        match = match:gsub("\\t", "\t")
        match = match:gsub('\\"', '"')
        match = match:gsub("\\/", "/")
        return match
    end
    return nil
end

local function checkTrawlStatus(status_json)
    -- Check if TRAWL response indicates success
    local status = extractField(status_json, "status")
    return status == "ok"
end

-- ── Core TRAWL Communication ─────────────────────────────────

function M.isAvailable()
    if not config.trawl_url then return false end
    
    -- Quick health check
    local health_url = config.trawl_url .. "/health"
    local ok, err = pcall(function()
        local r = http_get(health_url)
        return r.success
    end)
    
    if not ok then
        log("TRAWL health check failed: " .. tostring(err), "DEBUG")
        return false
    end
    
    return true
end

function M.requestViaTrawl(url, method, body, headers)
    if not config.trawl_url then
        return nil, "TRAWL URL not configured"
    end
    
    _stats.trawl_requests = _stats.trawl_requests + 1
    
    local api_url = config.trawl_url .. "/" .. config.api_endpoint
    
    -- Build FlareSolverr-compatible request
    local cmd = "request.get"
    if method and method:upper() == "POST" then
        cmd = "request.post"
    end
    
    local request_body = {
        cmd = cmd,
        url = url,
        maxTimeout = config.timeout,
    }
    
    if body then request_body.postData = body end
    if headers then request_body.headers = headers end
    
    local json_body = jsonEncode(request_body)
    log("Sending to TRAWL: " .. string.sub(url, 1, 60) .. "...", "DEBUG")
    
    local retry_count = 0
    local last_error = nil
    
    while retry_count <= config.retry_count do
        if retry_count > 0 then
            log("Retry " .. retry_count .. " for: " .. string.sub(url, 1, 40), "DEBUG")
            -- Wait before retry
            -- Note: Lua doesn't have built-in sleep, skip in this context
        end
        
        local success, result = pcall(function()
            local r = http_post(api_url, json_body, config.trawl_headers)
            
            if not r.success then
                return nil, "TRAWL HTTP error: " .. tostring(r.status)
            end
            
            -- Parse TRAWL response
            local status = extractField(r.body, "status")
            
            if status == "ok" then
                -- Success! Extract the response data
                local html = extractNestedField(r.body, "response")
                local solution_status = extractField(r.body, "solution.status")
                
                if config.log_trawl_metadata then
                    local start_time = extractField(r.body, "startTimestamp")
                    local end_time = extractField(r.body, "endTimestamp")
                    log("TRAWL success - status: " .. tostring(solution_status), "DEBUG")
                end
                
                return {
                    success = true,
                    body = html or "",
                    status = tonumber(solution_status) or 200,
                    cookies = {},  -- Would need more complex parsing
                    from_trawl = true,
                }, nil
            else
                local message = extractField(r.body, "message") or "Unknown TRAWL error"
                return nil, "TRAWL error: " .. message
            end
        end)
        
        if success then
            return result
        else
            last_error = result
            retry_count = retry_count + 1
        end
    end
    
    _stats.errors = _stats.errors + 1
    return nil, last_error or "TRAWL request failed after retries"
end

-- ── Public API (Drop-in replacements for http_get/http_post) ──

function M.get(url, headers)
    _stats.total_requests = _stats.total_requests + 1
    
    if config.log_all_requests then
        log("GET: " .. url)
    end
    
    -- Check cache first
    local cache_key = getCacheKey(url, "GET")
    local cached = getCachedResponse(cache_key)
    if cached then return cached end
    
    -- Determine if we should use TRAWL
    local use_trawl = isDomainProtected(url) and M.isAvailable()
    
    if use_trawl then
        local response, err = M.requestViaTrawl(url, "GET", nil, headers)
        
        if response then
            setCachedResponse(cache_key, response)
            return response
        end
        
        log("TRAWL failed, falling back: " .. tostring(err), "ERROR")
        
        if not config.fallback_on_error then
            return { success = false, body = "", status = 500 }
        end
    end
    
    -- Direct HTTP fallback
    _stats.direct_requests = _stats.direct_requests + 1
    
    local success, result = pcall(function()
        if headers then
            return http_get(url, headers)
        else
            return http_get(url)
        end
    end)
    
    if success and result then
        setCachedResponse(cache_key, result)
        return result
    end
    
    _stats.errors = _stats.errors + 1
    return { success = false, body = "", status = 500 }
end

function M.post(url, body, headers)
    _stats.total_requests = _stats.total_requests + 1
    
    if config.log_all_requests then
        log("POST: " .. url)
    end
    
    -- POST requests typically not cached, but could add if needed
    local use_trawl = isDomainProtected(url) and M.isAvailable()
    
    if use_trawl then
        local response, err = M.requestViaTrawl(url, "POST", body, headers)
        
        if response then
            return response
        end
        
        log("TRAWL POST failed, falling back: " .. tostring(err), "ERROR")
        
        if not config.fallback_on_error then
            return { success = false, body = "", status = 500 }
        end
    end
    
    -- Direct HTTP fallback
    _stats.direct_requests = _stats.direct_requests + 1
    
    local success, result = pcall(function()
        if headers then
            return http_post(url, body, headers)
        else
            return http_post(url, body)
        end
    end)
    
    if success and result then
        return result
    end
    
    _stats.errors = _stats.errors + 1
    return { success = false, body = "", status = 500 }
end

-- ── Statistics & Utilities ────────────────────────────────────

function M.getStats()
    return {
        total_requests = _stats.total_requests,
        trawl_requests = _stats.trawl_requests,
        direct_requests = _stats.direct_requests,
        cache_hits = _stats.cache_hits,
        errors = _stats.errors,
        trawl_available = M.isAvailable(),
        cache_size = (function() 
            local c = 0 
            for _ in pairs(_cache) do c = c + 1 end 
            return c 
        end)(),
    }
end

function M.clearCache()
    _cache = {}
    log("Cache cleared")
end

function M.printStats()
    local s = M.getStats()
    print("=== Bypasser Statistics ===")
    print("Total Requests: " .. s.total_requests)
    print("via TRAWL:       " .. s.trawl_requests)
    print("Direct HTTP:     " .. s.direct_requests)
    print("Cache Hits:      " .. s.cache_hits)
    print("Errors:          " .. s.errors)
    print("TRAWL Available: " .. tostring(s.trawl_available))
    print("Cache Size:      " .. s.cache_size .. " entries")
    print("==========================")
end

return M
