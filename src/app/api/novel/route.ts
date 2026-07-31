import { NextRequest, NextResponse } from 'next/server';
import { getNovelInfo } from '@/lib/novelapi-client';
import { translateNovelDetail } from '@/lib/translator';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sourceId = req.nextUrl.searchParams.get('source') || '';
  const bookId = req.nextUrl.searchParams.get('bookId') || '';

  if (!sourceId || !bookId) {
    return NextResponse.json({ success: false, error: 'Missing ?source= and ?bookId=' });
  }

  try {
    const novel = await getNovelInfo(sourceId, bookId);
    if (!novel) return NextResponse.json({ success: false, error: 'Novel not found' });

    // Auto-translate title, author, summary
    const translated = await translateNovelDetail({
      title: novel.title,
      chineseTitle: novel.title,
      author: novel.author || '',
      summary: novel.description || '',
    });

    return NextResponse.json({
      success: true,
      novel: {
        id: `${sourceId}:${novel.bookId}`,
        title: translated.title,
        chineseTitle: translated.chineseTitle,
        url: `/${sourceId}/${novel.bookId}`,
        cover: novel.coverUrl,
        author: translated.author,
        summary: translated.summary,
        sourceId,
        sourceName: sourceId,
        bookId: novel.bookId,
        chapters: novel.chapters.map(ch => ({
          id: `${sourceId}:${novel.bookId}:${ch.chapterId}`,
          title: ch.title,
          url: `/${sourceId}/${novel.bookId}/${ch.chapterId}`,
          chapterId: ch.chapterId,
          ordernum: ch.ordernum,
        })),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
