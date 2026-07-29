import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { scraperFetch, isScraperAvailable } from '@/lib/scraper-client';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';

const BASE = 'https://www.piaotia.com';

export class PiaotiaPlugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'piaotia',
    name: '飘天文学 (Piaotia)',
    baseUrl: BASE + '/',
    language: 'zh',
    version: '1.0.0',
    icon: 'https://raw.githubusercontent.com/Parasgaming122/external-sources/main/icons/piaotia.png',
    hasSearch: true,
    charset: 'GBK',
    description: 'Piaotia literature site with GBK encoding.',
  };

  private absUrl(href: string | undefined | null): string {
    if (!href) return '';
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) return BASE + href;
    return BASE + '/' + href;
  }

  private buildCoverUrl(bookUrl: string): string | undefined {
    const match = bookUrl.match(/\/(\d+)\/(\d+)\.html$/);
    if (!match) return undefined;
    const [, folderId, bookId] = match;
    return `${BASE}/files/article/image/${folderId}/${bookId}/${bookId}s.jpg`;
  }

  private async fetchPage(url: string, retries = 2): Promise<{ html: string; success: boolean }> {
    const useScraper = await isScraperAvailable();
    if (useScraper) {
      for (let i = 0; i < retries; i++) {
        const result = await scraperFetch(url, { timeout: 45, maxRetries: 1 });
        if (result.success && result.html && result.html.length > 500) {
          return { html: result.html, success: true };
        }
        if (i < retries - 1) await new Promise(r => setTimeout(r, 1000));
      }
    }
    const res = await smartFetch(url, { charset: 'GBK' });
    if (res.success && res.body) return { html: res.body, success: true };
    return { html: '', success: false };
  }

  private cleanText(text: string): string {
    return text
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/www\.[^\s]+/g, '')
      .replace(/piaotia\.com[^\s]*/gi, '')
      .replace(/[\n]{3,}/g, '\n\n')
      .trim();
  }

  async getCatalogList(page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const url = `${BASE}/modules/article/index.php?fullflag=1&page=${page}`;
    const { html, success } = await this.fetchPage(url);
    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];

    $("a[href*='/bookinfo/']").each((_, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr('href');
      if (title && href) {
        const fullUrl = this.absUrl(href);
        items.push({
          id: Buffer.from(fullUrl).toString('base64url'),
          title,
          chineseTitle: title,
          url: fullUrl,
          cover: this.buildCoverUrl(fullUrl),
          sourceId: this.info.id,
          sourceName: this.info.name,
        });
      }
    });

    return { items, hasNext: items.length > 0 };
  }

  async getCatalogSearch(query: string, page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const searchUrl = `${BASE}/modules/article/search.php?searchtype=articlename&searchkey=${encodeURIComponent(query)}&Submit=%CB%D1+%CB%F7&page=${page}`;
    const { html, success } = await this.fetchPage(searchUrl);
    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);

    // Handle single-result redirect: check for meta og:url containing /bookinfo/
    const ogUrl = $("meta[property='og:url']").attr('content');
    if (ogUrl && ogUrl.includes('/bookinfo/')) {
      const fullUrl = this.absUrl(ogUrl);
      const title = $('h1, .title').first().text().trim() || 'Unknown';
      return {
        items: [{
          id: Buffer.from(fullUrl).toString('base64url'),
          title,
          chineseTitle: title,
          url: fullUrl,
          cover: this.buildCoverUrl(fullUrl),
          sourceId: this.info.id,
          sourceName: this.info.name,
        }],
        hasNext: false,
      };
    }

    const items: PluginNovelItem[] = [];
    $("a[href*='/bookinfo/']").each((_, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr('href');
      if (title && href) {
        const fullUrl = this.absUrl(href);
        items.push({
          id: Buffer.from(fullUrl).toString('base64url'),
          title,
          chineseTitle: title,
          url: fullUrl,
          cover: this.buildCoverUrl(fullUrl),
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

    const $ = cheerio.load(html);
    const title = $('div#content h1').first().text().trim();
    if (!title) return null;

    const cover = this.buildCoverUrl(bookUrl);
    const summary = $("div[style*='float:left']").first().text().trim();

    // Convert /bookinfo/ URL to /html/ URL for chapter list
    let chapterUrl = bookUrl.replace(/\/bookinfo\//, '/html/');
    const { html: chHtml, success: chSuccess } = await this.fetchPage(chapterUrl);

    const chapters: PluginChapterItem[] = [];
    if (chSuccess) {
      const ch$ = cheerio.load(chHtml);
      ch$('div.centent ul li a, div#content ul li a').each((_, el) => {
        const chTitle = ch$(el).text().trim();
        const chHref = ch$(el).attr('href');
        if (chTitle && chHref) {
          const fullUrl = this.absUrl(chHref);
          chapters.push({
            id: Buffer.from(fullUrl).toString('base64url'),
            title: chTitle,
            url: fullUrl,
          });
        }
      });
    }

    return {
      id: Buffer.from(bookUrl).toString('base64url'),
      title,
      chineseTitle: title,
      url: bookUrl,
      cover,
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

    // Handle GetFont() script replacement
    let processedHtml = html;
    const fontMatch = html.match(/GetFont\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/);
    if (fontMatch) {
      const [, , textHex] = fontMatch;
      try {
        const decoded = Buffer.from(textHex, 'hex').toString('utf8');
        processedHtml = processedHtml.replace(/GetFont\([^)]+\)/g, decoded);
      } catch { /* ignore */ }
    }

    const $ = cheerio.load(processedHtml);
    const title = $('h1, .title').first().text().trim();

    const contentEl = $('div#content, #content, .content').first();
    if (!contentEl.length) {
      return { title, contentHtml: '<p>Chapter text was empty.</p>', rawText: '' };
    }

    contentEl.find('script, ins, style, .ad').remove();

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
