import { NextRequest, NextResponse } from 'next/server';
import { getChapterText } from '@/lib/novelapi-client';
import { translateHtml } from '@/lib/translator';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sourceId = req.nextUrl.searchParams.get('source') || '';
  const bookId = req.nextUrl.searchParams.get('bookId') || '';
  const chapterId = req.nextUrl.searchParams.get('chapterId') || '';
  const translate = req.nextUrl.searchParams.get('translate') === 'true';
  const lang = req.nextUrl.searchParams.get('lang') || 'en';
  const provider = req.nextUrl.searchParams.get('provider') || undefined;

  if (!sourceId || !bookId || !chapterId) {
    return NextResponse.json({ success: false, error: 'Missing ?source=, ?bookId=, ?chapterId=' });
  }

  try {
    const result = await getChapterText(sourceId, bookId, chapterId);
    if (!result) return NextResponse.json({ success: false, error: 'Chapter not found' });

    const rawHtml = result.content
      ? result.content.split('\n').filter(l => l.trim()).map(l => `<p>${l.trim()}</p>`).join('\n')
      : '';

    let translatedHtml = '';
    if (translate && rawHtml && lang === 'en') {
      try {
        translatedHtml = await translateHtml(rawHtml, 'zh-CN', 'en', provider);
      } catch (err) {
        console.error('Translation failed, returning raw:', err);
        translatedHtml = rawHtml;
      }
    }

    return NextResponse.json({
      success: true,
      title: result.title,
      rawHtml,
      translatedHtml: translatedHtml || rawHtml,
      rawText: result.content || '',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
