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

    // Translate ALL chapter titles in batches of 200
    if (translatedDetail.chapters && translatedDetail.chapters.length > 0) {
      const BATCH_SIZE = 200;
      const allChapters = translatedDetail.chapters;
      const translatedTitles: string[] = new Array(allChapters.length);

      for (let i = 0; i < allChapters.length; i += BATCH_SIZE) {
        const batch = allChapters.slice(i, i + BATCH_SIZE).map((c) => c.title);
        const translatedBatch = await translateBatchTexts(batch);
        for (let j = 0; j < translatedBatch.length; j++) {
          translatedTitles[i + j] = translatedBatch[j] || allChapters[i + j].title;
        }
      }

      translatedDetail.chapters = allChapters.map((c, i) => ({
        ...c,
        title: translatedTitles[i] || c.title,
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
