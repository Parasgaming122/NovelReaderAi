import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';

export class XBiqugePlugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'xbiquge',
    name: 'XBiquge (新笔趣阁)',
    baseUrl: 'https://www.xbiquge.info/',
    language: 'zh',
    version: '9.0.0',
    icon: 'https://www.xbiquge.info/favicon.ico',
    hasSearch: true,
    charset: 'UTF-8',
    description: 'Popular Chinese web novel site. Catalog, search, chapters, and text all accessible via smartFetch. Multi-page chapter support.',
    blocked: false,
    blockedReason: '',
    cfBlockLevel: 'none',
    cfStatus: 'Fully accessible — no Cloudflare protection detected',
    recommendedBypassMethods: ['smartFetch'],
    availableBypassMethods: ['smartFetch', 'impit'],
  };

  private absUrl(href: string): string {
    if (!href) return '';
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) return 'https://www.xbiquge.info' + href;
    return 'https://www.xbiquge.info/' + href;
  }

  async getCatalogList(page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const url = page === 1 ? 'https://www.xbiquge.info/' : `https://www.xbiquge.info/list${((page - 1) % 8) + 1}/`;
    const res = await smartFetch(url);
    if (!res.success || !res.body) return { items: [], hasNext: false };

    const $ = cheerio.load(res.body);
    const items: PluginNovelItem[] = [];

    $('dl').each((_, el) => {
      const titleEl = $(el).find('dd h3 a').first();
      const href = titleEl.attr('href');
      const title = titleEl.text().trim();
      const cover = $(el).find('dt a img').attr('src');

      const authorText = $(el).find('dd.book_other').first().text().trim();
      const authorMatch = authorText.match(/作者[：:]?\s*(.+)/);
      const author = authorMatch ? authorMatch[1].trim() : undefined;

      if (title && href && href.startsWith('/') && href.match(/^\/\d+\/\d+\/?$/) && title.length > 1) {
        items.push({
          id: Buffer.from(this.absUrl(href)).toString('base64url'),
          title,
          chineseTitle: title,
          url: this.absUrl(href),
          cover: cover ? this.absUrl(cover) : undefined,
          author,
          sourceId: this.info.id,
          sourceName: this.info.name,
        });
      }
    });

    return { items, hasNext: true };
  }

  async getCatalogSearch(query: string, page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const searchUrl = `https://www.xbiquge.info/search.php?q=${encodeURIComponent(query)}`;
    const res = await smartFetch(searchUrl, {
      headers: { 'Referer': 'https://www.xbiquge.info/' },
    });

    if (!res.success || !res.body) return { items: [], hasNext: false };

    const $ = cheerio.load(res.body);
    const items: PluginNovelItem[] = [];

    $('dl').each((_, el) => {
      const titleEl = $(el).find('dd h3 a').first();
      const href = titleEl.attr('href');
      const title = titleEl.text().trim();
      const cover = $(el).find('dt a img').attr('src');

      const authorText = $(el).find('dd.book_other').first().text().trim();
      const authorMatch = authorText.match(/作者[：:]?\s*(.+)/);
      const author = authorMatch ? authorMatch[1].trim() : undefined;

      if (title && href && href.startsWith('/') && title.length > 1 && !title.includes('搜索结果')) {
        items.push({
          id: Buffer.from(this.absUrl(href)).toString('base64url'),
          title,
          chineseTitle: title,
          url: this.absUrl(href),
          cover: cover ? this.absUrl(cover) : undefined,
          author,
          sourceId: this.info.id,
          sourceName: this.info.name,
        });
      }
    });

    return { items, hasNext: false };
  }

  async getBookDetails(bookUrl: string): Promise<PluginNovelDetail | null> {
    const res = await smartFetch(bookUrl);
    if (!res.success || !res.body) return null;

    const $ = cheerio.load(res.body);

    let title = $('h1').first().text().trim();
    const bookTitleMatch = title.match(/《(.+?)》/);
    if (bookTitleMatch) {
      title = bookTitleMatch[1];
    }
    if (!title) return null;

    const cover = $('dl dt a img, .book_info img, img').first().attr('src');
    const summary = $('#intro, .intro, .description, .book-intro').first().text().trim();

    const chapters: PluginChapterItem[] = [];
    const seen = new Set<string>();

    // PRIMARY: Use #list dd a — the MAIN chapter list, ordered oldest→newest.
    // Do NOT use div.book_list li a — that is a sidebar/recent-updates widget (newest-first).
    $('#list dd a[href$=".html"]').each((_, el) => {
      const chTitle = $(el).text().trim();
      const chHref = $(el).attr('href');
      // Exclude multi-page suffixes (_2.html, _3.html) and index_ links
      if (!chTitle || !chHref || !/\.html$/.test(chHref)) return;
      if (/\_\d+\.html$/.test(chHref)) return;
      if (/^index_/.test(chHref)) return;
      if (chTitle.length < 1 || chTitle.length > 100) return;
      if (seen.has(chHref)) return;
      seen.add(chHref);
      const fullUrl = this.absUrl(chHref);
      chapters.push({
        id: Buffer.from(fullUrl).toString('base64url'),
        title: chTitle,
        url: fullUrl,
      });
    });

    return {
      id: Buffer.from(bookUrl).toString('base64url'),
      title,
      chineseTitle: title,
      url: bookUrl,
      cover: cover ? this.absUrl(cover) : undefined,
      author: 'Unknown Author',
      summary,
      sourceId: this.info.id,
      sourceName: this.info.name,
      chapters,
    };
  }

  /**
   * Extract chapter text, handling multi-page chapters.
   * Uses #content as primary selector (most reliable on xbiquge).
   */
  async getChapterText(chapterUrl: string): Promise<{ title?: string; contentHtml: string; rawText: string }> {
    let res = await smartFetch(chapterUrl, { timeout: 20000 });
    if (!res.success || !res.body) {
      return { contentHtml: '<p>Failed to retrieve chapter content.</p>', rawText: '' };
    }

    let $ = cheerio.load(res.body);
    const rawTitle = $('h1').first().text().trim();
    const titleMatch = rawTitle.match(/^(.+?)[—\-—]《/);
    const title = titleMatch ? titleMatch[1].trim() : rawTitle;

    const allLines: string[] = [];
    let pageNum = 1;
    const MAX_PAGES = 10;

    while (pageNum <= MAX_PAGES) {
      if (pageNum > 1) {
        const baseUrl = chapterUrl.replace(/_\d+\.html$/, '.html').replace(/\.html$/, '');
        const pageUrl = `${baseUrl}_${pageNum}.html`;
        const nextRes = await smartFetch(pageUrl, { timeout: 20000 });
        if (!nextRes.success || !nextRes.body) break;
        $ = cheerio.load(nextRes.body);
      }

      // Primary: #content. Fallback: article.font_max (for older pages)
      const contentEl = $('#content').first().length
        ? $('#content').first()
        : $('article.font_max').first();

      if (!contentEl.length) break;

      const rawHtml = contentEl.html() || '';
      const lines = rawHtml
        .split(/<br\s*\/??>|\n+/)
        .map((l) => cheerio.load(l).text().trim())
        .map((l) => l.replace(/&emsp;/g, ''))
        .map((l) => l.replace(/第\([^)]*\)/g, ''))
        .filter((l) => l.length > 0 && !/^[\s第(）)]+$/i.test(l) && !/^\s*$/.test(l));

      allLines.push(...lines);

      const nextPageNum = pageNum + 1;
      const hasMore = $(`a[href$="_${nextPageNum}.html"]`).length > 0;
      if (!hasMore) break;
      pageNum++;
    }

    if (allLines.length === 0) {
      return { title, contentHtml: '<p>Chapter text was empty after parsing.</p>', rawText: '' };
    }

    const contentHtml = allLines.map((line) => `<p>${line}</p>`).join('\n');
    const rawText = allLines.join('\n\n');

    return { title, contentHtml, rawText };
  }
}
