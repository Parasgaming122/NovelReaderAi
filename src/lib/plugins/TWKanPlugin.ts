import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { scraperFetch, isScraperAvailable } from '@/lib/scraper-client';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';

const BASE = 'https://twkan.com';

export class TWKanPlugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'twkan',
    name: 'TWKan',
    baseUrl: BASE + '/',
    language: 'zh',
    version: '1.0.0',
    icon: 'https://raw.githubusercontent.com/Parasgaming122/external-sources/main/icons/twkan.png',
    hasSearch: true,
    charset: 'UTF-8',
    description: 'TWKan novel platform. ⚠️ BLOCKED: site returns 403 Forbidden. Plugin provided for future use if site recovers.',
    blocked: true,
    blockedReason: '403 Forbidden — anti-bot protection',
    cfBlockLevel: 'full',
    cfStatus: 'Blocked — Cloudflare anti-bot protection returns 403 Forbidden',
    recommendedBypassMethods: ['browser', 'scraper', 'impit'],
    availableBypassMethods: ['smartFetch', 'impit', 'browser', 'scraper', 'clientProxy'],
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
    const url = `${BASE}/novels/newhot_2_0_${page}.html`;
    const { html, success } = await this.fetchPage(url);
    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];

    $('#article_list_content li').each((_, el) => {
      const $el = $(el);
      const titleEl = $el.find('h3 a').first();
      const title = this.cleanText(titleEl.text());
      const href = titleEl.attr('href');
      const cover = this.absUrl($el.find('img').first().attr('src') || $el.find('img').first().attr('data-src'));

      if (title && href) {
        const bookUrl = this.absUrl(href);
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

    return { items, hasNext: items.length > 0 };
  }

  async getCatalogSearch(query: string, page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const searchUrl = `${BASE}/search/${encodeURIComponent(query)}/${page}.html`;
    const { html, success } = await this.fetchPage(searchUrl);
    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];

    $('#article_list_content li').each((_, el) => {
      const $el = $(el);
      const titleEl = $el.find('h3 a').first();
      // Fallback to any book link if h3 a is missing
      const fallbackEl = !titleEl.attr('href') ? $el.find('a[href*="/book/"]').first() : null;
      const finalEl = titleEl.attr('href') ? titleEl : fallbackEl;
      const title = this.cleanText(finalEl?.text() || '');
      const href = finalEl?.attr('href');
      const cover = this.absUrl($el.find('img').first().attr('src') || $el.find('img').first().attr('data-src'));

      if (title && href) {
        const bookUrl = this.absUrl(href);
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

    return { items, hasNext: items.length > 0 };
  }

  async getBookDetails(bookUrl: string): Promise<PluginNovelDetail | null> {
    const { html, success } = await this.fetchPage(bookUrl);
    if (!success) return null;

    const $ = cheerio.load(html);
    const title = this.cleanText($('h1 a, h1').first().text());
    const cover = this.absUrl($('.bookimg2 img, .cover img').first().attr('src') || $('.bookimg2 img').first().attr('data-src'));
    const summary = this.cleanText($('#tab_info .navtxt p, .intro, .description').first().text());

    if (!title) return null;

    // Try to extract bookId and fetch chapter list via AJAX endpoint
    const chapters: PluginChapterItem[] = [];
    const bookIdMatch = bookUrl.match(/\/book\/(\d+)\.html/);
    const bookId = bookIdMatch ? bookIdMatch[1] : null;

    if (bookId) {
      try {
        const ajaxUrl = `${BASE}/ajax_novels/chapterlist/${bookId}.html`;
        const { html: ajaxHtml, success: ajaxSuccess } = await this.fetchPage(ajaxUrl);
        if (ajaxSuccess && ajaxHtml) {
          const $ajax = cheerio.load(ajaxHtml);
          $ajax('ul li a[href]').each((_, el) => {
            const $a = $ajax(el);
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
        console.error(`[TWKan] Failed to fetch chapter AJAX for ${bookId}:`, e);
      }
    }

    // Fallback: try finding chapters on the page itself
    if (chapters.length === 0) {
      $('.chapter-list a, #catalog a, .chapters a').each((_, el) => {
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
    const title = this.cleanText($('h1, h1.chapter-title, .chapter-title').first().text());

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
