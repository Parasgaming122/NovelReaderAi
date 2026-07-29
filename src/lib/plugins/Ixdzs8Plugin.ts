import * as cheerio from 'cheerio';
import { smartFetch } from '@/lib/bypasser';
import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail, PluginChapterItem } from './types';

export class Ixdzs8Plugin implements NovelSourcePlugin {
  public info: PluginSourceInfo = {
    id: 'ixdzs8',
    name: 'Aixdzs (爱下电子书)',
    baseUrl: 'https://ixdzs8.com/',
    language: 'zh',
    version: '6.0.0',
    icon: 'https://ixdzs8.com/favicon.ico',
    hasSearch: true,
    charset: 'UTF-8',
    description: 'Popular digital web novel repository. Search & catalog fully accessible. Chapters loaded via AJAX API.',
    blocked: false,
    blockedReason: '',
    cfBlockLevel: 'none',
    cfStatus: 'No Cloudflare — fully accessible via smartFetch',
    recommendedBypassMethods: ['smartFetch'],
    availableBypassMethods: ['smartFetch', 'impit'],
  };

  private absUrl(href: string): string {
    if (!href) return '';
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) return 'https://ixdzs8.com' + href;
    return 'https://ixdzs8.com/' + href;
  }

  /**
   * Extract the book ID (bid) from a book URL.
   * URL format: /read/{bid}/ or /read/{bid}/index.html
   */
  private extractBookId(bookUrl: string): string | null {
    const match = bookUrl.match(/\/read\/(\d+)/);
    return match ? match[1] : null;
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
    // GET /bsearch?q= (verified live: returns results with li.burl)
    const searchUrl = `https://ixdzs8.com/bsearch?q=${encodeURIComponent(query)}`;
    const res = await smartFetch(searchUrl, {
      headers: { 'Referer': 'https://ixdzs8.com/' },
    });

    if (!res.success || !res.body) return { items: [], hasNext: false };

    const $ = cheerio.load(res.body);
    const items: PluginNovelItem[] = [];

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

    return { items, hasNext: false };
  }

  /**
   * Get book details including the FULL chapter list.
   * 
   * KEY FIX: ixdzs8 only shows ~8-9 preview chapters in the HTML (newest first, reverse order).
   * The full chapter list requires a separate AJAX call:
   *   POST /novel/clist/ with body {bid: <bookId>}
   * Returns JSON: {rs: 200, data: [{ordernum, title, ctype}, ...]}
   *   - ctype == 1: non-clickable item (promo/separator)
   *   - ctype != 1: clickable chapter, URL = /read/{bid}/p{ordernum}.html
   * 
   * Chapters are in ascending order (chapter 1 → latest).
   */
  async getBookDetails(bookUrl: string): Promise<PluginNovelDetail | null> {
    const res = await smartFetch(bookUrl);
    if (!res.success || !res.body) return null;

    const $ = cheerio.load(res.body);
    const title = $('h1.bname, h1.title, .d_info h1, h1').first().text().trim();
    const cover = $('.n-img img, .d_img img, img').first().attr('src');
    const author = $('.bauthor, .d_info .author, .author').first().text().replace(/作者[：:]/, '').trim();
    const summary = $('#intro, .intro, .description, p#intro').text().trim();

    const chapters: PluginChapterItem[] = [];
    const bid = this.extractBookId(bookUrl);

    if (bid) {
      // Use AJAX API to get the FULL chapter list
      try {
        const clistRes = await smartFetch('https://ixdzs8.com/novel/clist/', {
          method: 'POST',
          body: `bid=${bid}`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': bookUrl,
            'X-Requested-With': 'XMLHttpRequest',
          },
        });

        if (clistRes.success && clistRes.body) {
          // Try to parse as JSON first (AJAX endpoint returns JSON)
          try {
            const data = JSON.parse(clistRes.body);
            if (data.rs === 200 && Array.isArray(data.data)) {
              for (const item of data.data) {
                // Skip non-chapter items (ctype == 1 = separator/promo)
                if (item.ctype === 1) continue;
                
                const chTitle = (item.title || '').trim();
                const ordernum = item.ordernum;
                
                if (chTitle && ordernum !== undefined) {
                  const chapterUrl = `https://ixdzs8.com/read/${bid}/p${ordernum}.html`;
                  chapters.push({
                    id: Buffer.from(chapterUrl).toString('base64url'),
                    title: chTitle,
                    url: chapterUrl,
                  });
                }
              }
              console.log(`[Ixdzs8] Loaded ${chapters.length} chapters via AJAX for bid=${bid}`);
            }
          } catch {
            // If not JSON, fall back to HTML parsing below
            console.log('[Ixdzs8] AJAX response not JSON, falling back to HTML parsing');
          }
        }
      } catch (err) {
        console.error('[Ixdzs8] AJAX clist fetch failed:', err);
      }
    }

    // Fallback: parse preview chapters from HTML (only ~8-9 chapters, newest first)
    if (chapters.length === 0) {
      $('ul.cl_list li a, .chapter-list a, ul.u-chapter li a, a[href*="/p"]').each((_, el) => {
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
      // Reverse since HTML preview is newest-first, we want ascending
      chapters.reverse();
      console.log(`[Ixdzs8] Fallback: loaded ${chapters.length} preview chapters from HTML`);
    }

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
    let res = await smartFetch(chapterUrl, { timeout: 20000 });
    
    // Retry once with delay if first attempt fails or returns empty
    if (!res.success || !res.body) {
      await new Promise(r => setTimeout(r, 1500));
      res = await smartFetch(chapterUrl, { timeout: 20000 });
    }

    if (!res.success || !res.body) {
      return { contentHtml: '<p>Failed to retrieve chapter content.</p>', rawText: '' };
    }

    const $ = cheerio.load(res.body);
    const title = $('h1.chapter-title, h1').first().text().trim();

    // Remove ads, scripts, and noise
    $('.content script, .read_content script, .p_text script, style, ins, .ad, .gadBlock').remove();
    
    // Try multiple content selectors — ixdzs8 may use different ones
    const contentEl = $('.content, .read_content, .p_text, #content, #chaptercontent, .chapter-content, .txtnav').first();

    if (!contentEl.length) {
      // Last resort: try to find any element with substantial text
      const bodyText = $('body').text().trim();
      if (bodyText.length < 100) {
        return { title, contentHtml: '<p>Chapter text was empty.</p>', rawText: '' };
      }
      const lines = bodyText.split(/\n+/).map(l => l.trim()).filter(l => l.length > 5);
      const contentHtml = lines.map(line => `<p>${line}</p>`).join('');
      return { title, contentHtml, rawText: lines.join('\n\n') };
    }

    const raw = contentEl.html() || '';
    const lines = raw.split(/<br\s*\/?>|\n+/).map((l) => cheerio.load(l).text().trim()).filter(Boolean);

    if (lines.length === 0) {
      return { title, contentHtml: '<p>Chapter text was empty after parsing.</p>', rawText: '' };
    }

    const contentHtml = lines.map((line) => `<p>${line}</p>`).join('');
    const rawText = lines.join('\n\n');

    return { title, contentHtml, rawText };
  }
}
