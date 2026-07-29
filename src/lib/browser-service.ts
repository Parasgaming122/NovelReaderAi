/**
 * Playwright Browser Service
 * 
 * Manages a pool of browser instances for fetching content from Cloudflare-protected sites.
 * Inspired by Novela's hidden WebView approach — uses a real browser to solve CF challenges,
 * then reuses the authenticated session for subsequent requests.
 * 
 * Key insight from testing:
 * - Novel543 homepage & catalog work fine with Playwright + stealth
 * - Novel543 /search/ has an interactive Turnstile that never auto-solves
 * - Solution: Use Playwright for catalog/details/chapters, mark search as unavailable
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';

interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  createdAt: number;
  lastUsed: number;
  domain: string;
}

const SESSION_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_SESSIONS = 3;

const sessions: Map<string, BrowserSession> = new Map();
let launchCount = 0;

async function getOrCreateSession(domain: string): Promise<BrowserSession> {
  // Reuse existing session if valid
  const existing = sessions.get(domain);
  if (existing && Date.now() - existing.lastUsed < SESSION_TTL) {
    existing.lastUsed = Date.now();
    return existing;
  }
  
  // Clean up expired sessions
  for (const [key, session] of sessions) {
    if (Date.now() - session.lastUsed > SESSION_TTL) {
      try { await session.browser.close(); } catch {}
      sessions.delete(key);
    }
  }
  
  // Create new session
  if (sessions.size >= MAX_SESSIONS) {
    // Evict oldest
    let oldest = '';
    let oldestTime = Infinity;
    for (const [key, session] of sessions) {
      if (session.lastUsed < oldestTime) {
        oldestTime = session.lastUsed;
        oldest = key;
      }
    }
    if (oldest) {
      const s = sessions.get(oldest)!;
      try { await s.browser.close(); } catch {}
      sessions.delete(oldest);
    }
  }
  
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
    ],
  });
  
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  });
  
  // Anti-detection
  await context.addInitScript(`
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
    window.chrome = { runtime: {} };
  `);
  
  const session: BrowserSession = {
    browser,
    context,
    createdAt: Date.now(),
    lastUsed: Date.now(),
    domain,
  };
  
  sessions.set(domain, session);
  launchCount++;
  console.log(`[BrowserService] Created new session for ${domain} (total launches: ${launchCount})`);
  
  return session;
}

export interface BrowserFetchResult {
  success: boolean;
  html: string;
  title: string;
  finalUrl: string;
  status: number;
  error?: string;
}

/**
 * Fetch a URL using Playwright browser.
 * Handles Cloudflare challenges automatically.
 */
export async function browserFetch(url: string, options?: {
  waitFor?: string;
  timeout?: number;
  domain?: string;
}): Promise<BrowserFetchResult> {
  const { waitFor = 'domcontentloaded', timeout = 30000 } = options || {};
  
  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname;
  
  try {
    const session = await getOrCreateSession(domain);
    session.lastUsed = Date.now();
    
    const page = await session.context.newPage();
    
    try {
      const response = await page.goto(url, {
        waitUntil: waitFor as 'commit' | 'domcontentloaded' | 'load' | 'networkidle',
        timeout,
      });
      
      const status = response?.status() || 0;
      
      // If we got a Cloudflare challenge, wait for it to solve
      if (status === 403 || status === 503) {
        const solved = await waitForChallengeSolve(page, 20000);
        if (!solved) {
          await page.close();
          return {
            success: false,
            html: '',
            title: '',
            finalUrl: url,
            status,
            error: 'Cloudflare challenge not solved',
          };
        }
      }
      
      // Wait for dynamic content to load
      await page.waitForTimeout(2000);
      
      const html = await page.content();
      const title = await page.title();
      const finalUrl = page.url();
      
      await page.close();
      
      return {
        success: status >= 200 && status < 400,
        html,
        title: title || '',
        finalUrl,
        status: response?.status() || 0,
      };
    } catch (err: any) {
      await page.close().catch(() => {});
      return {
        success: false,
        html: '',
        title: '',
        finalUrl: url,
        status: 0,
        error: err.message,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      html: '',
      title: '',
      finalUrl: url,
      status: 0,
      error: err.message,
    };
  }
}

async function waitForChallengeSolve(page: Page, maxWait: number): Promise<boolean> {
  const start = Date.now();
  
  while (Date.now() - start < maxWait) {
    await page.waitForTimeout(2000);
    
    const title = await page.title().catch(() => '');
    const isChallenge = title.includes('稍候') || title.toLowerCase().includes('moment');
    
    if (!isChallenge && title && title.length > 3) {
      return true;
    }
  }
  
  return false;
}

/**
 * Clean up all browser sessions.
 */
export async function cleanupSessions(): Promise<void> {
  for (const [key, session] of sessions) {
    try { await session.browser.close(); } catch {}
    sessions.delete(key);
  }
}

/**
 * Get stats about browser sessions.
 */
export function getBrowserServiceStats() {
  return {
    activeSessions: sessions.size,
    domains: Array.from(sessions.keys()),
    totalLaunches: launchCount,
  };
}
