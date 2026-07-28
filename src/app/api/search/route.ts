import { NextRequest, NextResponse } from 'next/server';
import { pluginRegistry } from '@/lib/plugins/plugin-registry';
import { translateText, translateNovelItems } from '@/lib/translator';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || searchParams.get('query') || '';
  const sourceId = searchParams.get('source') || 'all';
  const sourcesParam = searchParams.get('sources'); // comma-separated order/enabled IDs
  const page = parseInt(searchParams.get('page') || '1', 10);

  const orderedIds = sourcesParam ? sourcesParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined;

  if (!q.trim()) {
    return NextResponse.json({
      success: false,
      error: 'Query parameter "q" is required.',
    });
  }

  try {
    const rawQuery = q.trim();
    let queryChinese = rawQuery;

    // Translate English or Pinyin query to Chinese first if ASCII
    if (/^[a-zA-Z0-9\s\-_',.?!]+$/.test(rawQuery)) {
      const translated = await translateText(rawQuery, 'en', 'zh-CN');
      if (translated && translated.trim()) {
        queryChinese = translated.trim();
      }
    }

    // Execute multi-source search using Chinese query
    let searchGrouped = await pluginRegistry.searchSources(queryChinese, sourceId, page, orderedIds);

    // Fallback: if Chinese query returned 0 items and raw query is different, try searching with raw query
    const totalCount = searchGrouped.reduce((acc, g) => acc + g.items.length, 0);
    if (totalCount === 0 && queryChinese !== rawQuery) {
      const fallbackGrouped = await pluginRegistry.searchSources(rawQuery, sourceId, page, orderedIds);
      if (fallbackGrouped.some((g) => g.items.length > 0)) {
        searchGrouped = fallbackGrouped;
      }
    }

    // Collect all items across all sources into a single array for batch translation
    const allRawItems = searchGrouped.flatMap((g) => g.items);
    const batchTranslatedItems = await translateNovelItems(allRawItems);

    // Re-assign translated items back to their respective source groups
    let itemMapPointer = 0;
    const translatedGrouped = searchGrouped.map((g) => {
      const groupCount = g.items.length;
      const groupTranslated = batchTranslatedItems.slice(itemMapPointer, itemMapPointer + groupCount);
      itemMapPointer += groupCount;
      return {
        ...g,
        items: groupTranslated,
      };
    });

    return NextResponse.json({
      success: true,
      query: rawQuery,
      queryChinese,
      sourceId,
      totalResults: batchTranslatedItems.length,
      groupedResults: translatedGrouped,
      results: batchTranslatedItems,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to perform search',
    });
  }
}
