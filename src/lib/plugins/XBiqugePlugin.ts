import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';

export class XBiqugePlugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'xbiquge',
    name: 'XBiquge (新笔趣阁)',
    baseUrl: 'https://www.xbiquge.info/',
    language: 'zh',
    version: '5.0.0',
    icon: 'https://www.xbiquge.info/favicon.ico',
    hasSearch: true,
    charset: 'UTF-8', // Verified live: UTF-8, NOT GBK
    description: 'High-speed Chinese web novel mirror. Search endpoint updated from wss.php to search.php after old endpoint went 502.',
  };

  private absUrl(href: string): string {
    if (!href) return '';
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) return 'https://www.xbiquge.info' + href;
    return 'https://www.xbiquge.info/' + href;
  }

  async getCatalogList(page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    // Homepage shows featured novels as <dl> elements
    const url = page === 1 ? 'https://www.xbiquge.info/' : `https://www.xbiquge.info/xquanben/${page}.html`;
    const res = await smartFetch(url);
    if (!res.success || !res.body) return { items: [], hasNext: false };

    const $ = cheerio.load(res.body);
    const items: PluginNovelItem[] = [];

    // Homepage/catalog uses <dl> elements (verified live: 12 <dl> items on homepage)
    $('dl').each((_, el) => {
      const titleEl = $(el).find('h3 a, dd a').first();
      const href = titleEl.attr('href');
      const title = titleEl.text().trim();
      const cover = $(el).find('dt a img').attr('src');

      if (title && href && href.startsWith('/') && !title.includes('首页') && title.length > 1) {
        items.push({
          id: Buffer.from(this.absUrl(href)).toString('base64url'),
          title,
          chineseTitle: title,
          url: this.absUrl(href),
          cover: cover ? this.absUrl(cover) : undefined,
          sourceId: this.info.id,
          sourceName: this.info.name,
        });
      }
    });

    return { items, hasNext: items.length > 0 };
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
    // Each <dl> contains: <dt><a href="..."><img></a></dt> and <dd><h3><a>TITLE</a></h3></dd>
    $('dl').each((_, el) => {
      const titleEl = $(el).find('dd h3 a').first();
      const href = titleEl.attr('href');
      const title = titleEl.text().trim();
      const cover = $(el).find('dt a img').attr('src');

      // Author is in dd.book_other > span (format: "作者：<span>NAME</span>")
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

    // NO heuristic fallback — return exactly what search results contain
    return { items, hasNext: false };
  }

  async getBookDetails(bookUrl: string): Promise<PluginNovelDetail | null> {
    const res = await smartFetch(bookUrl);
    if (!res.success || !res.body) return null;

    const $ = cheerio.load(res.body);
    const title = $('#info h1, .book-info h1, h1').first().text().trim();
    const cover = $('#fmimg img, .book-img img').attr('src');
    const author = $('#info p').first().text().replace(/作\s*者[：:]/, '').trim();
    const summary = $('#intro, .book-intro, #description').text().trim();

    const chapters: PluginChapterItem[] = [];
    $('#list dl dd a, .chapter-list li a').each((_, el) => {
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

    return {
      id: Buffer.from(bookUrl).toString('base64url'),
      title,
      chineseTitle: title,
      url: bookUrl,
      cover: cover ? this.absUrl(cover) : undefined,
      author: author || 'Unknown Author',
      summary,
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
    const title = $('.bookname h1, h1').first().text().trim();

    $('#content script, .bottem2, .con_top').remove();
    const contentEl = $('#content, .content, .text').first();

    if (!contentEl.length) {
      return { title, contentHtml: '<p>Chapter text was empty.</p>', rawText: '' };
    }

    const raw = contentEl.html() || '';
    const lines = raw.split(/<br\s*\/?>|\n+/).map((l) => cheerio.load(l).text().trim()).filter(Boolean);

    const contentHtml = lines.map((line) => `<p>${line}</p>`).join('');
    const rawText = lines.join('\n\n');

    return { title, contentHtml, rawText };
  }
}
