import * as cheerio from 'cheerio';
import { PluginNovelItem } from './types';

export function isBookLink(href: string): boolean {
  if (!href) return false;
  const cleanHref = href.toLowerCase();
  if (cleanHref.includes('login') || cleanHref.includes('register') || cleanHref.includes('user') || cleanHref.includes('case')) {
    return false;
  }
  if (/\/\d+\/?$/.test(cleanHref)) return true;
  if (/\/book\/\d+\/?/i.test(cleanHref)) return true;
  if (/\/\d+_\d+\/?/.test(cleanHref)) return true;
  if (/\/read\/\d+\/?/i.test(cleanHref)) return true;
  if (/\/txt\/\d+/i.test(cleanHref)) return true;
  if (/\/\d+\/\d+\/?/.test(cleanHref)) return true;
  if (/\/info\/\d+/i.test(cleanHref)) return true;
  if (/\/sort\d+\/\d+/i.test(cleanHref)) return true;
  if (/\/b\/\d+/i.test(cleanHref)) return true;
  if (/\/d\/\d+/i.test(cleanHref)) return true;
  return false;
}

export function heuristicParseBooks(
  html: string,
  baseUrl: string,
  sourceId: string,
  sourceName: string
): PluginNovelItem[] {
  const $ = cheerio.load(html);
  const items: PluginNovelItem[] = [];
  const seenUrls = new Set<string>();

  const ignoreWords = ['首页', '书架', '登录', '注册', '阅读记录', '分类', '排行榜', '完本', '全本'];

  // Try container items first
  $('.bookbox, .result-item, .novellist li, .novellist tr, .book-list li, .mod-article li, .search-result-list li, #main li, table tr, .b_list li, .search_list li').each((_, el) => {
    const titleEl = $(el).find('a').first();
    const href = titleEl.attr('href');
    const title = titleEl.text().trim();

    if (href && title && isBookLink(href) && !ignoreWords.some((w) => title.includes(w))) {
      let fullUrl = href;
      if (!fullUrl.startsWith('http')) {
        fullUrl = new URL(href, baseUrl).toString();
      }

      if (!seenUrls.has(fullUrl)) {
        seenUrls.add(fullUrl);
        const cover = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
        let fullCover = cover;
        if (cover && !cover.startsWith('http')) {
          fullCover = new URL(cover, baseUrl).toString();
        }

        let author = $(el).find('.author, .s4, .s5, .b_author, td:nth-child(3)').text().trim();
        if (author) {
          author = author.replace(/作者[：:]/, '').trim();
        }

        items.push({
          id: Buffer.from(fullUrl).toString('base64url'),
          title,
          chineseTitle: title,
          url: fullUrl,
          cover: fullCover || undefined,
          author: author || undefined,
          sourceId,
          sourceName,
        });
      }
    }
  });

  // Fallback: search all links in main body
  if (items.length < 2) {
    const mainEl = $('#main, .main, #content, .content, .wrap, body');
    mainEl.find('a').each((_, el) => {
      const href = $(el).attr('href');
      const title = $(el).text().trim();

      if (href && title && title.length >= 2 && title.length <= 60 && isBookLink(href)) {
        if (ignoreWords.some((w) => title.includes(w))) return;

        let fullUrl = href;
        if (!fullUrl.startsWith('http')) {
          fullUrl = new URL(href, baseUrl).toString();
        }

        if (!seenUrls.has(fullUrl)) {
          seenUrls.add(fullUrl);
          items.push({
            id: Buffer.from(fullUrl).toString('base64url'),
            title,
            chineseTitle: title,
            url: fullUrl,
            sourceId,
            sourceName,
          });
        }
      }
    });
  }

  // Direct page check: if searching led directly to a book detail page
  if (items.length === 0) {
    const pageTitle = $('div.booknav2 h1, h1.booktitle, .bname, .book-info h1, h1').first().text().trim();
    if (pageTitle && pageTitle.length >= 2 && !ignoreWords.some((w) => pageTitle.includes(w))) {
      const pageAuthor = $('.author, .bauthor, .booknav2 p, #info p').first().text().replace(/作者[：:]/, '').trim();
      const pageCover = $('img.cover, .bookimg2 img, .book-img img, #fmimg img, .cover img').attr('src');
      let fullCover = pageCover;
      if (pageCover && !pageCover.startsWith('http')) {
        try {
          fullCover = new URL(pageCover, baseUrl).toString();
        } catch {
          fullCover = undefined;
        }
      }

      items.push({
        id: Buffer.from(baseUrl).toString('base64url'),
        title: pageTitle,
        chineseTitle: pageTitle,
        url: baseUrl,
        cover: fullCover || undefined,
        author: pageAuthor || undefined,
        sourceId,
        sourceName,
      });
    }
  }

  return items;
}
