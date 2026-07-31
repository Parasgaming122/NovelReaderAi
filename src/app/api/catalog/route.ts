import { NextRequest, NextResponse } from 'next/server';
import { getSources, getCatalog } from '@/lib/novelapi-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
  const sourcesParam = req.nextUrl.searchParams.get('sources');

  try {
    const allSources = await getSources();
    let targetSources = allSources;

    if (sourcesParam) {
      const ids = new Set(sourcesParam.split(','));
      targetSources = allSources.filter(s => ids.has(s.id));
    }

    const catalogs = await Promise.allSettled(
      targetSources.map(async (s) => {
        const items = await getCatalog(s.id, page);
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
            summary: it.description,
            sourceId: s.id,
            sourceName: s.name,
            bookId: it.bookId,
          })),
        };
      })
    );

    const successCatalogs = catalogs
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value);

    return NextResponse.json({ success: true, catalogs: successCatalogs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
