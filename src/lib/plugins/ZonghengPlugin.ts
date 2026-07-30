import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { scraperFetch, isScraperAvailable } from '@/lib/scraper-client';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';

const BASE = 'https://book.zongheng.com';
const SEARCH_BASE = 'https://search.zongheng.com';
const RANK_BASE = 'https://www.zongheng.com';

export class ZonghengPlugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'zongheng',
    name: '纵横文学 (Zongheng)',
    baseUrl: BASE + '/',
    language: 'zh',
    version: '1.0.0',
    icon: 'https://raw.githubusercontent.com/Parasgaming122/external-sources/main/icons/zongheng.png',
    hasSearch: true,
    charset: 'UTF-8',
    description: '纵横文学 — Major Chinese web novel platform. Browse rankings and search for novels.',
    blocked: true,
    blockedReason: 'Site times out on server-side requests — requires browser bypass',
    cfBlockLevel: 'full',
    cfStatus: 'Zongheng platform is heavily JS-based. Server-side requests time out. Requires browser bypass.',
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

  private absSearchUrl(href: string | undefined | null): string {
    if (!href) return '';
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) return SEARCH_BASE + href;
    return SEARCH_BASE + '/' + href;
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
    const url = `${RANK_BASE}/rank/yuepiao.html?page=${page}`;
    const { html, success } = await this.fetchPage(url);
    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];

    $('.rankitem_list li, .rank-book-item').each((_, el) => {
      const $el = $(el);
      const titleEl = $el.find('.bookname a, h2 a, .title a').first();
      const title = this.cleanText(titleEl.text());
      const href = titleEl.attr('href');
      const cover = this.absUrl($el.find('.book-img img, img.bookcover').first().attr('src'));
      const author = this.cleanText($el.find('.author a, .author-name').first().text());

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
    const searchUrl = `${SEARCH_BASE}/s?keyword=${encodeURIComponent(query)}&page=${page}`;
    const { html, success } = await this.fetchPage(searchUrl);
    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];

    $('.search-result-list li, .result-item').each((_, el) => {
      const $el = $(el);
      const titleEl = $el.find('.book-name a, h2 a, .tit a').first();
      const title = this.cleanText(titleEl.text());
      const href = titleEl.attr('href');
      const cover = this.absUrl($el.find('img.bookcover, .book-img img').first().attr('src'));
      const author = this.cleanText($el.find('.author a, .book-author').first().text());
      const summary = this.cleanText($el.find('.book-desc, .intro').first().text());

      if (title && href) {
        const bookUrl = this.absUrl(href);
        items.push({
          id: Buffer.from(bookUrl).toString('base64url'),
          title,
          chineseTitle: title,
          url: bookUrl,
          cover: cover || undefined,
          author: author || undefined,
          summary: summary || undefined,
          sourceId: this.info.id,
          sourceName: this.info.name,
        });
      }
    });

    return { items, hasNext: items.length > 0 };
  }

  async getBookDetails(bookUrl: string): Promise<PluginNovelDetail | null> {
    const { html, success } = await this.fetchPage(bookUrl);
    if (!success) return null;

    const $ = cheerio.load(html);
    const title = this.cleanText($('.book-info h1, .info h1, h1.book-name').first().text());
    const cover = this.absUrl($('.book-pic img, .book-cover img').first().attr('src'));
    const summary = this.cleanText($('.book-dec, .book-desc, .intro, .description').first().text());
    const author = this.cleanText($('.book-info .author a, .book-author').first().text().replace(/作者[：:]/, ''));

    if (!title) return null;

    const chapters: PluginChapterItem[] = [];

    // Try to find chapters directly on the book page
    $('.chapter-list li a, .volume-chapters a, ul.chapter-list a').each((_, el) => {
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

    // Fallback: try to find a catalog link and fetch it
    if (chapters.length === 0) {
      const catalogLink = $('a[href*="catalog"], a[href*="chapter"], .book-info a[href*="list"]').first().attr('href');
      if (catalogLink) {
        const catalogUrl = this.absUrl(catalogLink);
        const { html: catalogHtml, success: catalogSuccess } = await this.fetchPage(catalogUrl);
        if (catalogSuccess && catalogHtml) {
          const $catalog = cheerio.load(catalogHtml);
          $catalog('.chapter-list li a, .volume-chapters a, ul.chapter-list a').each((_, el) => {
            const $a = $catalog(el);
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
        }
      }
    }

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
    const title = this.cleanText($('h1.chapter-title, h1.title, .chapter-name').first().text());

    $('script, style, ins, .ad, .advertisement, .chapter-author, .chapter-time').remove();
    const contentEl = $('.content, .chapter-content, .reader-content, #chapterContent').first();

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
