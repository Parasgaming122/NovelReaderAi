import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { scraperFetch, isScraperAvailable } from '@/lib/scraper-client';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';

const BASE = 'https://www.ddxss.cc';

export class DdxssPlugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'ddxss',
    name: '顶点小说 (DDXSS)',
    baseUrl: BASE + '/',
    language: 'zh',
    version: '1.0.0',
    icon: 'https://raw.githubusercontent.com/Parasgaming122/external-sources/main/icons/ddxss.png',
    hasSearch: true,
    charset: 'GBK',
    description: 'Chinese web novel source with GBK encoding, POST search and catalog.',
    blocked: true,
    blockedReason: 'Domain parked — no longer a novel site',
    cfBlockLevel: 'full',
    cfStatus: 'Domain ddxss.cc is parked/defunct. No novel content available.',
    recommendedBypassMethods: ['smartFetch', 'impit'],
    availableBypassMethods: ['smartFetch', 'impit', 'browser', 'scraper', 'clientProxy'],
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
    const res = await smartFetch(url, { charset: 'GBK' });
    if (res.success && res.body) return { html: res.body, success: true };
    return { html: '', success: false };
  }

  private cleanText(text: string): string {
    return text
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/www\.[^\s]+/g, '')
      .replace(/ddxss\.[^\s]*/gi, '')
      .replace(/[\n]{3,}/g, '\n\n')
      .trim();
  }

  async getCatalogList(page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const url = `${BASE}/sort/${page}/`;
    const { html, success } = await this.fetchPage(url);
    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];

    $('.booklist li, #booklist li').each((_, el) => {
      const titleEl = $(el).find('h3 a, .t1 a').first();
      const title = titleEl.text().trim();
      const href = titleEl.attr('href');
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

    return { items, hasNext: items.length > 0 };
  }

  async getCatalogSearch(query: string, _page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const searchUrl = `${BASE}/modules/article/search.php`;
    let html = '';
    let success = false;

    try {
      // POST search with GBK encoding — use smartFetch directly (scraperFetch doesn't support POST)
      const res = await smartFetch(searchUrl, {
        method: 'POST',
        body: new URLSearchParams({ searchkey: query, searchtype: 'articlename' }).toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        charset: 'GBK',
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

    $('.booklist li, #booklist li, .result-list li').each((_, el) => {
      const titleEl = $(el).find('h3 a, .t1 a').first();
      const title = titleEl.text().trim();
      const href = titleEl.attr('href');
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
    const title = $('h1.title, h1.book-title, .info h1').first().text().trim();
    if (!title) return null;

    const cover = $('.cover img, .book-img img').first().attr('src');
    const summary = $('.intro, .desc, .book-intro, .jj').first().text().trim();

    const chapters: PluginChapterItem[] = [];
    $('#catalog a, .chapter-list a, .list a').each((_, el) => {
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
    const title = $('h1, .bookname h1').first().text().trim();

    const contentEl = $('#content, .content, #booktext').first();
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
