import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { scraperFetch, isScraperAvailable } from '@/lib/scraper-client';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';

const BASE = 'https://www.novel543.com';

export class Novel543Plugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'novel543',
    name: 'Novel543 (稷下書院)',
    baseUrl: BASE + '/',
    language: 'zh',
    version: '7.0.0',
    icon: 'https://www.novel543.com/favicon.ico',
    hasSearch: false,
    charset: 'UTF-8',
    description: 'Chinese novel collection. Search blocked by Cloudflare Turnstile. Use catalog browse or search via other sources.',
    blocked: true,
    blockedReason: '403 Forbidden — site blocks server-side requests',
    cfBlockLevel: 'full',
    cfStatus: 'Site returns 403 Forbidden for all server-side requests.',
    recommendedBypassMethods: ['browser', 'scraper'],
    availableBypassMethods: ['smartFetch', 'impit', 'browser', 'scraper', 'clientProxy'],
  };

  private absUrl(href: string | undefined | null): string {
    if (!href) return '';
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) return BASE + href;
    return BASE + '/' + href;
  }

  /**
   * Fetch a page using Scrapling service (preferred) or fallback to smartFetch.
   * Scrapling handles Cloudflare challenges automatically.
   */
  private async fetchPage(url: string, retries = 2): Promise<{ html: string; success: boolean }> {
    // Try Scrapling service first (much better at CF bypass)
    const useScraper = await isScraperAvailable();
    if (useScraper) {
      for (let i = 0; i < retries; i++) {
        const result = await scraperFetch(url, { timeout: 45, maxRetries: 1 });
        if (result.success && result.html && result.html.length > 500) {
          return { html: result.html, success: true };
        }
        if (i < retries - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }

    // Fallback to smartFetch
    const res = await smartFetch(url);
    if (res.success && res.body) {
      return { html: res.body, success: true };
    }

    return { html: '', success: false };
  }

  private parseMediaItems(html: string): PluginNovelItem[] {
    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];

    // Lua reference: ul.list li.media
    $('ul.list li.media').each((_, el) => {
      const $el = $(el);
      const titleEl = $el.find('div.media-content h3 a').first();
      const title = titleEl.text().trim();
      const bookUrl = this.absUrl($el.find('div.media-left a').attr('href'));
      const cover = this.absUrl($el.find('div.media-left img').attr('src'));

      if (title && bookUrl) {
        items.push({
          id: Buffer.from(bookUrl).toString('base64url'),
          title,
          chineseTitle: title,
          url: bookUrl,
          cover: cover || undefined,
          sourceId: this.info.id,
          sourceName: this.info.name,
        });
      }
    });

    return items;
  }

  async getCatalogList(page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const url = `${BASE}/bookstack/?page=${page}`;
    const { html, success } = await this.fetchPage(url);

    if (!success) return { items: [], hasNext: false };

    const items = this.parseMediaItems(html);
    return { items, hasNext: items.length > 0 };
  }

  async getCatalogSearch(query: string, page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    // Novel543 /search/ has aggressive Cloudflare Turnstile that blocks
    // both HTTP fetches and headless browsers. Even Scrapling's StealthyFetcher
    // cannot consistently bypass it.
    // Users should search via other sources (Shuba69, XBiquge, etc.)
    console.log(`[Novel543] Search blocked by Cloudflare for: ${query}`);
    return { items: [], hasNext: false };
  }

  async getBookDetails(bookUrl: string): Promise<PluginNovelDetail | null> {
    const { html, success } = await this.fetchPage(bookUrl);
    if (!success) return null;

    return this.parseBookDetails(html, bookUrl);
  }

  private parseBookDetails(html: string, bookUrl: string): PluginNovelDetail | null {
    const $ = cheerio.load(html);

    const title = $('h1.title').first().text().trim() || $('meta[property="og:title"]').attr('content') || '';
    const cover = $('.cover img').first().attr('src') || $('meta[property="og:image"]').attr('content');
    const summary = $('div.intro').first().text().trim();

    if (!title) return null;

    return {
      id: Buffer.from(bookUrl).toString('base64url'),
      title,
      chineseTitle: title,
      url: bookUrl,
      cover: this.absUrl(cover),
      summary,
      sourceId: this.info.id,
      sourceName: this.info.name,
      chapters: [],
    };
  }

  async getChapterList(bookUrl: string): Promise<PluginChapterItem[]> {
    const dirUrl = bookUrl.replace(/\/$/, '') + '/dir';
    const { html, success } = await this.fetchPage(dirUrl);
    if (!success) return [];

    return this.parseChapterList(html);
  }

  private parseChapterList(html: string): PluginChapterItem[] {
    const $ = cheerio.load(html);
    const chapters: PluginChapterItem[] = [];

    $('ul.all li a').each((_, el) => {
      const $el = $(el);
      const chTitle = $el.text().trim();
      const chHref = $el.attr('href');
      if (chTitle && chHref) {
        chapters.push({
          id: Buffer.from(this.absUrl(chHref)).toString('base64url'),
          title: chTitle,
          url: this.absUrl(chHref),
        });
      }
    });

    return chapters;
  }

  async getChapterText(chapterUrl: string): Promise<{ title?: string; contentHtml: string; rawText: string }> {
    const { html, success } = await this.fetchPage(chapterUrl);
    if (!success) {
      return { contentHtml: '<p>Failed to load chapter content.</p>', rawText: '' };
    }

    return this.parseChapterText(html, chapterUrl);
  }

  private async parseChapterText(html: string, chapterUrl: string): Promise<{ title?: string; contentHtml: string; rawText: string }> {
    const $ = cheerio.load(html);
    const title = $('h1.chapter-title, h1.title, h1').first().text().trim();

    const contentEl = $('div.content').first();
    if (!contentEl.length) {
      return { title, contentHtml: '<p>Chapter content was empty.</p>', rawText: '' };
    }

    contentEl.find('div.gadBlock, div.adBlock, script, ins, style, .ad').remove();

    const paragraphs: string[] = [];
    contentEl.find('p').each((_, el) => {
      const t = $(el).text().trim();
      if (t) paragraphs.push(t);
    });

    if (paragraphs.length === 0) {
      const text = contentEl.text().trim();
      text.split(/\n+/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed) paragraphs.push(trimmed);
      });
    }

    // Multi-page chapter support (Lua reference)
    const chapterFile = chapterUrl.match(/\/([^/]+)\.html$/)?.[1] || '';
    if (chapterFile) {
      const escaped = chapterFile.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const subPattern = new RegExp(`^${escaped}_\\d+\\.html$`);

      const subUrls: string[] = [];
      contentEl.find('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const fname = href.match(/\/([^/]+)$/)?.[1] || '';
        if (subPattern.test(fname)) {
          subUrls.push(this.absUrl(href));
        }
      });

      for (let i = 0; i < Math.min(subUrls.length, 20); i++) {
        const subResult = await this.fetchPage(subUrls[i]);
        if (subResult.success && subResult.html) {
          const sub$ = cheerio.load(subResult.html);
          const subContent = sub$('div.content').first();
          subContent.find('div.gadBlock, div.adBlock, script, ins, style, .ad').remove();
          subContent.find('p').each((_, el) => {
            const t = sub$(el).text().trim();
            if (t) paragraphs.push(t);
          });
        }
      }
    }

    const contentHtml = paragraphs.map((p) => `<p>${p}</p>`).join('\n');
    const rawText = paragraphs.join('\n\n');

    return { title, contentHtml, rawText };
  }
}
