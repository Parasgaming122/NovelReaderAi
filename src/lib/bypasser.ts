import iconv from 'iconv-lite';

/**
 * 5-Tier Cloudflare Bypasser Engine (Gen 6 — Streamlined)
 *
 * Tier 1: Direct fetch with Chrome browser emulation
 * Tier 2: Cached session/cookie replay
 * Tier 3: Retry with UA rotation + backoff
 * Tier 4: Failed — return error
 *
 * Key fixes from Gen 5:
 * - Removed manual Accept-Encoding (undici handles it)
 * - Removed compress:false (caused silent decompression failures)
 * - Fixed isChallenge to avoid false positives from CDN URLs
 */

interface SessionCacheEntry {
  cookies: string[];
  expiresAt: number;
}

const sessionCache = new Map<string, SessionCacheEntry>();

// Per-domain rate limiter
const lastRequestTime = new Map<string, number>();
const MIN_DOMAIN_DELAY_MS = 600;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

const SEC_CH_UA = '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"';

function getRandomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function extractDomain(urlStr: string): string {
  try { return new URL(urlStr).hostname; }
  catch { return 'default'; }
}

/**
 * Detect Cloudflare challenge pages.
 * Uses STRICT patterns to avoid false positives from CDN script references.
 */
function isChallenge(body: string, status: number): boolean {
  if (status === 403 || status === 503 || status === 429) return true;
  if (!body || body.length < 200) return false;

  // Strict Cloudflare challenge patterns (NOT just "Cloudflare" in a CDN URL)
  const strictPatterns = [
    '<title>Just a moment...',
    'cf-browser-verification',
    'challenge-platform',
    'challenge-running',
    '_cf_chl',
    'cdn-cgi/challenge',
    'challenges.cloudflare.com',
    'hcaptcha.com',
    'g-recaptcha',
    'turnstile',
  ];

  return strictPatterns.some(p => body.toLowerCase().includes(p.toLowerCase()));
}

export interface BypassRequestOptions {
  method?: string;
  body?: string | Buffer;
  headers?: Record<string, string>;
  charset?: string;
  maxRetries?: number;
  timeout?: number;
}

export function encodeGBKComponent(str: string): string {
  try {
    const buf = iconv.encode(str, 'gbk');
    let result = '';
    for (let i = 0; i < buf.length; i++) {
      result += '%' + buf[i].toString(16).toUpperCase().padStart(2, '0');
    }
    return result;
  } catch {
    return encodeURIComponent(str);
  }
}

export interface BypassResponse {
  success: boolean;
  status: number;
  body: string;
  url: string;
  tierUsed: number;
  cookies?: string[];
  error?: string;
}

export const bypasserStats = {
  totalCalls: 0,
  tier1Count: 0,
  tier2Count: 0,
  tier3Count: 0,
  tier4Count: 0,
};

function enforceRateLimit(domain: string): Promise<void> {
  const lastTime = lastRequestTime.get(domain) || 0;
  const elapsed = Date.now() - lastTime;
  if (elapsed < MIN_DOMAIN_DELAY_MS) {
    return new Promise(r => setTimeout(r, MIN_DOMAIN_DELAY_MS - elapsed));
  }
  lastRequestTime.set(domain, Date.now());
  return Promise.resolve();
}

export async function smartFetch(
  url: string,
  options: BypassRequestOptions = {}
): Promise<BypassResponse> {
  bypasserStats.totalCalls++;
  const domain = extractDomain(url);
  const maxRetries = options.maxRetries ?? 2;
  const timeout = options.timeout ?? 15000;
  const charset = (options.charset || 'UTF-8').toUpperCase();
  const isGBK = charset.includes('GBK') || charset.includes('GB2312');

  await enforceRateLimit(domain);

  const cachedSession = sessionCache.get(domain);
  let cookiesToUse = cachedSession && cachedSession.expiresAt > Date.now() ? cachedSession.cookies : [];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const tier = attempt === 1 && cachedSession ? 2 : attempt === 1 ? 1 : 3;
    const ua = getRandomUA();

    const headers: Record<string, string> = {
      'User-Agent': ua,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'no-cache',
      'sec-ch-ua': SEC_CH_UA,
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      ...options.headers,
    };

    // Don't set Accept-Encoding — let undici handle compression automatically

    if (cookiesToUse.length > 0) {
      headers['Cookie'] = cookiesToUse.join('; ');
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const bodyInit = options.body
        ? typeof options.body === 'string'
          ? options.body
          : new Uint8Array(options.body)
        : undefined;

      const res = await fetch(url, {
        method: options.method || 'GET',
        body: bodyInit,
        headers,
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timer);

      // Extract set-cookie headers
      const resCookies: string[] = [];
      res.headers.forEach((val, key) => {
        if (key.toLowerCase() === 'set-cookie') {
          resCookies.push(val.split(';')[0]);
        }
      });

      if (resCookies.length > 0) {
        cookiesToUse = Array.from(new Set([...cookiesToUse, ...resCookies]));
        sessionCache.set(domain, {
          cookies: cookiesToUse,
          expiresAt: Date.now() + 3600 * 1000,
        });
      }

      // Decode response body
      let body: string;
      if (isGBK) {
        // GBK: need raw bytes → iconv decode
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        body = iconv.decode(buffer, 'gbk');
      } else {
        // UTF-8: let undici auto-decompress and decode
        body = await res.text();
      }

      if (!isChallenge(body, res.status) && res.status >= 200 && res.status < 400) {
        if (tier === 1) bypasserStats.tier1Count++;
        else if (tier === 2) bypasserStats.tier2Count++;
        else if (tier === 3) bypasserStats.tier3Count++;
        return {
          success: true,
          status: res.status,
          body,
          url: res.url,
          tierUsed: tier,
          cookies: cookiesToUse,
        };
      }

      // Blocked — invalidate session cache
      sessionCache.delete(domain);

      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, attempt * 1500));
      }
    } catch (err: any) {
      if (attempt === maxRetries) {
        bypasserStats.tier4Count++;
        return {
          success: false,
          status: 500,
          body: '',
          url,
          tierUsed: 4,
          error: err.message || 'Fetch error',
        };
      }
      await new Promise(r => setTimeout(r, attempt * 1000));
    }
  }

  bypasserStats.tier4Count++;
  return {
    success: false,
    status: 403,
    body: '',
    url,
    tierUsed: 4,
    error: 'Exhausted retries',
  };
}
