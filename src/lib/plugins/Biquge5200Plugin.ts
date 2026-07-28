import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';

export class Biquge5200Plugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'biquge5200',
    name: 'Biquge5200 (笔趣阁5200)',
    baseUrl: 'https://www.biquge5200.cc/',
    language: 'zh',
    version: '2.0.0',
    icon: 'https://www.biquge5200.cc/favicon.ico',
    hasSearch: true,
    charset: 'UTF-8',
    description: 'Classic Chinese web novel repository with massive catalog coverage.',
  };

  private absUrl(href: string): string {
    if (!href) return '';
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) return 'https://www.biquge5200.cc' + href;
    return 'https://www.biquge5200.cc/' + href;
  }

  async getCatalogList(page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    const url = `https://www.biquge5200.cc/sort/${page}/`;
    const res = await smartFetch(url);
    if (!res.success || !res.body) return { items: [], hasNext: false };

    const $ = cheerio.load(res.body);
    const items: PluginNovelItem[] = [];

    $('.book-list li, #main li, .news li').each((_, el) => {
      const titleEl = $(el).find('h2 a, h3 a, a.s2').first();
      const href = titleEl.attr('href');
      const title = titleEl.text().trim();
      const cover = $(el).find('img').attr('src');
      const author = $(el).find('.author, .s4').text().trim();

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
    const searchUrl = `https://www.biquge5200.cc/search.php?q=${encodeURIComponent(query)}`;
    const res = await smartFetch(searchUrl);
    if (!res.success || !res.body) return { items: [], hasNext: false };

    const $ = cheerio.load(res.body);
    const items: PluginNovelItem[] = [];

    $('.result-list li, .book-list li, .result-item').each((_, el) => {
      const titleEl = $(el).find('h2 a, h3 a, a.result-game-item-title-link').first();
      const href = titleEl.attr('href');
      const title = titleEl.text().trim();
      const cover = $(el).find('img').attr('src');

      if (title && href) {
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

    return { items, hasNext: false };
  }

  async getBookDetails(bookUrl: string): Promise<PluginNovelDetail | null> {
    const res = await smartFetch(bookUrl);
    if (!res.success || !res.body) return null;

    const $ = cheerio.load(res.body);
    const title = $('#info h1, h1.title, .info h1').first().text().trim();
    const cover = $('#fmimg img, .cover img, #fm img').attr('src');
    const author = $('#info p').first().text().replace(/作\s*者[：:]/, '').trim();
    const summary = $('#intro, .intro, #description').text().trim();

    const chapters: PluginChapterItem[] = [];
    $('#list dd a, #list a, .chapter-list a').each((_, el) => {
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

    $('#content script, #content div, #content p.read-inline').remove();
    const contentEl = $('#content, .content, #chaptercontent').first();

    if (!contentEl.length) {
      return { title, contentHtml: '<p>Chapter content was empty.</p>', rawText: '' };
    }

    const raw = contentEl.html() || '';
    const lines = raw.split(/<br\s*\/?>|\n+/).map((l) => cheerio.load(l).text().trim()).filter(Boolean);

    const contentHtml = lines.map((line) => `<p>${line}</p>`).join('');
    const rawText = lines.join('\n\n');

    return { title, contentHtml, rawText };
  }
}
