import * as cheerio from 'cheerio';
import { smartFetch, encodeGBKComponent } from '@/lib/bypasser';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';
import { heuristicParseBooks } from './helpers';

export class XBiqugePlugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'xbiquge',
    name: 'XBiquge (新笔趣阁)',
    baseUrl: 'https://www.xbiquge.info/',
    language: 'zh',
    version: '2.0.0',
    icon: 'https://www.xbiquge.info/favicon.ico',
    hasSearch: true,
    charset: 'GBK',
    description: 'High-speed Chinese web novel mirror provider with full chapter coverage.',
  };

  private absUrl(href: string): string {
    if (!href) return '';
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) return 'https://www.xbiquge.info' + href;
    return 'https://www.xbiquge.info/' + href;
  }

  async getCatalogList(page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const url = page === 1 ? 'https://www.xbiquge.info/xquanben/' : `https://www.xbiquge.info/xquanben/${page}.html`;

    const res = await smartFetch(url, { charset: 'GBK' });
    if (!res.success || !res.body) return { items: [], hasNext: false };

    const $ = cheerio.load(res.body);
    const items: PluginNovelItem[] = [];

    $('.novellist li, .result-list li, #content li, .box_con li').each((_, el) => {
      const titleEl = $(el).find('a').first();
      const href = titleEl.attr('href');
      const title = titleEl.text().trim();
      const author = $(el).find('a').eq(1).text().trim() || $(el).find('.s4, .s5').text().trim();

      if (title && href && (href.includes('/0_') || href.includes('/book/') || href.endsWith('/'))) {
        items.push({
          id: Buffer.from(this.absUrl(href)).toString('base64url'),
          title,
          chineseTitle: title,
          url: this.absUrl(href),
          author: author || undefined,
          sourceId: this.info.id,
          sourceName: this.info.name,
        });
      }
    });

    return { items, hasNext: items.length > 0 };
  }

  async getCatalogSearch(query: string, page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const gbkQuery = encodeGBKComponent(query);
    
    // Attempt 1: UTF-8 GET /search.php?q=
    let searchUrl = `https://www.xbiquge.info/search.php?q=${encodeURIComponent(query)}`;
    let res = await smartFetch(searchUrl);

    // Attempt 2: POST form search on xbiquge.info
    if (!res.success || !res.body || !res.body.includes('href=')) {
      res = await smartFetch('https://www.xbiquge.info/modules/article/search.php', {
        method: 'POST',
        body: `searchkey=${gbkQuery}&searchtype=all`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://www.xbiquge.info/',
        },
        charset: 'GBK',
      });
    }

    // Attempt 3: GET search.php on xbiquge.info with GBK
    if (!res.success || !res.body || !res.body.includes('href=')) {
      res = await smartFetch(`https://www.xbiquge.info/search.php?q=${gbkQuery}`, {
        charset: 'GBK',
        headers: { 'Referer': 'https://www.xbiquge.info/' },
      });
    }

    // Attempt 4: GET wss.php on xbiquge.info
    if (!res.success || !res.body || !res.body.includes('href=')) {
      res = await smartFetch(`https://www.xbiquge.info/modules/article/wss.php?keyword=${gbkQuery}`, {
        charset: 'GBK',
      });
    }

    if (!res.success || !res.body) return { items: [], hasNext: false };

    const $ = cheerio.load(res.body);
    const items: PluginNovelItem[] = [];

    $('.result-list li, .novellist li, .result-item, #main li, table tr, .box_con li, #newscontent li, .grid tr, .result-game-item').each((_, el) => {
      const titleEl = $(el).find('a:first-child, h2 a, .bookname a, td:first-child a, td.odd a, .result-game-item-title-link').first();
      const href = titleEl.attr('href');
      const title = titleEl.text().trim();
      const author = $(el).find('td:nth-child(3), .author, .s4, .s5, .result-game-item-info-tag span').text().trim();
      const cover = $(el).find('img').attr('src');

      if (title && href && title.length > 0 && !title.includes('首页') && !title.includes('书架')) {
        items.push({
          id: Buffer.from(this.absUrl(href)).toString('base64url'),
          title,
          chineseTitle: title,
          url: this.absUrl(href),
          cover: cover ? this.absUrl(cover) : undefined,
          author: author || undefined,
          sourceId: this.info.id,
          sourceName: this.info.name,
        });
      }
    });

    if (items.length === 0) {
      const targetUrl = res.url || 'https://www.xbiquge.info/';
      const parsed = heuristicParseBooks(res.body, targetUrl, this.info.id, this.info.name);
      return { items: parsed, hasNext: false };
    }

    return { items, hasNext: false };
  }

  async getBookDetails(bookUrl: string): Promise<PluginNovelDetail | null> {
    const res = await smartFetch(bookUrl, { charset: 'GBK' });
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
    const res = await smartFetch(chapterUrl, { charset: 'GBK' });
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
