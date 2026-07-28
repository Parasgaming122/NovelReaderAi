-- ══════════════════════════════════════════════════════════════
--  Basic Bypass Usage Example
--  Shows how to use the bypasser module in a simple script
-- ══════════════════════════════════════════════════════════════

-- Load bypasser (adjust path as needed)
local bypasser = require("bypasser")

print("=" .. string.rep("=", 50))
print("  NovelDokusha Bypass Module - Usage Example")
print("=" .. string.rep("=", 50))

-- Check if TRAWL is available
print("\n1. Checking TRAWL availability...")
local available = bypasser.isAvailable()
print("   TRAWL Available: " .. tostring(available))

if available then
    print("\n2. Testing bypass on Cloudflare-protected site...")
    local r = bypasser.get("https://www.timotxt.com/")
    
    if r.success then
        print("   ✓ Request successful!")
        print("   Response length: " .. #r.body .. " bytes")
        print("   Status code: " .. tostring(r.status))
        
        -- Try to extract title from HTML
        local title = r.body:match("<title>(.-)</title>")
        if title then
            print("   Page title: " .. title)
        end
    else
        print("   ✗ Request failed")
    end
    
    print("\n3. Testing search endpoint (usually blocked by CF)...")
    local search_r = bypasser.get("https://www.timotxt.com/search/%E9%87%8D%E7%94%9F")
    
    if search_r.success then
        print("   ✓ Search request successful! (CF Turnstile bypassed)")
        print("   Response length: " .. #search_r.body .. " bytes")
    else
        print("   ✗ Search request failed")
    end
else
    print("\n⚠ TRAWL not available - requests will use direct HTTP")
    print("  To enable bypass:")
    print("  1. Deploy TRAWL: docker compose up -d (in trawl/ directory)")
    print("  2. Configure URL in bypasser/config.lua")
end

-- Show statistics
print("\n4. Bypass Statistics:")
bypasser.printStats()

-- Test isProtected function
print("\n5. Domain Protection Check:")
local test_urls = {
    "https://www.timotxt.com/",
    "https://www.novel543.com/",
    "https://example.com/",
}
for _, url in ipairs(test_urls) do
    local protected = bypasser.isProtected(url)
    print("   " .. url .. ": " .. tostring(protected))
end

print("\n" .. string.rep("=", 51))
print("  Example complete!")
print(string.rep("=", 51))
