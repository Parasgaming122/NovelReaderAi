import { NextRequest, NextResponse } from 'next/server';
import { getSources, searchSource } from '@/lib/novelapi-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q.trim()) return NextResponse.json({ success: false, error: 'Missing ?q= parameter' });

  try {
    const sources = await getSources();
    const searchable = sources.filter(s => s.hasSearch);

    const results = await Promise.allSettled(
      searchable.map(async (s) => {
        const items = await searchSource(s.id, q.trim());
        return {
          sourceId: s.id,
          sourceName: s.name,
          icon: undefined,
          items: items.map(it => ({
            id: `${s.id}:${it.bookId}`,
            title: it.title,
            chineseTitle: it.title,
            url: it.bookUrl || `/${s.id}/${it.bookId}`,
            cover: it.coverUrl,
            author: it.author,
            summary: it.description,
            sourceId: s.id,
            sourceName: s.name,
            bookId: it.bookId,
          })),
        };
      })
    );

    const groupedResults = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter(g => g.items.length > 0);

    return NextResponse.json({ success: true, groupedResults });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
