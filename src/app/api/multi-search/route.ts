import { NextRequest, NextResponse } from 'next/server';
import { getSources, searchSource } from '@/lib/novelapi-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q.trim()) {
    return NextResponse.json({ success: false, error: 'Query parameter "q" is required.' });
  }

  try {
    const sources = await getSources();
    const searchable = sources.filter(s => s.hasSearch);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const results = await Promise.allSettled(
      searchable.map(async (s) => {
        const items = await Promise.race([
          searchSource(s.id, q.trim()),
          new Promise<never>((_, reject) =>
            controller.signal.addEventListener('abort', () => reject(new Error('Timeout')))
          ),
        ]);
        return {
          sourceId: s.id,
          sourceName: s.name,
          items: items.map(it => ({
            id: `${s.id}:${it.bookId}`,
            title: it.title,
            chineseTitle: it.title,
            url: it.bookUrl || `/${s.id}/${it.bookId}`,
            cover: it.coverUrl,
            author: it.author,
            sourceId: s.id,
            sourceName: s.name,
            bookId: it.bookId,
          })),
        };
      })
    );

    clearTimeout(timeout);

    const grouped = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter(g => g.items.length > 0);

    return NextResponse.json({ success: true, results: grouped });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
