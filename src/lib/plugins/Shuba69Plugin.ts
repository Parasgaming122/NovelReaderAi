import * as cheerio from 'cheerio';
import { smartFetch, encodeGBKComponent } from '@/lib/bypasser';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';
import { heuristicParseBooks } from './helpers';

export class Shuba69Plugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'shuba69',
    name: '69shuba (69書吧)',
    baseUrl: 'https://www.69shuba.com/',
    language: 'zh',
    version: '3.1.0',
    icon: 'https://www.69shuba.com/favicon.ico',
    hasSearch: true,
    charset: 'GBK',
    description: 'Extensive web novel database with high speed updating and comprehensive web catalog.',
  };

  private absUrl(href: string): string {
    if (!href) return '';
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) return 'https://www.69shuba.com' + href;
    return 'https://www.69shuba.com/' + href;
  }

  async getCatalogList(page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const url = `https://www.69shuba.com/novels/monthvisit_0_0_${page}.htm`;
    const res = await smartFetch(url, { charset: 'GBK' });
    if (!res.success || !res.body) return { items: [], hasNext: false };

    const $ = cheerio.load(res.body);
    const items: PluginNovelItem[] = [];

    $('ul#article_list_content li, .newbox ul li').each((_, el) => {
      const titleEl = $(el).find('div.newnav h3 a, h3 a').first();
      const href = titleEl.attr('href');
      const title = titleEl.text().trim();
      const cover = $(el).find('a.imgbox img').attr('data-src') || $(el).find('img').attr('src');
      const author = $(el).find('.label, .author').text().trim();

      if (title && href) {
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

    return { items, hasNext: items.length > 0 };
  }

  async getCatalogSearch(query: string, page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const gbkQuery = encodeGBKComponent(query);
    
    // Primary: POST search request on 69shuba with GBK body
    let res = await smartFetch('https://www.69shuba.com/modules/article/search.php', {
      method: 'POST',
      body: `searchkey=${gbkQuery}&searchtype=all&page=${page}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://www.69shuba.com/',
      },
      charset: 'GBK',
    });

    // Fallback: GET search request
    if (!res.success || !res.body || !res.body.includes('href=')) {
      const searchUrl = `https://www.69shuba.com/modules/article/search.php?searchkey=${gbkQuery}&searchtype=all`;
      res = await smartFetch(searchUrl, { charset: 'GBK' });
    }

    if (!res.success || !res.body) return { items: [], hasNext: false };

    const $ = cheerio.load(res.body);
    const items: PluginNovelItem[] = [];

    $('div.newbox ul li, ul#article_list_content li, .newnav li, .box ul li').each((_, el) => {
      const titleEl = $(el).find('h3 a, div.newnav h3 a, a.title').first();
      const href = titleEl.attr('href');
      const title = titleEl.text().trim();
      const cover = $(el).find('a.imgbox img').attr('data-src') || $(el).find('img').attr('src');
      const author = $(el).find('.label, .author, .labelbox').text().trim();

      if (title && href) {
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
      const targetUrl = res.url || 'https://www.69shuba.com/';
      const parsed = heuristicParseBooks(res.body, targetUrl, this.info.id, this.info.name);
      return { items: parsed, hasNext: false };
    }

    return { items, hasNext: false };
  }

  async getBookDetails(bookUrl: string): Promise<PluginNovelDetail | null> {
    const bookId = bookUrl.match(/\/(\d+)\.htm$/)?.[1];
    let catalogUrl = bookUrl;
    if (bookId) {
      catalogUrl = `https://www.69shuba.com/${bookId}/`;
    }

    const res = await smartFetch(catalogUrl, { charset: 'GBK' });
    if (!res.success || !res.body) return null;

    const $ = cheerio.load(res.body);
    const title = $('div.booknav2 h1 a, h1').first().text().trim();
    const cover = $('div.bookimg2 img, .cover img').attr('src');
    const author = $('div.booknav2 .author, .booknav2 p').first().text().replace(/作者[：:]/, '').trim();
    const summary = $('div.navtxt, .intro').text().trim();

    const chapters: PluginChapterItem[] = [];
    const elements = $('div#catalog ul li a');
    
    // 69shuba chapter list is often descending, reverse if needed
    elements.each((_, el) => {
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
      return { contentHtml: '<p>Failed to retrieve chapter from 69shuba.</p>', rawText: '' };
    }

    const $ = cheerio.load(res.body);
    const title = $('h1.hide-720, h1').first().text().trim();

    $('h1, .txtinfo, .bottom-ad, .bottem2, script, style, .visible-xs').remove();
    const contentEl = $('div.txtnav').first();

    if (!contentEl.length) {
      return { title, contentHtml: '<p>Chapter text empty.</p>', rawText: '' };
    }

    const paragraphs: string[] = [];
    contentEl.contents().each((_, node) => {
      if (node.type === 'text') {
        const text = $(node).text().trim();
        if (text && !text.includes('69shuba') && !text.includes('69書吧')) {
          paragraphs.push(text);
        }
      }
    });

    if (paragraphs.length === 0) {
      const raw = contentEl.text();
      raw.split(/\n+/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.includes('69shuba') && !trimmed.includes('69書吧')) {
          paragraphs.push(trimmed);
        }
      });
    }

    const contentHtml = paragraphs.map((p) => `<p>${p}</p>`).join('');
    const rawText = paragraphs.join('\n\n');

    return { title, contentHtml, rawText };
  }
}
