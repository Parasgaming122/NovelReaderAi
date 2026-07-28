import * as cheerio from 'cheerio';
import { PluginNovelItem } from './types';

export function isBookLink(href: string): boolean {
  if (!href) return false;
  const cleanHref = href.toLowerCase().trim();
  if (
    cleanHref.includes('login') ||
    cleanHref.includes('register') ||
    cleanHref.includes('user') ||
    cleanHref.includes('case') ||
    cleanHref.includes('history') ||
    cleanHref.includes('sort') && !cleanHref.includes('/sort/')
  ) {
    return false;
  }

  // 1. Exclude chapter links (e.g. /123/456.html or /read/123/456)
  if (/\/\d+\/\d+\.html/i.test(cleanHref)) return false;
  if (/\/\d+_\d+\.html/i.test(cleanHref)) return false;
  if (/\/read\/\d+\/\d+/i.test(cleanHref)) return false;

  // 2. Exclude homepage or static pages
  if (cleanHref === '/' || cleanHref === '' || cleanHref.endsWith('index.html') || cleanHref.endsWith('index.php')) {
    return false;
  }

  // 3. Valid book detail URL patterns
  if (/\/book\/\d+\/?/i.test(cleanHref)) return true;
  if (/\/txt\/\d+/i.test(cleanHref)) return true;
  if (/\/info\/\d+/i.test(cleanHref)) return true;
  if (/\/b\/\d+/i.test(cleanHref)) return true;
  if (/\/d\/\d+/i.test(cleanHref)) return true;
  if (/\/\d{4,}\/?$/.test(cleanHref)) return true;
  if (/\/\d+_\d+\/?$/.test(cleanHref)) return true;
  if (/\/\d+\.htm$/i.test(cleanHref)) return true;

  return false;
}

export function heuristicParseBooks(
  html: string,
  targetUrl: string,
  sourceId: string,
  sourceName: string
): PluginNovelItem[] {
  const $ = cheerio.load(html);
  const items: PluginNovelItem[] = [];
  const seenUrls = new Set<string>();

  // Safety net: If targetUrl is the homepage, search failed or redirected to root home.
  // Do NOT parse homepage popular books as search results.
  const cleanTargetUrl = targetUrl.replace(/\/$/, '').toLowerCase();
  const rootDomains = [
    'https://www.69shuba.com',
    'https://69shuba.com',
    'https://www.xbiquge.info',
    'https://xbiquge.info',
    'https://www.novel543.com',
    'https://novel543.com',
    'https://www.timotxt.com',
    'https://timotxt.com',
    'https://ixdzs8.com',
    'https://www.ixdzs8.com',
  ];
  if (rootDomains.includes(cleanTargetUrl)) {
    return [];
  }

  const ignoreWords = ['首页', '书架', '登录', '注册', '阅读记录', '分类', '排行榜', '完本', '全本'];

  // Check if we arrived directly on a book detail page (e.g. exact title match redirect)
  const pageTitle = $('div.booknav2 h1, h1.booktitle, .bname, .book-info h1, #info h1, h1').first().text().trim();
  const isDetailPage =
    targetUrl.includes('/book/') ||
    targetUrl.includes('/txt/') ||
    /\/\d+\/?$/.test(targetUrl) ||
    /\/\d+\.htm$/.test(targetUrl);

  if (
    isDetailPage &&
    pageTitle &&
    pageTitle.length >= 2 &&
    !ignoreWords.some((w) => pageTitle.includes(w))
  ) {
    const pageAuthor = $('.author, .bauthor, .booknav2 p, #info p')
      .first()
      .text()
      .replace(/作者[：:]/, '')
      .trim();
    const pageCover = $('img.cover, .bookimg2 img, .book-img img, #fmimg img, .cover img').attr('src');
    let fullCover = pageCover;
    if (pageCover && !pageCover.startsWith('http')) {
      try {
        fullCover = new URL(pageCover, targetUrl).toString();
      } catch {
        fullCover = undefined;
      }
    }

    return [
      {
        id: Buffer.from(targetUrl).toString('base64url'),
        title: pageTitle,
        chineseTitle: pageTitle,
        url: targetUrl,
        cover: fullCover || undefined,
        author: pageAuthor || undefined,
        sourceId,
        sourceName,
      },
    ];
  }

  // Try container items first
  $('.bookbox, .result-item, .novellist li, .novellist tr, .book-list li, .mod-article li, .search-result-list li, #main li, table tr, .b_list li, .search_list li, .newbox li, #article_list_content li').each((_, el) => {
    const titleEl = $(el).find('h3 a, .bookname a, a.b_name, a.title, td.odd a, td:first-child a, a').first();
    const href = titleEl.attr('href');
    const title = titleEl.text().trim();

    if (href && title && isBookLink(href) && !ignoreWords.some((w) => title.includes(w))) {
      let fullUrl = href;
      if (!fullUrl.startsWith('http')) {
        try {
          fullUrl = new URL(href, targetUrl).toString();
        } catch {
          return;
        }
      }

      if (!seenUrls.has(fullUrl)) {
        seenUrls.add(fullUrl);
        const cover = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
        let fullCover = cover;
        if (cover && !cover.startsWith('http')) {
          try {
            fullCover = new URL(cover, targetUrl).toString();
          } catch {
            fullCover = undefined;
          }
        }

        let author = $(el).find('.author, .s4, .s5, .b_author, .label, td:nth-child(3)').text().trim();
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

  return items;
}

