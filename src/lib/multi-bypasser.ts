/**
 * Multi-Bypasser — orchestrates multiple Cloudflare bypass methods
 * ================================================================
 * Tries several bypass strategies in order until one succeeds:
 *
 *   1. smartFetch   — direct fetch with Chrome headers + cookie cache + UA rotation
 *   2. impit        — Rust-based HTTP client that mimics Chrome TLS fingerprints
 *   3. browser      — Playwright headless browser (heaviest, most reliable)
 *   4. scraper      — Python Scrapling subprocess
 *   5. clientProxy  — reserved for future frontend user-assisted scraping
 *
 * Each plugin can declare which methods it prefers via `sourceId` or the
 * bypass-settings module.  The function tries them in sequence with short
 * delays between attempts and tracks per-domain success/failure statistics.
 */

import { smartFetch, BypassResponse } from '@/lib/bypasser';
import { Impit } from 'impit';
import { browserFetch, BrowserFetchResult } from '@/lib/browser-service';
import { scraperFetch, isScraperAvailable } from '@/lib/scraper-client';
import { getPluginBypassMethods } from '@/lib/bypass-settings';
import { BypassMethod } from './plugins/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { BypassMethod, BypassResponse };

export interface MultiBypassOptions {
  /** Ordered list of methods to try (default: per-plugin settings → ['smartFetch', 'impit']) */
  methods?: BypassMethod[];
  /** Extra HTTP headers merged into every request */
  headers?: Record<string, string>;
  /** HTTP method (default: 'GET') */
  method?: string;
  /** Request body (for POST) */
  body?: string | Buffer;
  /** Character set of the target page (default: 'UTF-8'). e.g. 'GBK' */
  charset?: string;
  /** Per-method timeout in ms (default: 15 000) */
  timeout?: number;
  /** Max retries per method (default: 1, i.e. one attempt per method) */
  maxRetries?: number;
  /** Plugin source identifier — used to look up per-plugin method order */
  sourceId?: string;
}

// ---------------------------------------------------------------------------
// Per-method fetch adapters
// ---------------------------------------------------------------------------

// Shared Impit instance (TLS fingerprint pool is reused across requests)
let _impitInstance: Impit | null = null;
function getImpitInstance(): Impit {
  if (!_impitInstance) {
    _impitInstance = new Impit({
      browser: 'chrome',
      timeout: 20_000,
      followRedirects: true,
      headers: {
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
  }
  return _impitInstance;
}

/**
 * impit adapter — uses Rust-based TLS fingerprint impersonation.
 */
async function impitFetch(
  url: string,
  options: MultiBypassOptions,
): Promise<BypassResponse> {
  try {
    const client = getImpitInstance();
    const res = await client.fetch(url, {
      method: (options.method || 'GET') as any,
      headers: options.headers as any,
      timeout: options.timeout || 20_000,
    });

    const status = res.status;
    let body: string;

    if (options.charset && options.charset.toUpperCase().includes('GBK')) {
      // impit returns a Buffer-compatible response for non-UTF-8
      const buf = await res.bytes();
      // iconv-lite decode on server — dynamic import to avoid pulling it at module level
      try {
        const iconv = await import('iconv-lite');
        body = iconv.decode(Buffer.from(buf), 'gbk');
      } catch {
        body = new TextDecoder('utf-8', { fatal: false }).decode(buf);
      }
    } else {
      body = await res.text();
    }

    const success = status >= 200 && status < 400;

    return {
      success,
      status,
      body,
      url: res.url || url,
      tierUsed: 0,
    };
  } catch (e: any) {
    return {
      success: false,
      status: 0,
      body: '',
      url,
      tierUsed: 0,
      error: e?.message || String(e),
    };
  }
}

/**
 * browser (Playwright) adapter.
 */
async function browserMethodFetch(
  url: string,
  _options: MultiBypassOptions,
): Promise<BypassResponse> {
  try {
    const result: BrowserFetchResult = await browserFetch(url, {
      timeout: _options.timeout || 30_000,
    });

    return {
      success: result.success,
      status: result.status,
      body: result.html,
      url: result.finalUrl || url,
      tierUsed: 0,
      error: result.error,
    };
  } catch (e: any) {
    return {
      success: false,
      status: 0,
      body: '',
      url,
      tierUsed: 0,
      error: e?.message || String(e),
    };
  }
}

/**
 * scraper (Python Scrapling subprocess) adapter.
 * Checks availability first; returns an error result if Python worker is
 * unreachable.
 */
async function scraperMethodFetch(
  url: string,
  options: MultiBypassOptions,
): Promise<BypassResponse> {
  try {
    const available = await isScraperAvailable();
    if (!available) {
      return {
        success: false,
        status: 0,
        body: '',
        url,
        tierUsed: 0,
        error: 'Scraper service unavailable',
      };
    }

    const result = await scraperFetch(url, {
      timeout: Math.round((options.timeout || 45_000) / 1000),
      mode: 'scrape',
      maxRetries: 1,
    });

    return {
      success: result.success,
      status: result.status,
      body: result.html,
      url: result.url || url,
      tierUsed: 0,
      error: result.error,
    };
  } catch (e: any) {
    return {
      success: false,
      status: 0,
      body: '',
      url,
      tierUsed: 0,
      error: e?.message || String(e),
    };
  }
}

/**
 * clientProxy — not implemented on the server side.
 * Reserved for future frontend user-assisted scraping.
 */
async function clientProxyFetch(
  url: string,
  _options: MultiBypassOptions,
): Promise<BypassResponse> {
  return {
    success: false,
    status: 0,
    body: '',
    url,
    tierUsed: 0,
    error: 'clientProxy is not implemented server-side (reserved for frontend use)',
  };
}

// ---------------------------------------------------------------------------
// Dispatch table
// ---------------------------------------------------------------------------

type FetchAdapter = (url: string, options: MultiBypassOptions) => Promise<BypassResponse>;

const ADAPTERS: Record<BypassMethod, FetchAdapter> = {
  smartFetch: (url, opts) =>
    smartFetch(url, {
      method: opts.method,
      body: opts.body,
      headers: opts.headers,
      charset: opts.charset,
      maxRetries: opts.maxRetries ?? 1,
      timeout: opts.timeout,
    }),
  impit: impitFetch,
  browser: browserMethodFetch,
  scraper: scraperMethodFetch,
  clientProxy: clientProxyFetch,
};

// ---------------------------------------------------------------------------
// Bypass method statistics
// ---------------------------------------------------------------------------

interface MethodStatEntry {
  method: BypassMethod;
  successCount: number;
  failCount: number;
  /** Timestamp of most recent success (ms since epoch) */
  lastSuccessAt: number;
  /** Timestamp of most recent attempt (ms since epoch) */
  lastAttemptAt: number;
}

/** Per-domain → per-method stats */
const domainStats = new Map<string, Map<BypassMethod, MethodStatEntry>>();

/** Global stats across all domains */
const globalMethodStats = new Map<BypassMethod, MethodStatEntry>();

function getOrCreateDomainEntry(
  domain: string,
  method: BypassMethod,
): MethodStatEntry {
  let domainMap = domainStats.get(domain);
  if (!domainMap) {
    domainMap = new Map();
    domainStats.set(domain, domainMap);
  }

  let entry = domainMap.get(method);
  if (!entry) {
    entry = {
      method,
      successCount: 0,
      failCount: 0,
      lastSuccessAt: 0,
      lastAttemptAt: 0,
    };
    domainMap.set(method, entry);
  }
  return entry;
}

function getOrCreateGlobalEntry(method: BypassMethod): MethodStatEntry {
  let entry = globalMethodStats.get(method);
  if (!entry) {
    entry = {
      method,
      successCount: 0,
      failCount: 0,
      lastSuccessAt: 0,
      lastAttemptAt: 0,
    };
    globalMethodStats.set(method, entry);
  }
  return entry;
}

function recordResult(domain: string, method: BypassMethod, success: boolean): void {
  const now = Date.now();

  // Domain-level
  const domainEntry = getOrCreateDomainEntry(domain, method);
  domainEntry.lastAttemptAt = now;
  if (success) {
    domainEntry.successCount++;
    domainEntry.lastSuccessAt = now;
  } else {
    domainEntry.failCount++;
  }

  // Global-level
  const globalEntry = getOrCreateGlobalEntry(method);
  globalEntry.lastAttemptAt = now;
  if (success) {
    globalEntry.successCount++;
    globalEntry.lastSuccessAt = now;
  } else {
    globalEntry.failCount++;
  }
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/**
 * Fetch a URL trying multiple bypass methods in order until one succeeds.
 *
 * Method order is determined by:
 *   1. `options.methods` if provided
 *   2. Per-plugin defaults from bypass-settings (via `options.sourceId`)
 *   3. Global default: `['smartFetch', 'impit']`
 */
export async function multiBypassFetch(
  url: string,
  options?: MultiBypassOptions,
): Promise<BypassResponse> {
  let domain: string;
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = 'unknown';
  }

  // Determine method order
  let methods: BypassMethod[];
  if (options?.methods && options.methods.length > 0) {
    methods = options.methods;
  } else if (options?.sourceId) {
    methods = getPluginBypassMethods(options.sourceId);
  } else {
    methods = ['smartFetch', 'impit'];
  }

  let lastError: BypassResponse | null = null;

  for (const method of methods) {
    const adapter = ADAPTERS[method];
    if (!adapter) continue;

    try {
      const result = await adapter(url, options || {});

      recordResult(domain, method, result.success);

      if (result.success) {
        return result;
      }

      // Method failed — remember the last error and try next
      lastError = result;

      // Short delay between attempts to avoid hammering the target
      if (methods.indexOf(method) < methods.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (e: any) {
      recordResult(domain, method, false);
      lastError = {
        success: false,
        status: 0,
        body: '',
        url,
        tierUsed: 0,
        error: e?.message || String(e),
      };
    }
  }

  // All methods exhausted
  return (
    lastError ?? {
      success: false,
      status: 0,
      body: '',
      url,
      tierUsed: 0,
      error: 'All bypass methods exhausted',
    }
  );
}

/**
 * Get the bypass method that most recently succeeded for a given domain.
 * Falls back to 'smartFetch' if no success has been recorded.
 */
export function getBestBypassMethod(domain: string): BypassMethod {
  const domainMap = domainStats.get(domain);
  if (!domainMap) return 'smartFetch';

  let bestMethod: BypassMethod = 'smartFetch';
  let bestTime = 0;

  for (const [method, entry] of domainMap) {
    if (entry.lastSuccessAt > bestTime) {
      bestTime = entry.lastSuccessAt;
      bestMethod = method;
    }
  }

  return bestMethod;
}

/**
 * Get statistics for all methods on a specific domain.
 */
export function getDomainBypassStats(domain: string): Record<BypassMethod, MethodStatEntry | null> {
  const domainMap = domainStats.get(domain);
  const result: Record<string, MethodStatEntry | null> = {};

  for (const method of ['smartFetch', 'impit', 'browser', 'scraper', 'clientProxy'] as BypassMethod[]) {
    result[method] = domainMap?.get(method) || null;
  }

  return result as Record<BypassMethod, MethodStatEntry | null>;
}

/**
 * Get global bypass method statistics aggregated across all domains.
 */
export const bypassMethodStats = {
  /** Per-domain stats */
  get domainStats(): ReadonlyMap<string, ReadonlyMap<BypassMethod, MethodStatEntry>> {
    return domainStats;
  },

  /** Global aggregated stats */
  get globalStats(): ReadonlyMap<BypassMethod, MethodStatEntry> {
    return globalMethodStats;
  },

  /** Convenience: summary object for JSON serialisation */
  toJSON(): {
    global: Record<BypassMethod, MethodStatEntry>;
    domains: Record<string, Record<BypassMethod, MethodStatEntry>>;
  } {
    const global: Record<string, MethodStatEntry> = {};
    for (const [k, v] of globalMethodStats) {
      global[k] = { ...v };
    }

    const domains: Record<string, Record<string, MethodStatEntry>> = {};
    for (const [d, dMap] of domainStats) {
      domains[d] = {};
      for (const [m, entry] of dMap) {
        domains[d][m] = { ...entry };
      }
    }

    return { global: global as any, domains };
  },

  /** Reset all stats (useful for tests) */
  reset(): void {
    domainStats.clear();
    globalMethodStats.clear();
  },
};
