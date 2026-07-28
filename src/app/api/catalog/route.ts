import { NextRequest, NextResponse } from 'next/server';
import { pluginRegistry } from '@/lib/plugins/plugin-registry';
import { translateNovelItems } from '@/lib/translator';

interface CatalogCacheEntry {
  data: any;
  timestamp: number;
}

const catalogCacheMap = new Map<string, CatalogCacheEntry>();
const CACHE_24_HOURS = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sourceId = searchParams.get('source');
  const sourcesParam = searchParams.get('sources'); // comma separated order list
  const page = parseInt(searchParams.get('page') || '1', 10);
  const forceRefresh = searchParams.get('refresh') === 'true';

  const orderedIds = sourcesParam ? sourcesParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined;

  try {
    if (sourceId && sourceId !== 'all') {
      const cacheKey = `source_${sourceId}_page_${page}`;
      const cached = catalogCacheMap.get(cacheKey);
      if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_24_HOURS) {
        return NextResponse.json({ ...cached.data, cached: true });
      }

      const result = await pluginRegistry.getCatalogList(sourceId, page);
      const translatedItems = await translateNovelItems(result.items);
      const responseData = {
        success: true,
        sourceId,
        page,
        count: translatedItems.length,
        hasNext: result.hasNext,
        items: translatedItems,
      };

      catalogCacheMap.set(cacheKey, { data: responseData, timestamp: Date.now() });
      return NextResponse.json(responseData);
    }

    const multiCacheKey = `multi_catalog_page_${page}_sources_${sourcesParam || 'all'}`;
    const cachedMulti = catalogCacheMap.get(multiCacheKey);
    if (!forceRefresh && cachedMulti && Date.now() - cachedMulti.timestamp < CACHE_24_HOURS) {
      return NextResponse.json({ ...cachedMulti.data, cached: true });
    }

    const multiCatalog = await pluginRegistry.getMultiSourceCatalog(page, orderedIds);

    // Translate items in multiCatalog in parallel
    const translatedMultiCatalog = await Promise.all(
      multiCatalog.map(async (cat) => {
        const translatedItems = await translateNovelItems(cat.items);
        return {
          ...cat,
          items: translatedItems,
        };
      })
    );

    const multiResponseData = {
      success: true,
      page,
      catalogs: translatedMultiCatalog,
    };

    catalogCacheMap.set(multiCacheKey, { data: multiResponseData, timestamp: Date.now() });

    return NextResponse.json(multiResponseData);
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to load catalog',
    });
  }
}
