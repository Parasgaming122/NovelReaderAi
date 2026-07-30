import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { scraperFetch, isScraperAvailable } from '@/lib/scraper-client';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';

const BASE = 'https://www.biquge5200.cc';

export class BiQuGe5200Plugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'biquge5200',
    name: '笔趣阁5200',
    baseUrl: BASE + '/',
    language: 'zh',
    version: '1.0.0',
    icon: 'https://raw.githubusercontent.com/Parasgaming122/external-sources/main/icons/biquge5200.png',
    hasSearch: true,
    charset: 'UTF-8',
    description: 'Chinese web novel source with catalog and search support.',
    blocked: true,
    blockedReason: '500 Internal Server Error — site is down or broken',
    cfBlockLevel: 'full',
    cfStatus: 'Site returns 500 Internal Server Error. Currently unreachable.',
    recommendedBypassMethods: ['smartFetch'],
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
    const res = await smartFetch(url);
    if (res.success && res.body) return { html: res.body, success: true };
    return { html: '', success: false };
  }

  private cleanText(text: string): string {
    return text
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/www\.[^\s]+/g, '')
      .replace(/笔趣阁5200[^\s]*/g, '')
      .replace(/[\n]{3,}/g, '\n\n')
      .trim();
  }

  async getCatalogList(page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const url = `${BASE}/sort/${page}/`;
    const { html, success } = await this.fetchPage(url);
    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];

    $('.book-list li, #main li').each((_, el) => {
      const titleEl = $(el).find('h2 a, h3 a').first();
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

  async getCatalogSearch(query: string, page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const url = `${BASE}/search.php?q=${encodeURIComponent(query)}`;
    const { html, success } = await this.fetchPage(url);
    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];

    $('.result-list li, .book-list li').each((_, el) => {
      const titleEl = $(el).find('h2 a, h3 a').first();
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
    const title = $('h1.title, .info h1, #info h1').first().text().trim();
    if (!title) return null;

    const cover = $('.cover img, .fm img, #fm img').first().attr('src');
    const summary = $('#intro, .intro, .desc, .intro p').first().text().trim();

    const chapters: PluginChapterItem[] = [];
    $('#list a, dd a, .chapter-list a').each((_, el) => {
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

    const contentEl = $('div.content, #content, .text').first();
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
