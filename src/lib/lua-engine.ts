import { pluginRegistry } from './plugins/plugin-registry';

export function getAvailableSources() {
  return pluginRegistry.getAllSources();
}

export async function searchNovels(query: string, sourceId = 'all') {
  const grouped = await pluginRegistry.searchSources(query, sourceId);
  return grouped.flatMap((g) => g.items);
}

export async function fetchNovelDetail(sourceId: string, url: string) {
  return await pluginRegistry.getBookDetails(sourceId, url);
}

export async function fetchChapterContent(url: string) {
  return await pluginRegistry.getChapterText('novel543', url);
}
