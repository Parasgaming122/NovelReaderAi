import { NextRequest, NextResponse } from 'next/server';
import { pluginRegistry } from '@/lib/plugins/plugin-registry';
import { translateHtml } from '@/lib/translator';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const urlParam = searchParams.get('url') || '';
  const source = searchParams.get('source') || 'novel543';
  const translateParam = searchParams.get('translate') !== 'false';
  const targetLang = searchParams.get('lang') || 'en';

  if (!urlParam) {
    return NextResponse.json({
      success: false,
      error: 'Query parameter "url" is required.',
    });
  }

  try {
    const chapterUrl = urlParam.startsWith('http')
      ? urlParam
      : Buffer.from(urlParam, 'base64url').toString('utf-8');

    const result = await pluginRegistry.getChapterText(source, chapterUrl);
    if (!result || !result.contentHtml) {
      return NextResponse.json({
        success: false,
        error: 'Failed to retrieve chapter content.',
      });
    }

    let translatedHtml = result.contentHtml;
    if (translateParam) {
      translatedHtml = await translateHtml(result.contentHtml, 'zh-CN', targetLang);
    }

    return NextResponse.json({
      success: true,
      url: chapterUrl,
      title: result.title,
      rawHtml: result.contentHtml,
      translatedHtml,
      rawText: result.rawText,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Error loading chapter',
    });
  }
}
