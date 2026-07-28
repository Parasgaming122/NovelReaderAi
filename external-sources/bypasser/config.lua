--[[
    Bypasser Configuration
    ======================
    Edit these settings to customize Cloudflare bypass behavior.
    
    MODES:
    - "standalone"     : Works without any external service (default)
    - "trawl"          : Requires hosted Trawl instance (set TRAWL_URL)
    - "hybrid"         : Try standalone first, fallback to Trawl
]]

local config = {}

-- ============================================
-- CORE SETTINGS
-- ============================================

config.mode = "standalone"  -- "standalone" | "trawl" | "hybrid"

-- Trawl instance URL (only needed if mode is "trawl" or "hybrid")
config.trawl_url = "http://localhost:8191"
config.trawl_timeout = 30000  -- ms

-- ============================================
-- BROWSER EMULATION
-- ============================================

-- Rotate between different User-Agents to appear as real browsers
config.user_agents = {
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
}

-- Accept languages to rotate
config.accept_languages = {
    "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
    "zh-CN,zh;q=0.9,en;q=0.8",
    "en-GB,en;q=0.9",
}

-- ============================================
-- REQUEST BEHAVIOR
-- ============================================

-- Delay between requests to same domain (ms) - avoids rate limiting
config.request_delay = { min = 500, max = 2000 }

-- Maximum retries for failed requests
config.max_retries = 3

-- Retry delay multiplier (each retry waits longer)
config.retry_backoff = 1.5

-- Request timeout in milliseconds
config.request_timeout = 15000

-- ============================================
-- COOKIE / SESSION MANAGEMENT
-- ============================================

-- Enable cookie persistence (remembers CF clearances)
config.cookie_persistence = true

-- How long cookies are valid (seconds)
config.cookie_ttl = 3600  -- 1 hour

-- ============================================
-- CLOUDFLARE DETECTION
-- ============================================

-- Strings that indicate Cloudflare challenge page
config.cf_indicators = {
    "cloudflare",
    "cf-browser-verification",
    "challenge-platform",
    "managed_challenge",
    "__cf_bm",
    "cf_clearance",
    "Just a moment...",
    "Checking your browser",
    "Attention Required",
    "403 Forbidden",
    "Access Denied",
}

-- ============================================
-- DOMAIN-SPECIFIC OVERRIDES
-- ============================================

-- Custom settings per domain
config.domain_overrides = {
    ["timotxt.com"] = {
        request_delay = { min = 1000, max = 3000 },
        max_retries = 5,
        use_stealth = true,
    },
    ["69shuba.com"] = {
        request_delay = { min = 800, max = 2500 },
    },
    ["69shuba.cx"] = {
        request_delay = { min = 800, max = 2500 },
    },
    ["69xinzhi.net"] = {
        request_delay = { min = 800, max = 2500 },
    },
}

-- ============================================
-- DEBUG LOGGING
-- ============================================

-- Enable debug logging (shows in NovelDokusha logs)
config.debug = false

-- Log all requests/responses
config.verbose_logging = false

return config
