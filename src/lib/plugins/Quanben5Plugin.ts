import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { scraperFetch, isScraperAvailable } from '@/lib/scraper-client';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';

const BASE = 'https://big5.quanben5.com';

export class Quanben5Plugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'quanben5',
    name: '全本5 (Quanben5)',
    baseUrl: BASE + '/',
    language: 'zh',
    version: '2.0.0',
    icon: 'https://raw.githubusercontent.com/Parasgaming122/external-sources/main/icons/quanben5.png',
    hasSearch: true,
    charset: 'Big5',
    description: 'Quanben5 novel site (Traditional Chinese). Chapters on separate xiaoshuo.html page.',
    blocked: false,
    blockedReason: '',
    cfBlockLevel: 'none',
    cfStatus: 'Accessible — full text available after loading chapter list page',
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

  /**
   * Extract the slug from a book URL.
   * URL: /n/yishixiejun/ or /n/yishixiejun/xiaoshuo.html
   */
  private extractSlug(bookUrl: string): string | null {
    const match = bookUrl.match(/\/n\/([^\/]+)/);
    return match ? match[1] : null;
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
    const res = await smartFetch(url, { charset: 'Big5' });
    if (res.success && res.body) return { html: res.body, success: true };
    return { html: '', success: false };
  }

  private cleanText(text: string): string {
    return text
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/www\.[^\s]+/g, '')
      .replace(/quanben5\.com[^\s]*/gi, '')
      .replace(/[\n]{3,}/g, '\n\n')
      .trim();
  }

  async getCatalogList(page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const url = page === 1 ? `${BASE}/category/1.html` : `${BASE}/category/1_${page}.html`;
    const { html, success } = await this.fetchPage(url);
    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];

    // Verified live 2026-07-30: catalog uses .pic_txt_list with h3 a links
    $('.pic_txt_list').each((_, el) => {
      const titleEl = $(el).find('h3 a').first();
      const title = titleEl.text().trim();
      const href = titleEl.attr('href');
      const cover = $(el).find('.pic img').attr('src');

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

  async getCatalogSearch(query: string): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    // Search via the site's native search page
    const searchUrl = `${BASE}/s/${encodeURIComponent(query)}.html`;
    const { html, success } = await this.fetchPage(searchUrl);
    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];

    $('.pic_txt_list, .search-result li').each((_, el) => {
      const titleEl = $(el).find('h3 a, a').first();
      const title = titleEl.text().trim();
      const href = titleEl.attr('href');
      const cover = $(el).find('.pic img, img').first().attr('src');

      if (title && href && href.includes('/n/')) {
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
    // Verified live 2026-07-30: title is in <h1>
    const title = $('h1').first().text().trim();
    if (!title) return null;

    // Cover: .box .pic img
    const cover = $('.box .pic img, .pic img').first().attr('src');
    const summary = $('.intro, .desc, .info p').first().text().trim();

    // Chapters are on a SEPARATE page: /n/{slug}/xiaoshuo.html
    // The book detail page itself only has a "點擊閱讀" link
    const chapters: PluginChapterItem[] = [];
    const slug = this.extractSlug(bookUrl);

    if (slug) {
      const chapterListUrl = `${BASE}/n/${slug}/xiaoshuo.html`;
      console.log(`[Quanben5] Fetching chapter list from: ${chapterListUrl}`);
      const { html: chHtml, success: chSuccess } = await this.fetchPage(chapterListUrl);

      if (chSuccess && chHtml) {
        const $ch = cheerio.load(chHtml);
        // Verified live: chapters are in <ul class="list"> with links like /n/{slug}/{id}.html
        $ch('ul.list a, .chapter-list a').each((_, el) => {
          const chTitle = $ch(el).text().trim();
          const chHref = $ch(el).attr('href');
          // Only include links that look like chapter links: /n/{slug}/{number}.html
          if (chTitle && chHref && /\/\d+\.html$/.test(chHref)) {
            const fullUrl = this.absUrl(chHref);
            chapters.push({
              id: Buffer.from(fullUrl).toString('base64url'),
              title: chTitle,
              url: fullUrl,
            });
          }
        });
        console.log(`[Quanben5] Loaded ${chapters.length} chapters from xiaoshuo.html`);
      }
    }

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
    const title = $('h1').first().text().trim();

    const contentEl = $('#content, .content, .box_con').first();
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
