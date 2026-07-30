import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';

export class XBiqugePlugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'xbiquge',
    name: 'XBiquge (新笔趣阁)',
    baseUrl: 'https://www.xbiquge.info/',
    language: 'zh',
    version: '8.0.0',
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
    // Homepage shows featured novels as <dl> elements, /list1/ to /list8/ are category pages
    const url = page === 1 ? 'https://www.xbiquge.info/' : `https://www.xbiquge.info/list${((page - 1) % 8) + 1}/`;
    const res = await smartFetch(url);
    if (!res.success || !res.body) return { items: [], hasNext: false };

    const $ = cheerio.load(res.body);
    const items: PluginNovelItem[] = [];

    // Verified live 2026-07-30: homepage and /listN/ use <dl> elements
    // Each <dl> has: <dt><a href="/{cat}/{id}/"><img></a></dt>, <dd><h3><a>TITLE</a></h3></dd>
    $('dl').each((_, el) => {
      const titleEl = $(el).find('dd h3 a').first();
      const href = titleEl.attr('href');
      const title = titleEl.text().trim();
      const cover = $(el).find('dt a img').attr('src');

      // Author is in dd.book_other (format: "作者：<span>NAME</span>")
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

    return { items, hasNext: true }; // Categories are paginated
  }

  async getCatalogSearch(query: string, page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    // CORRECT endpoint (verified live 2026-07-28):
    // GET /search.php?q={UTF8} — returns <dl> elements with search results
    // OLD endpoint /modules/article/wss.php?keyword= is DEAD (502 Bad Gateway)
    const searchUrl = `https://www.xbiquge.info/search.php?q=${encodeURIComponent(query)}`;
    const res = await smartFetch(searchUrl, {
      headers: { 'Referer': 'https://www.xbiquge.info/' },
    });

    if (!res.success || !res.body) return { items: [], hasNext: false };

    const $ = cheerio.load(res.body);
    const items: PluginNovelItem[] = [];

    // Verified live: search results use <dl> elements
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

    // Book page title format: "第二十二章 解决麻烦-《TITLE》" or just the book name
    let title = $('h1').first().text().trim();
    const bookTitleMatch = title.match(/《(.+?)》/);
    if (bookTitleMatch) {
      title = bookTitleMatch[1];
    }
    if (!title) return null;

    const cover = $('dl dt a img, .book_info img, img').first().attr('src');
    const summary = $('#intro, .intro, .description, .book-intro').first().text().trim();

    const chapters: PluginChapterItem[] = [];
    const bookPathMatch = bookUrl.match(/(\/\d+\/\d+)\/?$/);
    const bookPath = bookPathMatch ? bookPathMatch[1] : null;
    const seen = new Set<string>();

    if (bookPath) {
      // Find all chapter links matching /{num}/{num}/{num}.html pattern
      // Exclude _2.html, _3.html (pagination suffixes for multi-page chapters)
      $(`a[href^="${bookPath}/"][href$=".html"]`).each((_, el) => {
        const chTitle = $(el).text().trim();
        const chHref = $(el).attr('href');
        if (chTitle && chHref && !seen.has(chHref) && !/\_\d+\.html$/.test(chHref)) {
          seen.add(chHref);
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
      author: 'Unknown Author',
      summary,
      sourceId: this.info.id,
      sourceName: this.info.name,
      chapters,
    };
  }

  /**
   * Extract chapter text, handling multi-page chapters.
   * XBiquge splits long chapters across multiple pages:
   *   page 1: /8/8697/272602.html
   *   page 2: /8/8697/272602_2.html
   *   page 3: /8/8697/272602_3.html
   * Each page has content prefixed with "第(N/M)页" marker which we strip.
   */
  async getChapterText(chapterUrl: string): Promise<{ title?: string; contentHtml: string; rawText: string }> {
    // Fetch page 1
    let res = await smartFetch(chapterUrl, { timeout: 20000 });
    if (!res.success || !res.body) {
      return { contentHtml: '<p>Failed to retrieve chapter content.</p>', rawText: '' };
    }

    let $ = cheerio.load(res.body);
    // Title format: "第二十二章 解决麻烦-《TITLE》" — extract chapter name part
    const rawTitle = $('h1').first().text().trim();
    const titleMatch = rawTitle.match(/^(.+?)[—\-—]《/);
    const title = titleMatch ? titleMatch[1].trim() : rawTitle;

    const allLines: string[] = [];
    let pageNum = 1;
    const MAX_PAGES = 10; // Safety limit

    while (pageNum <= MAX_PAGES) {
      if (pageNum > 1) {
        // Construct next page URL: strip any existing _N.html suffix first
        // Handles both '12345.html' and '12345_1.html' base formats
        const baseUrl = chapterUrl.replace(/_\d+\.html$/, '.html').replace(/\.html$/, '');
        const pageUrl = `${baseUrl}_${pageNum}.html`;
        const nextRes = await smartFetch(pageUrl, { timeout: 20000 });
        if (!nextRes.success || !nextRes.body) break;
        $ = cheerio.load(nextRes.body);
      }

      // Content is in <article class="font_max"> — uses <br> separation, NOT <p> tags
      const contentEl = $('article.font_max').first();
      if (!contentEl.length) break;

      // Split by <br> tags and clean up
      const rawHtml = contentEl.html() || '';
      const lines = rawHtml
        .split(/<br\s*\/?>|\n+/)
        .map((l) => cheerio.load(l).text().trim())
        .map((l) => l.replace(/第\([^)]*\)/g, ''))  // Strip anti-scraping markers globally
        .filter((l) => l.length > 0 && !/^[\s第(）)]+$/i.test(l) && !/^\s*$/.test(l));

      allLines.push(...lines);

      // Check if there's a next page: look for _{next}.html link
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
