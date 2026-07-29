import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';

export class Ixdzs8Plugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'ixdzs8',
    name: 'Aixdzs (爱下电子书)',
    baseUrl: 'https://ixdzs8.com/',
    language: 'zh',
    version: '5.0.0',
    icon: 'https://ixdzs8.com/favicon.ico',
    hasSearch: true,
    charset: 'UTF-8',
    description: 'Popular digital web novel repository with comprehensive text downloads & chapters. Verified working: search uses li.burl class.',
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

    // Verified live: catalog uses li.burl with h3.bname > a
    $('li.burl').each((_, el) => {
      const titleEl = $(el).find('h3.bname a, h3 a').first();
      const href = titleEl.attr('href');
      const title = titleEl.text().trim();
      const cover = $(el).find('.l-img img').attr('src');
      const author = $(el).find('.bauthor a, .author').first().text().replace(/作者[：:]/, '').trim();
      const summary = $(el).find('.l-p2').text().trim();

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

    return { items, hasNext: items.length > 0 };
  }

  async getCatalogSearch(query: string, page = 1): Promise<{ items: PluginNovelItem[]; hasNext: boolean }> {
    // Single request: GET /bsearch?q= (verified live 2026-07-28, returns 20 results for "斗破苍穹")
    const searchUrl = `https://ixdzs8.com/bsearch?q=${encodeURIComponent(query)}`;
    const res = await smartFetch(searchUrl, {
      headers: { 'Referer': 'https://ixdzs8.com/' },
    });

    if (!res.success || !res.body) return { items: [], hasNext: false };

    const $ = cheerio.load(res.body);
    const items: PluginNovelItem[] = [];

    // Verified live: search results use li.burl (20 items found)
    // Each li.burl has: h3.bname > a for title, .bauthor a for author, .l-p2 for description
    $('li.burl').each((_, el) => {
      const titleEl = $(el).find('h3.bname a').first();
      const href = titleEl.attr('href');
      const title = titleEl.text().trim();
      const cover = $(el).find('.l-img img').attr('src');
      const author = $(el).find('.bauthor a').first().text().replace(/作者[：:]/, '').trim();
      const summary = $(el).find('.l-p2').text().trim();

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

    // NO heuristic fallback
    return { items, hasNext: false };
  }

  async getBookDetails(bookUrl: string): Promise<PluginNovelDetail | null> {
    const res = await smartFetch(bookUrl);
    if (!res.success || !res.body) return null;

    const $ = cheerio.load(res.body);
    const title = $('h1.bname, h1.title, .d_info h1, h1').first().text().trim();
    const cover = $('.n-img img, .d_img img, img').first().attr('src');
    const author = $('.bauthor, .d_info .author, .author').first().text().replace(/作者[：:]/, '').trim();
    const summary = $('#intro, .intro, .description, p#intro').text().trim();

    const chapters: PluginChapterItem[] = [];
    $('ul.cl_list li a, .chapter-list a, a[href*="/p"]').each((_, el) => {
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
    const title = $('h1.chapter-title, h1').first().text().trim();

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
