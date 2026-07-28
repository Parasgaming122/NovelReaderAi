import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';
import { heuristicParseBooks } from './helpers';

export class Novel543Plugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'novel543',
    name: 'Novel543',
    baseUrl: 'https://www.novel543.com/',
    language: 'zh',
    version: '3.0.0',
    icon: 'https://www.novel543.com/favicon.ico',
    hasSearch: true,
    charset: 'UTF-8',
    description: 'Popular Chinese web novel collection with fast updates and clean chapter layouts.',
  };

  private absUrl(href: string): string {
    if (!href) return '';
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) return 'https://www.novel543.com' + href;
    return 'https://www.novel543.com/' + href;
  }

  async getCatalogList(page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const url = `https://www.novel543.com/bookstack/?page=${page}`;
    const res = await smartFetch(url);
    if (!res.success || !res.body) return { items: [], hasNext: false };

    const $ = cheerio.load(res.body);
    const items: PluginNovelItem[] = [];

    $('ul.list li.media, .book-list li').each((_, el) => {
      const titleEl = $(el).find('div.media-content h3 a, h3 a, h2 a').first();
      const href = titleEl.attr('href') || $(el).find('a').attr('href');
      const cover = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
      const author = $(el).find('.author, .meta span').first().text().trim();
      const title = titleEl.text().trim() || $(el).find('.title').text().trim();

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
    let searchUrl = `https://www.novel543.com/search/${encodeURIComponent(query)}`;
    let res = await smartFetch(searchUrl);

    if (!res.success || !res.body || !res.body.includes('media-content')) {
      searchUrl = `https://www.novel543.com/s?q=${encodeURIComponent(query)}`;
      res = await smartFetch(searchUrl);
    }

    if (!res.success || !res.body || !res.body.includes('media-content')) {
      searchUrl = `https://www.novel543.com/search?q=${encodeURIComponent(query)}`;
      res = await smartFetch(searchUrl);
    }

    if (!res.success || !res.body) return { items: [], hasNext: false };

    const $ = cheerio.load(res.body);
    const items: PluginNovelItem[] = [];

    $('ul.list li.media, .search-result li, .book-list li').each((_, el) => {
      const titleEl = $(el).find('div.media-content h3 a, h3 a, h2 a').first();
      const href = titleEl.attr('href') || $(el).find('a').attr('href');
      const cover = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
      const author = $(el).find('.author, .meta span').first().text().trim();
      const title = titleEl.text().trim();

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
      const targetUrl = res.url || searchUrl || 'https://www.novel543.com/';
      const parsed = heuristicParseBooks(res.body, targetUrl, this.info.id, this.info.name);
      return { items: parsed, hasNext: false };
    }

    return { items, hasNext: false };
  }

  async getBookDetails(bookUrl: string): Promise<PluginNovelDetail | null> {
    const res = await smartFetch(bookUrl);
    if (!res.success || !res.body) return null;

    const $ = cheerio.load(res.body);
    const title = $('h1.title, h1').first().text().trim() || $('meta[property="og:title"]').attr('content') || '';
    const cover = $('.cover img, img.cover').attr('src') || $('meta[property="og:image"]').attr('content');
    const author = $('.meta span, .author').first().text().replace(/作者[：:]/, '').trim();
    const summary = $('div.intro, .description').text().trim();

    // Fetch chapters from dir page or current page
    let dirUrl = bookUrl.replace(/\/$/, '') + '/dir';
    let dirRes = await smartFetch(dirUrl);
    if (!dirRes.success || !dirRes.body) {
      dirRes = res;
    }

    const $dir = cheerio.load(dirRes.body);
    const chapters: PluginChapterItem[] = [];

    $dir('ul.all li a, ul.chaplist li a, .chapter-list a').each((_, el) => {
      const chTitle = $dir(el).text().trim();
      const chHref = $dir(el).attr('href');
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
      return { contentHtml: '<p>Failed to load chapter content from source.</p>', rawText: '' };
    }

    const $ = cheerio.load(res.body);
    const title = $('h1.chapter-title, h1.title, h1').first().text().trim();

    $('.gadBlock, .adBlock, script, ins, style, .ad').remove();
    const contentEl = $('div.content, #chapterContent, .text-content').first();

    if (!contentEl.length) {
      return { title, contentHtml: '<p>Chapter content was empty or protected.</p>', rawText: '' };
    }

    const paragraphs: string[] = [];
    contentEl.find('p, br').each((_, el) => {
      if (el.tagName === 'p') {
        const t = $(el).text().trim();
        if (t) paragraphs.push(t);
      }
    });

    if (paragraphs.length === 0) {
      const text = contentEl.text();
      text.split(/\n+/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed) paragraphs.push(trimmed);
      });
    }

    const contentHtml = paragraphs.map((p) => `<p>${p}</p>`).join('');
    const rawText = paragraphs.join('\n\n');

    return { title, contentHtml, rawText };
  }
}
