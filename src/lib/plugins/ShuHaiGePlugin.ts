import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { scraperFetch, isScraperAvailable } from '@/lib/scraper-client';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';

const BASE = 'https://m.shuhaige.net';

export class ShuHaiGePlugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'shuhaige',
    name: '书海阁 (ShuHaiGe)',
    baseUrl: BASE + '/',
    language: 'zh',
    version: '1.0.0',
    icon: 'https://raw.githubusercontent.com/Parasgaming122/external-sources/main/icons/shuhaige.png',
    hasSearch: true,
    charset: 'UTF-8',
    description: 'ShuHaiGe mobile novel site with catalog and search.',
  };

  private absUrl(href: string | undefined | null): string {
    if (!href) return '';
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) return BASE + href;
    return BASE + '/' + href;
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
    const res = await smartFetch(url);
    if (res.success && res.body) return { html: res.body, success: true };
    return { html: '', success: false };
  }

  private cleanText(text: string): string {
    return text
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/www\.[^\s]+/g, '')
      .replace(/shuhaige\.net[^\s]*/gi, '')
      .replace(/[\n]{3,}/g, '\n\n')
      .trim();
  }

  async getCatalogList(page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const url = `${BASE}/shuku/`;
    const { html, success } = await this.fetchPage(url);
    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];

    $('ul.vlist li, ul.cover li').each((_, el) => {
      const linkEl = $(el).find('a').first();
      const title = linkEl.text().trim();
      const href = linkEl.attr('href');
      const cover = $(el).find('img').attr('src');

      if (title && href) {
        const fullUrl = this.absUrl(href);
        items.push({
          id: Buffer.from(fullUrl).toString('base64url'),
          title,
          chineseTitle: title,
          url: fullUrl,
          cover: cover ? this.absUrl(cover) : undefined,
          sourceId: this.info.id,
          sourceName: this.info.name,
        });
      }
    });

    // Fallback: a[href*="shu_"]
    if (items.length === 0) {
      $("a[href*='shu_']").each((_, el) => {
        const title = $(el).text().trim();
        const href = $(el).attr('href');
        if (title && href && title.length > 2) {
          const fullUrl = this.absUrl(href);
          items.push({
            id: Buffer.from(fullUrl).toString('base64url'),
            title,
            chineseTitle: title,
            url: fullUrl,
            sourceId: this.info.id,
            sourceName: this.info.name,
          });
        }
      });
    }

    return { items, hasNext: false };
  }

  async getCatalogSearch(query: string, _page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const searchUrl = `${BASE}/search.html`;
    let html = '';
    let success = false;

    try {
      // POST search — use smartFetch directly (scraperFetch doesn't support POST)
      const res = await smartFetch(searchUrl, {
        method: 'POST',
        body: new URLSearchParams({ searchkey: query }).toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      if (res.success && res.body) {
        html = res.body;
        success = true;
      }
    } catch { return { items: [], hasNext: false }; }

    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];

    $('ul.vlist li, ul.cover li').each((_, el) => {
      const linkEl = $(el).find('a').first();
      const title = linkEl.text().trim();
      const href = linkEl.attr('href');
      const cover = $(el).find('img').attr('src');

      if (title && href) {
        const fullUrl = this.absUrl(href);
        items.push({
          id: Buffer.from(fullUrl).toString('base64url'),
          title,
          chineseTitle: title,
          url: fullUrl,
          cover: cover ? this.absUrl(cover) : undefined,
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
    const title = $('h1, .detail h2, .book-title, .name strong').first().text().trim();
    if (!title) return null;

    const cover = $('.cover img, .detail img').first().attr('src');
    const summary = $('.intro, .desc p, .description, .detail_info p').first().text().trim();

    const chapters: PluginChapterItem[] = [];
    $('.chapter-list a, .chapter a, #chapterlist a').each((_, el) => {
      const chTitle = $(el).text().trim();
      const chHref = $(el).attr('href');
      if (chTitle && chHref) {
        const fullUrl = this.absUrl(chHref);
        chapters.push({
          id: Buffer.from(fullUrl).toString('base64url'),
          title: chTitle,
          url: fullUrl,
        });
      }
    });

    return {
      id: Buffer.from(bookUrl).toString('base64url'),
      title,
      chineseTitle: title,
      url: bookUrl,
      cover: cover ? this.absUrl(cover) : undefined,
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
    const title = $('h1, .chapter-title').first().text().trim();

    const contentEl = $('#content, .content').first();
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
