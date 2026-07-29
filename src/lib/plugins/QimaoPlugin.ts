import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { scraperFetch, isScraperAvailable } from '@/lib/scraper-client';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';

const BASE = 'https://www.qimao.com';

export class QimaoPlugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'qimao',
    name: '七猫小说 (Qimao)',
    baseUrl: BASE + '/',
    language: 'zh',
    version: '1.0.0',
    icon: 'https://raw.githubusercontent.com/Parasgaming122/external-sources/main/icons/qimao.png',
    hasSearch: true,
    charset: 'UTF-8',
    description: '七猫小说 — Major Chinese novel platform. ⚠️ SITE ISSUES: root URL returns 405. Plugin may not work reliably. Provided for future use.',
    blocked: true,
    blockedReason: '405 Not Allowed — site rejects root requests',
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

  /**
   * Extract bookId from various URL patterns like /book/{id}, /shu/{id}, etc.
   */
  private extractBookId(bookUrl: string): string | null {
    const match = bookUrl.match(/\/(book|shu|detail)\/(\d+)/);
    return match ? match[2] : null;
  }

  async getCatalogList(page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const url = `${BASE}/rank/${page}/`;
    const { html, success } = await this.fetchPage(url);
    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];

    $('ul.rank-list li, ul.rank-list > div').each((_, el) => {
      const $el = $(el);
      const titleEl = $el.find('h3 a').first();
      const title = this.cleanText(titleEl.text());
      const href = titleEl.attr('href');
      const cover = this.absUrl(
        $el.find('.book-cover img').first().attr('src') ||
        $el.find('.book-cover img').first().attr('data-src') ||
        $el.find('img[data-src]').first().attr('data-src')
      );
      const author = this.cleanText($el.find('.author, .book-author').first().text());

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
    const searchUrl = `${BASE}/search/?keyword=${encodeURIComponent(query)}&page=${page}`;
    const { html, success } = await this.fetchPage(searchUrl);
    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];

    $('ul.search-list li, .search-result-list .result-item, ul.search-list > div').each((_, el) => {
      const $el = $(el);
      const titleEl = $el.find('h3 a, .book-title a').first();
      const title = this.cleanText(titleEl.text());
      const href = titleEl.attr('href');
      const cover = this.absUrl(
        $el.find('.book-cover img').first().attr('src') ||
        $el.find('img[data-src]').first().attr('data-src')
      );
      const author = this.cleanText($el.find('.author, .book-author').first().text());
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
    const title = this.cleanText($('h1.book-title, .detail-info h1, h1.title').first().text());
    const cover = this.absUrl(
      $('.book-cover img').first().attr('src') ||
      $('.detail-left img').first().attr('src') ||
      $('meta[property="og:image"]').attr('content')
    );
    const summary = this.cleanText($('.book-intro, .detail-info .intro, .book-desc p, .book-desc').first().text());
    const author = this.cleanText($('.detail-info .author, .book-author').first().text().replace(/作者[：:]/, ''));

    if (!title) return null;

    const chapters: PluginChapterItem[] = [];

    // Try to find bookId and fetch catalog via API
    const bookId = this.extractBookId(bookUrl);

    if (bookId) {
      try {
        const catalogUrl = `${BASE}/book/catalog?bookId=${bookId}`;
        const { html: catalogHtml, success: catalogSuccess } = await this.fetchPage(catalogUrl);
        if (catalogSuccess && catalogHtml) {
          const $catalog = cheerio.load(catalogHtml);
          $catalog('.catalog-list a, .chapter-list a, ul.chapter-list li a').each((_, el) => {
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
      } catch (e) {
        console.error(`[Qimao] Failed to fetch catalog API for bookId ${bookId}:`, e);
      }
    }

    // Fallback: try finding chapters on the page itself
    if (chapters.length === 0) {
      $('.catalog-list a, .chapter-list a, ul.chapter-list li a').each((_, el) => {
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
    const contentEl = $('.chapter-content, .content, .text-content, #chapterContent').first();

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
