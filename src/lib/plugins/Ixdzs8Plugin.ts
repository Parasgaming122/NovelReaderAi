import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';
import { heuristicParseBooks } from './helpers';

export class Ixdzs8Plugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'ixdzs8',
    name: 'Aixdzs (爱下电子书)',
    baseUrl: 'https://ixdzs8.com/',
    language: 'zh',
    version: '1.0.0',
    icon: 'https://ixdzs8.com/favicon.ico',
    hasSearch: true,
    charset: 'UTF-8',
    description: 'Popular digital web novel repository with comprehensive text downloads & chapters.',
  };

  private absUrl(href: string): string {
    if (!href) return '';
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) return 'https://ixdzs8.com' + href;
    return 'https://ixdzs8.com/' + href;
  }

  async getCatalogList(page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const url = page === 1 ? 'https://ixdzs8.com/sort/0/' : `https://ixdzs8.com/sort/0/p${page}.html`;
    const res = await smartFetch(url);
    if (!res.success || !res.body) return { items: [], hasNext: false };

    const $ = cheerio.load(res.body);
    const items: PluginNovelItem[] = [];

    $('.b_list li, .read_list li, .novel_list li, .book_list li, .list-group-item').each((_, el) => {
      const titleEl = $(el).find('a.b_name, h2 a, h3 a, a.title').first();
      const href = titleEl.attr('href');
      const title = titleEl.text().trim();
      const cover = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
      const author = $(el).find('.author, .b_author, .writer').text().replace(/作者[：:]/, '').trim();
      const summary = $(el).find('.intro, .b_intro, .desc').text().trim();

      if (title && href) {
        items.push({
          id: Buffer.from(this.absUrl(href)).toString('base64url'),
          title,
          chineseTitle: title,
          url: this.absUrl(href),
          cover: cover ? this.absUrl(cover) : undefined,
          author: author || undefined,
          summary: summary || undefined,
          sourceId: this.info.id,
          sourceName: this.info.name,
        });
      }
    });

    // Fallback if list structure is different
    if (items.length === 0) {
      $('a[href*="/read/"], a[href*="/d/"]').each((_, el) => {
        const title = $(el).text().trim();
        const href = $(el).attr('href');
        if (title && href && title.length > 1 && title.length < 40 && !title.includes('首页') && !title.includes('目录')) {
          items.push({
            id: Buffer.from(this.absUrl(href)).toString('base64url'),
            title,
            chineseTitle: title,
            url: this.absUrl(href),
            sourceId: this.info.id,
            sourceName: this.info.name,
          });
        }
      });
    }

    return { items, hasNext: items.length > 0 };
  }

  async getCatalogSearch(query: string, page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    let searchUrl = `https://ixdzs8.com/bsearch?q=${encodeURIComponent(query)}`;
    let res = await smartFetch(searchUrl);

    if (!res.success || !res.body || !res.body.includes('href=')) {
      searchUrl = `https://ixdzs8.com/b/search?q=${encodeURIComponent(query)}`;
      res = await smartFetch(searchUrl);
    }

    if (!res.success || !res.body || !res.body.includes('href=')) {
      searchUrl = `https://ixdzs8.com/search?searchkey=${encodeURIComponent(query)}`;
      res = await smartFetch(searchUrl);
    }

    if (!res.success || !res.body || !res.body.includes('href=')) {
      searchUrl = `https://ixdzs8.com/search?q=${encodeURIComponent(query)}`;
      res = await smartFetch(searchUrl);
    }

    if (!res.success || !res.body) return { items: [], hasNext: false };

    const $ = cheerio.load(res.body);
    const items: PluginNovelItem[] = [];

    $('.b_list li, .search_list li, .book_list li, .result_list li, ul li').each((_, el) => {
      const titleEl = $(el).find('a.b_name, h2 a, h3.bname a, h3 a, a.title, a').first();
      const href = titleEl.attr('href');
      const title = titleEl.text().trim();
      const cover = $(el).find('img').attr('src');
      const author = $(el).find('.author, .b_author, .bauthor a').text().replace(/作者[：:]/, '').trim();

      if (title && href && (href.includes('/read/') || href.includes('/d/') || href.includes('/b/'))) {
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
      const targetUrl = res.url || searchUrl || 'https://ixdzs8.com/';
      const parsed = heuristicParseBooks(res.body, targetUrl, this.info.id, this.info.name);
      return { items: parsed, hasNext: false };
    }

    return { items, hasNext: false };
  }

  async getBookDetails(bookUrl: string): Promise<PluginNovelDetail | null> {
    const res = await smartFetch(bookUrl);
    if (!res.success || !res.body) return null;

    const $ = cheerio.load(res.body);
    const title = $('.read_info h1, .d_info h1, .novel_info h1, h1').first().text().trim();
    const cover = $('.read_img img, .d_img img, .cover img, img').first().attr('src');
    const author = $('.read_info .author, .d_info .author, .author').first().text().replace(/作者[：:]/, '').trim();
    const summary = $('.read_intro, .intro, .description, #intro').text().trim();

    const chapters: PluginChapterItem[] = [];
    $('ul.cl_list li a, .read_list a, .chapter-list a, .d_a li a, a[href*="/p"]').each((_, el) => {
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
    const title = $('.read_title h1, h1.chapter-title, h1').first().text().trim();

    $('.content script, .read_content script, .p_text script, style').remove();
    const contentEl = $('.content, .read_content, .p_text, #content').first();

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
