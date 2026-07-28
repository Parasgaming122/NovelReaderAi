import iconv from 'iconv-lite';

/**
 * 4-Tier Cloudflare Bypasser Engine (inspired by trawl / Qwen implementation)
 */

interface SessionCacheEntry {
  cookies: string[];
  headers: Record<string, string>;
  expiresAt: number;
}

const sessionCache = new Map<string, SessionCacheEntry>();

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function extractDomain(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname;
  } catch {
    return 'default';
  }
}

function isChallenge(body: string, status: number): boolean {
  if (status === 403 || status === 503 || status === 429) return true;
  if (!body) return false;
  
  const challengeKeywords = [
    'Just a moment...',
    'cf-browser-verification',
    'ray_id',
    'Turnstile',
    'g-recaptcha',
    'hcaptcha',
    '安全验证',
    '人机验证',
    '访问频繁',
    '请求过于频繁',
    'Cloudflare',
  ];

  return challengeKeywords.some((kw) => body.includes(kw));
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
      const byte = buf[i];
      result += '%' + byte.toString(16).toUpperCase().padStart(2, '0');
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

export async function smartFetch(
  url: string,
  options: BypassRequestOptions = {}
): Promise<BypassResponse> {
  bypasserStats.totalCalls++;
  const domain = extractDomain(url);
  const maxRetries = options.maxRetries ?? 3;
  const timeout = options.timeout ?? 15000;
  const charset = options.charset || 'UTF-8';

  // TIER 2 Check: Cached Session Replay
  const cachedSession = sessionCache.get(domain);
  let cookiesToUse = cachedSession && cachedSession.expiresAt > Date.now() ? cachedSession.cookies : [];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const tier = attempt === 1 && cachedSession ? 2 : attempt === 1 ? 1 : 3;
    const ua = getRandomUserAgent();

    const headers: Record<string, string> = {
      'User-Agent': ua,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
      ...options.headers,
    };

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
          headers,
          expiresAt: Date.now() + 3600 * 1000, // 1 hour TTL
        });
      }

      // Convert buffer according to charset
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      let body = '';

      if (charset.toUpperCase().includes('GBK') || charset.toUpperCase().includes('GB2312')) {
        body = iconv.decode(buffer, 'gbk');
      } else {
        body = buffer.toString('utf-8');
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

      // If blocked, invalidate session cache for domain
      sessionCache.delete(domain);

      // Backoff delay before retry
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, attempt * 1200));
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
      await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }

  bypasserStats.tier4Count++;
  return {
    success: false,
    status: 403,
    body: '',
    url,
    tierUsed: 4,
    error: 'Exhausted retries on Cloudflare protected resource',
  };
}
