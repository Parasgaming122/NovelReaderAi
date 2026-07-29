import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { scraperFetch, isScraperAvailable } from '@/lib/scraper-client';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';

const BASE = 'https://fanqienovel.com';

export class FanqiePlugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'fanqie',
    name: '番茄小说 (Fanqie)',
    baseUrl: BASE + '/',
    language: 'zh',
    version: '1.0.0',
    icon: 'https://raw.githubusercontent.com/Parasgaming122/external-sources/main/icons/fanqie.png',
    hasSearch: true,
    charset: 'UTF-8',
    description: 'Fanqie Novel - JSON API with HTML fallback.',
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
      .replace(/fanqienovel\.com[^\s]*/gi, '')
      .replace(/[\n]{3,}/g, '\n\n')
      .trim();
  }

  async getCatalogList(page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    // Try JSON API first
    const apiUrl = `${BASE}/api/book/list?category_id=0&page=${page}&page_size=20`;
    try {
      const res = await smartFetch(apiUrl);
      if (res.success && res.body) {
        const data = JSON.parse(res.body);
        const bookList = data?.data?.book_list;
        if (Array.isArray(bookList) && bookList.length > 0) {
          const items: PluginNovelItem[] = bookList.map((book: any) => {
            const bookUrl = `${BASE}/page/${book.book_id}`;
            return {
              id: Buffer.from(bookUrl).toString('base64url'),
              title: book.book_name || book.title || '',
              chineseTitle: book.book_name || book.title || '',
              url: bookUrl,
              cover: book.thumb_url || book.cover || undefined,
              author: book.author || undefined,
              summary: book.abstract || book.desc || undefined,
              sourceId: this.info.id,
              sourceName: this.info.name,
            };
          });
          return { items, hasNext: items.length >= 20 };
        }
      }
    } catch {
      // Fallback to HTML
    }

    // HTML fallback
    const { html, success } = await this.fetchPage(`${BASE}/`);
    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];
    $('a[href*="/page/"]').each((_, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr('href');
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

  async getCatalogSearch(query: string, page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    // Try JSON API
    const searchUrl = `${BASE}/api/search?query=${encodeURIComponent(query)}&page=${page}`;
    try {
      const res = await smartFetch(searchUrl);
      if (res.success && res.body) {
        const data = JSON.parse(res.body);
        const searchData = data?.data?.search_data || data?.data?.book_list;
        if (Array.isArray(searchData) && searchData.length > 0) {
          const items: PluginNovelItem[] = searchData.map((book: any) => {
            const bookUrl = `${BASE}/page/${book.book_id}`;
            return {
              id: Buffer.from(bookUrl).toString('base64url'),
              title: book.book_name || book.title || '',
              chineseTitle: book.book_name || book.title || '',
              url: bookUrl,
              cover: book.thumb_url || book.cover || undefined,
              author: book.author || undefined,
              sourceId: this.info.id,
              sourceName: this.info.name,
            };
          });
          return { items, hasNext: false };
        }
      }
    } catch {
      // Fallback to HTML
    }

    // HTML fallback
    const { html, success } = await this.fetchPage(`${BASE}/search?query=${encodeURIComponent(query)}`);
    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];
    $('a[href*="/page/"]').each((_, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr('href');
      if (title && href) {
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
    return { items, hasNext: false };
  }

  async getBookDetails(bookUrl: string): Promise<PluginNovelDetail | null> {
    const { html, success } = await this.fetchPage(bookUrl);
    if (!success) return null;

    const $ = cheerio.load(html);
    const title = $('h1.book-name, .book-info h1, h1.mt40').first().text().trim();
    if (!title) return null;

    const cover = $('.book-cover img, img.mw100').first().attr('src');
    const summary = $('.book-intro, .intro-content, .desc-text').first().text().trim();

    // Try JSON chapter list
    const bookIdMatch = bookUrl.match(/\/(\d+)(?:\/|$)/);
    const chapters: PluginChapterItem[] = [];

    if (bookIdMatch) {
      const bookId = bookIdMatch[1];
      try {
        const res = await smartFetch(`${BASE}/api/reader/chapter_list?book_id=${bookId}`);
        if (res.success && res.body) {
          const data = JSON.parse(res.body);
          const chapterData = data?.data || [];
          if (Array.isArray(chapterData)) {
            chapterData.forEach((ch: any) => {
              const chTitle = ch.title || ch.chapter_title || '';
              const chUrl = `${BASE}/reader/${bookId}/${ch.chapter_id}`;
              if (chTitle) {
                chapters.push({
                  id: Buffer.from(chUrl).toString('base64url'),
                  title: chTitle,
                  url: chUrl,
                });
              }
            });
          }
        }
      } catch {
        // Fallback to HTML chapter list
      }
    }

    // HTML fallback for chapters
    if (chapters.length === 0) {
      $('.chapter-list a, .chapter a').each((_, el) => {
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
    const title = $('h1, .chapter-title').first().text().trim();

    const contentEl = $('.reader-content, .chapter-content, .content, #readerContent').first();
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
