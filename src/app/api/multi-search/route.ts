import { NextRequest, NextResponse } from 'next/server';
import { pluginRegistry } from '@/lib/plugins/plugin-registry';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';

  if (!q.trim()) {
    return NextResponse.json({
      success: false,
      error: 'Query parameter "q" is required.',
    });
  }

  try {
    const query = q.trim();

    // Get all sources and filter to only enabled ones
    const allSources = pluginRegistry.getAllSourcesWithStatus();
    const enabledSources = allSources.filter(
      (s: any) => s.enabled !== false
    );

    // Search each enabled plugin concurrently with an 8-second timeout
    const searchPromises = enabledSources.map((source: any) => {
      const sourceId = source.id ?? source.sourceId;

      return new Promise<{ sourceId: string; sourceName: string; icon: string; items: any[] } | null>(
        (resolve) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);

          // Race the search against the timeout
          const timeoutPromise = new Promise<never>((_, reject) => {
            controller.signal.addEventListener('abort', () =>
              reject(new Error('Timeout'))
            );
          });

          Promise.race([
            pluginRegistry.searchSources(query, sourceId, 1),
            timeoutPromise,
          ])
            .then((result) => {
              clearTimeout(timeout);
              // searchSources returns an array; take the matching entry
              const group = Array.isArray(result)
                ? result.find((g: any) => g.sourceId === sourceId) ?? result[0]
                : result;
              resolve(group);
            })
            .catch(() => {
              clearTimeout(timeout);
              resolve(null);
            });
        }
      );
    });

    const settled = await Promise.allSettled(searchPromises);

    // Collect fulfilled, non-empty results
    const results = settled
      .filter(
        (r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled'
      )
      .map((r) => r.value)
      .filter((group) => group && Array.isArray(group.items) && group.items.length > 0)
      .map((group) => ({
        sourceId: group.sourceId,
        sourceName: group.sourceName,
        icon: group.icon,
        items: group.items.map((item: any) => ({
          id: item.id,
          title: item.title,
          chineseTitle: item.chineseTitle,
          url: item.url,
          cover: item.cover,
          sourceId: item.sourceId ?? group.sourceId,
          sourceName: item.sourceName ?? group.sourceName,
        })),
      }));

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to perform multi-search',
    });
  }
}
