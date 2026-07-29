import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { scraperFetch, isScraperAvailable } from '@/lib/scraper-client';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';

const BASE = 'https://www.ttkan.co';

export class TTKanPlugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'ttkan',
    name: 'TTKan',
    baseUrl: BASE + '/',
    language: 'zh',
    version: '1.0.0',
    icon: 'https://raw.githubusercontent.com/Parasgaming122/external-sources/main/icons/ttkan.png',
    hasSearch: true,
    charset: 'UTF-8',
    description: 'TTKan novel platform with API-based chapter listing. Supports ranked browsing and search.',
    blocked: false,
    blockedReason: '',
    cfBlockLevel: 'none',
    cfStatus: 'Accessible — no Cloudflare protection detected',
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

  private cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Build a cover URL from the slug in a book URL.
   * URL pattern: /novel/chapters/{slug} → cover: https://static.ttkan.co/cover/{slug}.jpg?w=250&h=300&q=100
   */
  private buildCoverUrl(bookUrl: string): string | undefined {
    const slugMatch = bookUrl.match(/\/novel\/chapters\/([^/]+)/);
    if (!slugMatch) return undefined;
    return `https://static.ttkan.co/cover/${slugMatch[1]}.jpg?w=250&h=300&q=100`;
  }

  /**
   * Extract novelId from a book URL like /novel/chapters/{novelId}
   */
  private extractNovelId(bookUrl: string): string | null {
    const match = bookUrl.match(/\/novel\/chapters\/([^/]+)/);
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
    const res = await smartFetch(url);
    if (res.success && res.body) return { html: res.body, success: true };
    return { html: '', success: false };
  }

  private parseRankItems(html: string): PluginNovelItem[] {
    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];

    $('.rank_list > div').each((_, el) => {
      const $el = $(el);
      const linkEl = $el.find('a[href*="/novel/chapters/"]').first();
      const href = linkEl.attr('href');
      const title = this.cleanText($el.find('h2, h3').first().text());

      if (title && href) {
        const bookUrl = this.absUrl(href);
        items.push({
          id: Buffer.from(bookUrl).toString('base64url'),
          title,
          chineseTitle: title,
          url: bookUrl,
          cover: this.buildCoverUrl(bookUrl),
          sourceId: this.info.id,
          sourceName: this.info.name,
        });
      }
    });

    return items;
  }

  async getCatalogList(page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const url = `${BASE}/novel/rank?page=${page}`;
    const { html, success } = await this.fetchPage(url);
    if (!success) return { items: [], hasNext: false };

    const items = this.parseRankItems(html);
    return { items, hasNext: items.length > 0 };
  }

  async getCatalogSearch(query: string, page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const searchUrl = `${BASE}/novel/search?q=${encodeURIComponent(query)}&page=${page}`;
    const { html, success } = await this.fetchPage(searchUrl);
    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];

    $('.novel_cell').each((_, el) => {
      const $el = $(el);
      const linkEl = $el.find('a[href*="/novel/chapters/"]').first();
      const href = linkEl.attr('href');
      const title = this.cleanText($el.find('h3, h2').first().text());

      if (title && href) {
        const bookUrl = this.absUrl(href);
        items.push({
          id: Buffer.from(bookUrl).toString('base64url'),
          title,
          chineseTitle: title,
          url: bookUrl,
          cover: this.buildCoverUrl(bookUrl),
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
    const title = this.cleanText($('h1').first().text());
    const cover = this.buildCoverUrl(bookUrl) || this.absUrl($('img.book-cover, .cover img').first().attr('src'));
    const summary = this.cleanText($('.description, .book-intro, .intro').first().text());

    if (!title) return null;

    // Extract novelId and fetch chapters via API
    const novelId = this.extractNovelId(bookUrl);
    const chapters: PluginChapterItem[] = [];

    if (novelId) {
      try {
        const apiUrl = `${BASE}/api/nq/amp_novel_chapters?language=tw&novel_id=${novelId}`;
        const { html: apiHtml, success: apiSuccess } = await this.fetchPage(apiUrl);
        if (apiSuccess && apiHtml) {
          // The API returns JSON
          const data = JSON.parse(apiHtml);
          const chapterList = data?.data?.chapter_list || data?.chapter_list || data?.chapters || [];
          if (Array.isArray(chapterList)) {
            chapterList.forEach((ch: { chapter_name?: string; name?: string; chapter_id?: string; id?: number }, idx: number) => {
              const chTitle = ch.chapter_name || ch.name || `Chapter ${idx + 1}`;
              const chUrl = `${BASE}/novel/pagea/${novelId}_${idx}.html`;
              chapters.push({
                id: Buffer.from(chUrl).toString('base64url'),
                title: chTitle,
                url: chUrl,
              });
            });
          }
        }
      } catch (e) {
        console.error(`[TTKan] Failed to fetch chapter API for ${novelId}:`, e);
      }

      // Fallback: try to find chapters in the HTML page itself
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
    const contentEl = $('.content, .chapter-content, .reader-content').first();

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
