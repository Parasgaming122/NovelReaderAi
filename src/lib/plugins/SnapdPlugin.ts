import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { scraperFetch, isScraperAvailable } from '@/lib/scraper-client';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';

const BASE = 'https://m.snapd.net';

export class SnapdPlugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'snapd',
    name: 'SnapD小说',
    baseUrl: BASE + '/',
    language: 'zh',
    version: '1.0.0',
    icon: 'https://raw.githubusercontent.com/Parasgaming122/external-sources/main/icons/snapd.png',
    hasSearch: true,
    charset: 'UTF-8',
    description: 'SnapD Chinese novel aggregator. Browse catalog and search available.',
  };

  private absUrl(href: string | undefined | null): string {
    if (!href) return '';
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) return BASE + href;
    return BASE + '/' + href;
  }

  private cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
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

  async getCatalogList(page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const url = `${BASE}/sort/${page}/`;
    const { html, success } = await this.fetchPage(url);
    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];

    $('.book-list li, .list li').each((_, el) => {
      const $el = $(el);
      const titleEl = $el.find('h2 a, h3 a').first();
      const title = this.cleanText(titleEl.text());
      const href = titleEl.attr('href');
      const cover = this.absUrl($el.find('img').first().attr('src') || $el.find('img').first().attr('data-src'));
      const author = this.cleanText($el.find('.author, .info .author').first().text());

      if (title && href) {
        const bookUrl = this.absUrl(href);
        items.push({
          id: Buffer.from(bookUrl).toString('base64url'),
          title,
          chineseTitle: title,
          url: bookUrl,
          cover: cover || undefined,
          author: author || undefined,
          sourceId: this.info.id,
          sourceName: this.info.name,
        });
      }
    });

    return { items, hasNext: items.length > 0 };
  }

  async getCatalogSearch(query: string, page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const searchUrl = `${BASE}/search.php?q=${encodeURIComponent(query)}&page=${page}`;
    const { html, success } = await this.fetchPage(searchUrl);
    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];

    $('.result li, .book-list li').each((_, el) => {
      const $el = $(el);
      const titleEl = $el.find('h2 a, h3 a').first();
      const title = this.cleanText(titleEl.text());
      const href = titleEl.attr('href');
      const cover = this.absUrl($el.find('img').first().attr('src') || $el.find('img').first().attr('data-src'));
      const author = this.cleanText($el.find('.author, .info .author').first().text());

      if (title && href) {
        const bookUrl = this.absUrl(href);
        items.push({
          id: Buffer.from(bookUrl).toString('base64url'),
          title,
          chineseTitle: title,
          url: bookUrl,
          cover: cover || undefined,
          author: author || undefined,
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
    const title = this.cleanText($('h1.title, h1.book-title').first().text());
    const cover = this.absUrl($('.cover img, .fm img').first().attr('src') || $('.cover img, .fm img').first().attr('data-src'));
    const summary = this.cleanText($('.intro p, .desc, .description').first().text());
    const author = this.cleanText($('.info .author, .book-info .author').first().text().replace(/作者[：:]/, ''));

    if (!title) return null;

    const chapters: PluginChapterItem[] = [];
    $('#catalog a, .chapter-list a').each((_, el) => {
      const $a = $(el);
      const chTitle = this.cleanText($a.text());
      const chHref = $a.attr('href');
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
      cover: cover || undefined,
      author: author || undefined,
      summary,
      sourceId: this.info.id,
      sourceName: this.info.name,
      chapters,
    };
  }

  async getChapterText(chapterUrl: string): Promise<{ title?: string; contentHtml: string; rawText: string }> {
    const { html, success } = await this.fetchPage(chapterUrl);
    if (!success) {
      return { contentHtml: '<p>Failed to load chapter content.</p>', rawText: '' };
    }

    const $ = cheerio.load(html);
    const title = this.cleanText($('h1.title, h1.book-title, h1.chapter-title, h1').first().text());

    $('script, style, ins, .ad, .advertisement').remove();
    const contentEl = $('#content, .content, .chapter-content, .reader-content').first();

    if (!contentEl.length) {
      return { title, contentHtml: '<p>Chapter content was empty.</p>', rawText: '' };
    }

    const paragraphs: string[] = [];
    contentEl.find('p').each((_, el) => {
      const t = $(el).text().trim();
      if (t) paragraphs.push(t);
    });

    if (paragraphs.length === 0) {
      const raw = contentEl.text();
      raw.split(/\n+/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed) paragraphs.push(trimmed);
      });
    }

    const contentHtml = paragraphs.map(p => `<p>${p}</p>`).join('\n');
    const rawText = paragraphs.join('\n\n');

    return { title, contentHtml, rawText };
  }
}
