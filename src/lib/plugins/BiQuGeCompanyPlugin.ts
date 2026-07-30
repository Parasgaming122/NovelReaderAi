import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { scraperFetch, isScraperAvailable } from '@/lib/scraper-client';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';

/**
 * Domain fallback list for BiQuGe — primary domain may get ISP-hijacked
 * (国家反诈中心 anti-fraud interception). Try each in order until one works.
 */
const DOMAIN_FALLBACKS = [
  'https://www.biquge.company',
  'https://www.biquge9.com',
  'https://www.biquge.tv',
  'https://www.biquge.co',
];

let _activeBase: string | null = null;

async function getActiveBase(): Promise<string> {
  if (_activeBase) return _activeBase;
  for (const domain of DOMAIN_FALLBACKS) {
    try {
      const probe = await smartFetch(domain + '/', { timeout: 8000 });
      // Reject ISP hijack pages (anti-fraud interception)
      if (probe.success && probe.body && !probe.body.includes('反诈') && !probe.body.includes('national anti-fraud') && probe.body.length > 500) {
        _activeBase = domain;
        console.log(`[BiQuGeCompany] Active domain: ${domain}`);
        return domain;
      }
    } catch { continue; }
  }
  // All probes failed — use primary and let individual requests handle errors
  _activeBase = DOMAIN_FALLBACKS[0];
  return _activeBase;
}

export class BiQuGeCompanyPlugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'biqugecompany',
    name: '笔趣阁.company',
    baseUrl: 'https://www.biquge.company/',
    language: 'zh',
    version: '2.0.0',
    icon: 'https://raw.githubusercontent.com/Parasgaming122/external-sources/main/icons/biqugecompany.png',
    hasSearch: true,
    charset: 'UTF-8',
    description: 'Chinese web novel source with domain fallback. POST search and catalog. Detects ISP anti-fraud hijack.',
    blocked: false,
    blockedReason: '',
    cfBlockLevel: 'none',
    cfStatus: 'Accessible — no Cloudflare protection detected',
    recommendedBypassMethods: ['smartFetch'],
    availableBypassMethods: ['smartFetch', 'impit', 'browser', 'scraper', 'clientProxy'],
  };

  /** Build absolute URL using the currently active base domain */
  private resolveUrl(href: string | undefined | null, base: string): string {
    if (!href) return '';
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) return base + href;
    return base + '/' + href;
  }

  /** Remap any biquge.company URL to the active base domain */
  private async remapUrl(url: string): Promise<string> {
    const base = await getActiveBase();
    return url.replace(/https?:\/\/[^\/]+/, base);
  }

  private async fetchPage(url: string, retries = 2): Promise<{ html: string; success: boolean }> {
    const fetchUrl = await this.remapUrl(url);

    const useScraper = await isScraperAvailable();
    if (useScraper) {
      for (let i = 0; i < retries; i++) {
        const result = await scraperFetch(fetchUrl, { timeout: 45, maxRetries: 1 });
        if (result.success && result.html && result.html.length > 500
            && !result.html.includes('反诈') && !result.html.includes('national anti-fraud')) {
          return { html: result.html, success: true };
        }
        if (i < retries - 1) await new Promise(r => setTimeout(r, 1000));
      }
    }
    const res = await smartFetch(fetchUrl);
    if (res.success && res.body
        && !res.body.includes('反诈') && !res.body.includes('national anti-fraud')) {
      return { html: res.body, success: true };
    }
    return { html: '', success: false };
  }

  private cleanText(text: string): string {
    return text
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/www\.[^\s]+/g, '')
      .replace(/biquge\.(company|9\.com|tv|co)[^\s]*/gi, '')
      .replace(/[\n]{3,}/g, '\n\n')
      .trim();
  }

  async getCatalogList(page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const base = await getActiveBase();
    const url = `${base}/sort/0/${page}.html`;
    const { html, success } = await this.fetchPage(url);
    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];
    const seen = new Set<string>();

    $('a[href*="/book/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href || seen.has(href)) return;
      seen.add(href);

      const title = $(el).text().trim();
      const cover = $(el).find('img').attr('src') || $(el).closest('li, div').find('img').attr('src');

      if (title && href) {
        items.push({
          id: Buffer.from(this.resolveUrl(href, base)).toString('base64url'),
          title,
          chineseTitle: title,
          url: this.resolveUrl(href, base),
          cover: cover ? this.resolveUrl(cover, base) : undefined,
          sourceId: this.info.id,
          sourceName: this.info.name,
        });
      }
    });

    return { items, hasNext: items.length > 0 };
  }

  async getCatalogSearch(query: string, page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const base = await getActiveBase();
    const searchUrl = `${base}/modules/article/search.php`;
    let html = '';
    let success = false;

    try {
      // POST search — use smartFetch directly (scraperFetch doesn't support POST)
      const res = await smartFetch(searchUrl, {
        method: 'POST',
        body: new URLSearchParams({ searchkey: query, searchtype: 'all' }).toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      if (res.success && res.body) {
        html = res.body;
        success = true;
      }
    } catch {
      return { items: [], hasNext: false };
    }

    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];
    const seen = new Set<string>();

    $('a[href*="/book/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href || seen.has(href)) return;
      seen.add(href);

      const title = $(el).text().trim();
      const cover = $(el).find('img').attr('src') || $(el).closest('li, div').find('img').attr('src');

      if (title && href) {
        items.push({
          id: Buffer.from(this.resolveUrl(href, base)).toString('base64url'),
          title,
          chineseTitle: title,
          url: this.resolveUrl(href, base),
          cover: cover ? this.resolveUrl(cover, base) : undefined,
          sourceId: this.info.id,
          sourceName: this.info.name,
        });
      }
    });

    return { items, hasNext: false };
  }

  async getBookDetails(bookUrl: string): Promise<PluginNovelDetail | null> {
    const { html, success } = await this.fetchPage(bookUrl);
    if (!success) return null;

    const base = await getActiveBase();
    const $ = cheerio.load(html);
    const title = $('h1').first().text().trim();
    if (!title) return null;

    const cover = $('#fmimg img, .book-info img, .cover img').first().attr('src');
    const summary = $('#intro, .intro, .desc, .book-intro').first().text().trim();

    const chapters: PluginChapterItem[] = [];
    const seen = new Set<string>();

    // Extract all chapter links from <dl><dd> structure
    // Chapters are listed newest-first, so we reverse them
    $("dl dd a[href*='/read/'], dl dd a[href*='read/']").each((_, el) => {
      const chTitle = $(el).text().trim();
      const chHref = $(el).attr('href');
      if (!chTitle || !chHref || chTitle.length < 2 || chTitle.length > 100) return;
      // Skip non-chapter links (开始阅读, ads, external)
      if (/^开始阅读$|\.com|\.net|\.xyz|pozhai|lashuwu|seyazho|35ren/i.test(chTitle)) return;
      if (seen.has(chHref)) return;
      seen.add(chHref);
      chapters.push({
        id: Buffer.from(this.resolveUrl(chHref, base)).toString('base64url'),
        title: chTitle,
        url: this.resolveUrl(chHref, base),
      });
    });
    // Reverse to get ascending order (chapter 1 → latest)
    chapters.reverse();

    // Fallback: if no chapters found, try broader selectors
    if (chapters.length === 0) {
      $('#list a, dl dd a, .chapter-list a').each((_, el) => {
        const chTitle = $(el).text().trim();
        const chHref = $(el).attr('href');
        if (chTitle && chHref && !/^开始阅读$/.test(chTitle) && !seen.has(chHref)) {
          seen.add(chHref);
          chapters.push({
            id: Buffer.from(this.resolveUrl(chHref, base)).toString('base64url'),
            title: chTitle,
            url: this.resolveUrl(chHref, base),
          });
        }
      });
      chapters.reverse();
    }

    return {
      id: Buffer.from(bookUrl).toString('base64url'),
      title,
      chineseTitle: title,
      url: bookUrl,
      cover: cover ? this.resolveUrl(cover, base) : undefined,
      summary: this.cleanText(summary),
      sourceId: this.info.id,
      sourceName: this.info.name,
      chapters,
    };
  }

  async getChapterText(chapterUrl: string): Promise<{ title?: string; contentHtml: string; rawText: string }> {
    const { html, success } = await this.fetchPage(chapterUrl);
    if (!success) {
      return { contentHtml: '<p>Failed to retrieve chapter content.</p>', rawText: '' };
    }

    const $ = cheerio.load(html);
    const title = $('h1, .bookname h1').first().text().trim();

    // Use specific selectors first — .content is too broad (includes nav), .readcontent is the actual chapter text
    const contentEl = $('#htmlContent, .readcontent, #content, #TextContent, .content').first();
    if (!contentEl.length) {
      return { title, contentHtml: '<p>Chapter text was empty.</p>', rawText: '' };
    }

    contentEl.find('script, ins, style, .ad, div[style*="display:none"]').remove();

    const paragraphs: string[] = [];
    contentEl.find('p').each((_, el) => {
      const t = $(el).text().trim();
      if (t) paragraphs.push(this.cleanText(t));
    });

    if (paragraphs.length === 0) {
      const text = contentEl.text().trim();
      text.split(/\n+/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed) paragraphs.push(this.cleanText(trimmed));
      });
    }

    const contentHtml = paragraphs.map(p => `<p>${p}</p>`).join('\n');
    const rawText = paragraphs.join('\n\n');

    return { title, contentHtml, rawText };
  }
}
