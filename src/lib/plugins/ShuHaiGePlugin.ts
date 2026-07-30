import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';

const BASE = 'https://m.shuhaige.net';

export class ShuHaiGePlugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'shuhaige',
    name: '书海阁 (ShuHaiGe)',
    baseUrl: BASE + '/',
    language: 'zh',
    version: '2.0.0',
    icon: 'https://raw.githubusercontent.com/Parasgaming122/external-sources/main/icons/shuhaige.png',
    hasSearch: true,
    charset: 'UTF-8',
    description: '书海阁 mobile novel site. Catalog, search, and reading all accessible.',
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
    return text
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/www\.[^\s]+/g, '')
      .replace(/shuhaige\.net[^\s]*/gi, '')
      .replace(/[\n]{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Extract the bookId from a ShuHaiGe URL.
   * URL patterns:
   *   /{bookId}/           → book chapter list page
   *   /{bookId}/{chId}.html → chapter page
   *   /shu_{bookId}.html   → book info page
   *   /txt_{bookId}.html   → full text page
   */
  private extractBookId(url: string): string | null {
    const match = url.match(/\/(\d+)\//) || url.match(/\/(\d+)\.html$/) || url.match(/shu_(\d+)\.html/);
    return match ? match[1] : null;
  }

  async getCatalogList(page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    // Verified 2026-07-30: /shuku/0_{cat}_0_{page}.html
    // Category 0 = all categories
    const url = `${BASE}/shuku/0_0_0_${page}.html`;
    const res = await smartFetch(url);
    if (!res.success || !res.body) return { items: [], hasNext: false };

    const $ = cheerio.load(res.body);
    const items: PluginNovelItem[] = [];

    // Each book is in a list item with a link like /{bookId}/{chapterId}.html
    // We need to extract the bookId and build the book info URL
    const seen = new Set<string>();
    $('a[href*="/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const bookIdMatch = href.match(/^\/(\d+)\/\d+\.html$/);
      if (!bookIdMatch) return;
      const bookId = bookIdMatch[1];
      if (seen.has(bookId)) return;
      seen.add(bookId);

      // Get the parent element for more info
      const $parent = $(el).closest('li, div, tr');
      const title = $(el).text().trim();
      const cover = $parent.find('img').first().attr('src');

      if (title && title.length > 2 && title.length < 100) {
        const bookUrl = `${BASE}/${bookId}/`;
        items.push({
          id: Buffer.from(bookUrl).toString('base64url'),
          title,
          chineseTitle: title,
          url: bookUrl,
          cover: cover ? this.absUrl(cover) : undefined,
          sourceId: this.info.id,
          sourceName: this.info.name,
        });
      }
    });

    return { items, hasNext: items.length >= 20 };
  }

  async getCatalogSearch(query: string, page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    // Verified 2026-07-30: POST to /search.html
    let html = '';
    let success = false;

    try {
      const res = await smartFetch(`${BASE}/search.html`, {
        method: 'POST',
        body: new URLSearchParams({ searchkey: query }).toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': BASE },
      });
      if (res.success && res.body) {
        html = res.body;
        success = true;
      }
    } catch { return { items: [], hasNext: false }; }

    if (!success) return { items: [], hasNext: false };

    const $ = cheerio.load(html);
    const items: PluginNovelItem[] = [];
    const seen = new Set<string>();

    // Search results link to /{bookId}/{chapterId}.html
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const bookIdMatch = href.match(/^\/(\d+)\/\d+\.html$/);
      if (!bookIdMatch) return;
      const bookId = bookIdMatch[1];
      if (seen.has(bookId)) return;
      seen.add(bookId);

      const title = $(el).text().trim();
      const $parent = $(el).closest('li, div, tr');
      const cover = $parent.find('img').first().attr('src');

      if (title && title.length > 2 && title.length < 100) {
        const bookUrl = `${BASE}/${bookId}/`;
        items.push({
          id: Buffer.from(bookUrl).toString('base64url'),
          title,
          chineseTitle: title,
          url: bookUrl,
          cover: cover ? this.absUrl(cover) : undefined,
          sourceId: this.info.id,
          sourceName: this.info.name,
        });
      }
    });

    return { items, hasNext: false };
  }

  async getBookDetails(bookUrl: string): Promise<PluginNovelDetail | null> {
    // bookUrl format: https://m.shuhaige.net/{bookId}/
    // This page has chapter list links
    // Book info page: /shu_{bookId}.html
    const bookId = this.extractBookId(bookUrl);
    if (!bookId) return null;

    // Fetch book info page
    const infoUrl = `${BASE}/shu_${bookId}.html`;
    const infoRes = await smartFetch(infoUrl);
    if (!infoRes.success || !infoRes.body) return null;

    const $info = cheerio.load(infoRes.body);
    const title = $info('h1, .book-name, .name').first().text().trim();
    if (!title) return null;

    const cover = $info('.cover img, .book-img img, img').first().attr('src');
    const summary = $info('.intro, .desc p, .description').first().text().trim();
    const author = $info('.author, .book-author').first().text().replace(/作者[：:]/, '').trim();

    // Fetch chapter list page(s) — ShuHaiGe paginates chapter lists
    const listUrl = `${BASE}/${bookId}/`;
    const chapters: PluginChapterItem[] = [];
    const seen = new Set<string>();
    const MAX_CHAPTER_PAGES = 20;
    let chapterPage = 1;

    while (chapterPage <= MAX_CHAPTER_PAGES) {
      const pageUrl = chapterPage === 1 ? listUrl : `${BASE}/${bookId}/${chapterPage}.html`;
      const listRes = await smartFetch(pageUrl);

      if (!listRes.success || !listRes.body) break;

      const $list = cheerio.load(listRes.body);
      let pageChapterCount = 0;

      // Chapter links: /{bookId}/{chapterId}.html
      $list('a[href]').each((_, el) => {
        const href = $list(el).attr('href') || '';
        const chMatch = href.match(/^\/(\d+)\/(\d+)\.html$/);
        if (!chMatch || chMatch[1] !== bookId) return;
        if (seen.has(href)) return;
        seen.add(href);

        const chTitle = $list(el).text().trim();
        if (chTitle && chTitle.length > 0 && chTitle.length < 100) {
          const fullUrl = this.absUrl(href);
          chapters.push({
            id: Buffer.from(fullUrl).toString('base64url'),
            title: chTitle,
            url: fullUrl,
          });
          pageChapterCount++;
        }
      });

      // If this page had no new chapters, stop paginating
      if (pageChapterCount === 0) break;

      // Check if there's a next page link (multiple strategies for robustness)
      const nextPageNum = chapterPage + 1;
      let hasNextPage = $list('a[href*="/' + bookId + '/' + nextPageNum + '.html"]').length > 0
        || $list('.pagelink a:contains("' + nextPageNum + '")').length > 0;
      // Fallback: scan all a[href] links for one whose text contains 下一页 or whose href
      // points to the next page number
      if (!hasNextPage) {
        $list('a[href]').each((_, el) => {
          const linkText = $list(el).text().trim();
          const linkHref = $list(el).attr('href') || '';
          if (linkText.includes('下一页') || linkHref.includes('/' + nextPageNum + '.html')) {
            hasNextPage = true;
            return false; // break
          }
        });
      }

      if (pageChapterCount === 0) break;
      chapterPage++;
    }

    // Sort chapters by chapter number in URL (ascending)
    chapters.sort((a, b) => {
      const numA = a.url.match(/\/(\d+)\.html$/);
      const numB = b.url.match(/\/(\d+)\.html$/);
      if (numA && numB) return parseInt(numA[1]) - parseInt(numB[1]);
      return 0;
    });

    return {
      id: Buffer.from(bookUrl).toString('base64url'),
      title,
      chineseTitle: title,
      url: bookUrl,
      cover: cover ? this.absUrl(cover) : undefined,
      author: author || undefined,
      summary: this.cleanText(summary),
      sourceId: this.info.id,
      sourceName: this.info.name,
      chapters,
    };
  }

  async getChapterText(chapterUrl: string): Promise<{ title?: string; contentHtml: string; rawText: string }> {
    const res = await smartFetch(chapterUrl);
    if (!res.success || !res.body) {
      return { contentHtml: '<p>Failed to retrieve chapter content.</p>', rawText: '' };
    }

    const $ = cheerio.load(res.body);
    const title = $('h1, .chapter-title').first().text().trim();

    // Prioritize specific selectors over generic .content (which can match nav/footers/ads)
    const contentEl = $('#content, .read-content, .chapter-content, .content').first();
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
