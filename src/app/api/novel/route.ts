import { NextRequest, NextResponse } from 'next/server';
import { pluginRegistry } from '@/lib/plugins/plugin-registry';
import { translateNovelDetail, translateBatchTexts } from '@/lib/translator';

const FEATURED_URL_MAP: Record<string, string> = {
  'novel543-1001': 'https://www.novel543.com/0_1/',
  'timotxt-2002': 'https://www.timotxt.com/txt/2002.html',
  'shuba69-3003': 'https://www.69shuba.pro/txt/3003.html',
  'biquge5200-4004': 'https://www.biquge5200.cc/0_4004/',
  'xbiquge-5005': 'https://www.xbiquge.info/0_5005/',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const urlParam = searchParams.get('url') || '';
  const source = searchParams.get('source') || 'novel543';

  if (!urlParam) {
    return NextResponse.json({
      success: false,
      error: 'Query parameter "url" is required.',
    });
  }

  try {
    let targetUrl = FEATURED_URL_MAP[urlParam] || urlParam;

    if (!targetUrl.startsWith('http')) {
      try {
        const decoded = Buffer.from(urlParam, 'base64url').toString('utf-8');
        if (decoded.startsWith('http')) {
          targetUrl = decoded;
        }
      } catch (e) {
        // Ignore decode error
      }
    }

    let detail = await pluginRegistry.getBookDetails(source, targetUrl);

    // Fallback if null, try default plugin or domain plugin
    if (!detail) {
      detail = await pluginRegistry.getBookDetails('novel543', targetUrl);
    }

    if (!detail) {
      return NextResponse.json({
        success: false,
        error: 'Unable to fetch novel details from source.',
      });
    }

    // Translate novel title, author, and summary into English
    const translatedDetail = await translateNovelDetail(detail);

    // Optionally translate chapter titles if chapter count <= 100 for fast response
    if (translatedDetail.chapters && translatedDetail.chapters.length > 0) {
      const chapterTitles = translatedDetail.chapters.slice(0, 100).map((c) => c.title);
      const translatedChTitles = await translateBatchTexts(chapterTitles);
      translatedDetail.chapters = translatedDetail.chapters.map((c, i) => ({
        ...c,
        title: translatedChTitles[i] || c.title,
        originalTitle: c.title,
      }));
    }

    return NextResponse.json({
      success: true,
      novel: translatedDetail,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Error fetching novel details',
    });
  }
}
