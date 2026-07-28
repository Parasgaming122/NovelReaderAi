import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';
import { heuristicParseBooks } from './helpers';

export class TimoTxtPlugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'timotxt',
    name: 'TimoTxt (提莫書屋)',
    baseUrl: 'https://www.timotxt.com/',
    language: 'zh',
    version: '4.0.0',
    icon: 'https://i1.timotxt.com/images/timo.png',
    hasSearch: true,
    charset: 'UTF-8',
    description: 'Premier Chinese Light Novel repository featuring high quality formatting and image CDN.',
  };

  private IMAGE_CDN = 'https://i1.timotxt.com';

  private absUrl(href: string): string {
    if (!href) return '';
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) return 'https://www.timotxt.com' + href;
    return 'https://www.timotxt.com/' + href;
  }

  private fixCoverUrl(cover?: string): string | undefined {
    if (!cover) return undefined;
    if (!cover.startsWith('http')) {
      return this.IMAGE_CDN + (cover.startsWith('/') ? '' : '/') + cover;
    }
    return cover;
  }

  async getCatalogList(page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const url = `https://www.timotxt.com/`;
    const res = await smartFetch(url);
    if (!res.success || !res.body) return { items: [], hasNext: false };

    const $ = cheerio.load(res.body);
    const items: PluginNovelItem[] = [];

    $('section.mt-3 ul.list.flex > li, ul.list.flex.one.two-700 > li, ul.news > li, .book-list li').each((_, el) => {
      const link = $(el).find('h3 a[href], a[href]').first();
      const href = link.attr('href');
      const title = link.text().trim();
      let cover = $(el).find('img[src]').attr('src');

      if (title && href) {
        items.push({
          id: Buffer.from(this.absUrl(href)).toString('base64url'),
          title,
          chineseTitle: title,
          url: this.absUrl(href),
          cover: this.fixCoverUrl(cover),
          sourceId: this.info.id,
          sourceName: this.info.name,
        });
      }
    });

    return { items, hasNext: items.length > 0 };
  }

  async getCatalogSearch(query: string, page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    let searchUrl = `https://www.timotxt.com/search/${encodeURIComponent(query)}`;
    let res = await smartFetch(searchUrl);

    if (!res.success || !res.body || !res.body.includes('href=')) {
      searchUrl = `https://www.timotxt.com/s?q=${encodeURIComponent(query)}`;
      res = await smartFetch(searchUrl);
    }

    if (!res.success || !res.body) return { items: [], hasNext: false };

    const $ = cheerio.load(res.body);
    const items: PluginNovelItem[] = [];

    $('ul.list.flex > li, ul.list > li, .search-results li').each((_, el) => {
      const link = $(el).find('h3 a[href], a[href]').first();
      const href = link.attr('href');
      const title = link.text().trim();
      const cover = $(el).find('img[src]').attr('src');

      if (title && href) {
        items.push({
          id: Buffer.from(this.absUrl(href)).toString('base64url'),
          title,
          chineseTitle: title,
          url: this.absUrl(href),
          cover: this.fixCoverUrl(cover),
          sourceId: this.info.id,
          sourceName: this.info.name,
        });
      }
    });

    if (items.length === 0) {
      const targetUrl = res.url || searchUrl || 'https://www.timotxt.com/';
      const parsed = heuristicParseBooks(res.body, targetUrl, this.info.id, this.info.name);
      return { items: parsed, hasNext: false };
    }

    return { items, hasNext: false };
  }

  async getBookDetails(bookUrl: string): Promise<PluginNovelDetail | null> {
    const dirUrl = bookUrl.endsWith('/') ? bookUrl + 'dir' : bookUrl + '/dir';
    let res = await smartFetch(dirUrl);
    if (!res.success || !res.body) {
      res = await smartFetch(bookUrl);
    }
    if (!res.success || !res.body) return null;

    const $ = cheerio.load(res.body);
    const title = $('meta[property="og:title"]').attr('content') || $('h1.title.is-2, h1.title, h1').first().text().trim();
    let cover = $('meta[property="og:image"]').attr('content') || $('.cover img, img.book-cover').attr('src');
    const summary = $('meta[name="description"]').attr('content') || $('.intro, .description').text().trim();
    const author = $('.author').text().replace(/作者[：:]/, '').trim();

    const chapters: PluginChapterItem[] = [];
    $('div.chaplist ul.all li a, ul.all li a, .chaplist li a').each((_, el) => {
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
      cover: this.fixCoverUrl(cover),
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
      return { contentHtml: '<p>Failed to load chapter content from TimoTxt.</p>', rawText: '' };
    }

    const $ = cheerio.load(res.body);
    const title = $('h1.imgtext, h1.chapter-title, h1').first().text().trim();

    $('.gadBlock, .adBlock, script, ins, style').remove();
    const contentEl = $('div.chapter-content div.content, div.content, #chapterContent').first();

    if (!contentEl.length) {
      return { title, contentHtml: '<p>Empty chapter content.</p>', rawText: '' };
    }

    const paragraphs: string[] = [];
    contentEl.find('p').each((_, el) => {
      const pText = $(el).text().trim();
      if (pText && !pText.includes('提莫書屋') && !pText.includes('手機用戶')) {
        paragraphs.push(pText);
      }
    });

    if (paragraphs.length === 0) {
      const raw = contentEl.text();
      raw.split(/\n+/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.includes('提莫書屋') && !trimmed.includes('手機用戶')) {
          paragraphs.push(trimmed);
        }
      });
    }

    const contentHtml = paragraphs.map((p) => `<p>${p}</p>`).join('');
    const rawText = paragraphs.join('\n\n');

    return { title, contentHtml, rawText };
  }
}
