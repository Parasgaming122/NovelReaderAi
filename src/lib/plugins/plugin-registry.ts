import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail } from './types';
import { Novel543Plugin } from './Novel543Plugin';
import { TimoTxtPlugin } from './TimoTxtPlugin';
import { Shuba69Plugin } from './Shuba69Plugin';
import { Ixdzs8Plugin } from './Ixdzs8Plugin';
import { XBiqugePlugin } from './XBiqugePlugin';

class PluginRegistry {
  private plugins: Map<string, NovelSourcePlugin> = new Map();

  constructor() {
    this.register(new Novel543Plugin());
    this.register(new TimoTxtPlugin());
    this.register(new Shuba69Plugin());
    this.register(new Ixdzs8Plugin());
    this.register(new XBiqugePlugin());
  }

  public register(plugin: NovelSourcePlugin) {
    this.plugins.set(plugin.info.id, plugin);
  }

  public getPlugin(sourceId: string): NovelSourcePlugin | undefined {
    return this.plugins.get(sourceId);
  }

  public getAllSources(orderedIds?: string[]): PluginSourceInfo[] {
    if (!orderedIds || orderedIds.length === 0) {
      return Array.from(this.plugins.values()).map((p) => p.info);
    }
    const result: PluginSourceInfo[] = [];
    for (const id of orderedIds) {
      const plugin = this.getPlugin(id);
      if (plugin) {
        result.push(plugin.info);
      }
    }
    return result;
  }

  public async getCatalogList(sourceId: string, page = 1) {
    const plugin = this.getPlugin(sourceId);
    if (!plugin) {
      return { items: [], hasNext: false };
    }
    try {
      return await plugin.getCatalogList(page);
    } catch (err) {
      console.error(`Error in ${sourceId} getCatalogList:`, err);
      return { items: [], hasNext: false };
    }
  }

  public async getMultiSourceCatalog(page = 1, orderedIds?: string[]) {
    const sources = this.getAllSources(orderedIds);
    const results = await Promise.all(
      sources.map(async (info) => {
        const plugin = this.getPlugin(info.id);
        if (!plugin) return { sourceId: info.id, sourceName: info.name, icon: info.icon, items: [] };
        try {
          const res = await plugin.getCatalogList(page);
          return {
            sourceId: plugin.info.id,
            sourceName: plugin.info.name,
            icon: plugin.info.icon,
            items: res.items || [],
          };
        } catch {
          return {
            sourceId: plugin.info.id,
            sourceName: plugin.info.name,
            icon: plugin.info.icon,
            items: [],
          };
        }
      })
    );
    return results;
  }

  public async searchSources(query: string, sourceId = 'all', page = 1, orderedIds?: string[]) {
    if (!query || !query.trim()) return [];

    if (sourceId !== 'all') {
      const plugin = this.getPlugin(sourceId);
      if (!plugin) return [];
      try {
        const res = await plugin.getCatalogSearch(query.trim(), page);
        return [
          {
            sourceId: plugin.info.id,
            sourceName: plugin.info.name,
            icon: plugin.info.icon,
            items: res.items || [],
          },
        ];
      } catch (err) {
        console.error(`Search error on ${sourceId}:`, err);
        return [];
      }
    }

    const sources = this.getAllSources(orderedIds);
    const results = await Promise.all(
      sources.map(async (info) => {
        const plugin = this.getPlugin(info.id);
        if (!plugin) return { sourceId: info.id, sourceName: info.name, icon: info.icon, items: [] };
        try {
          const res = await plugin.getCatalogSearch(query.trim(), page);
          return {
            sourceId: plugin.info.id,
            sourceName: plugin.info.name,
            icon: plugin.info.icon,
            items: res.items || [],
          };
        } catch {
          return {
            sourceId: plugin.info.id,
            sourceName: plugin.info.name,
            icon: plugin.info.icon,
            items: [],
          };
        }
      })
    );

    return results;
  }

  /**
   * Search for alternative sources using Chinese title
   */
  public async findAlternativeSources(chineseTitle: string, excludeSourceId?: string) {
    if (!chineseTitle || !chineseTitle.trim()) return [];

    const sources = Array.from(this.plugins.values()).filter(
      (p) => !excludeSourceId || p.info.id !== excludeSourceId
    );

    const alternativeResults = await Promise.all(
      sources.map(async (plugin) => {
        try {
          const res = await plugin.getCatalogSearch(chineseTitle.trim(), 1);
          // Return the top 2 matching novels from this alternative source
          const topMatches = (res.items || []).slice(0, 2);
          return {
            sourceId: plugin.info.id,
            sourceName: plugin.info.name,
            icon: plugin.info.icon,
            baseUrl: plugin.info.baseUrl,
            matches: topMatches,
          };
        } catch {
          return {
            sourceId: plugin.info.id,
            sourceName: plugin.info.name,
            icon: plugin.info.icon,
            baseUrl: plugin.info.baseUrl,
            matches: [],
          };
        }
      })
    );

    return alternativeResults.filter((res) => res.matches.length > 0);
  }

  public async getBookDetails(sourceId: string, bookUrl: string): Promise<PluginNovelDetail | null> {
    const plugin = this.getPlugin(sourceId);
    if (!plugin) {
      // Try to find matching plugin by domain
      for (const p of this.plugins.values()) {
        if (bookUrl.includes(p.info.baseUrl.replace('https://', '').replace('www.', '').replace('/', ''))) {
          return await p.getBookDetails(bookUrl);
        }
      }
      // Fallback to Novel543 if unknown
      const defaultPlugin = this.getPlugin('novel543');
      return defaultPlugin ? await defaultPlugin.getBookDetails(bookUrl) : null;
    }
    return await plugin.getBookDetails(bookUrl);
  }

  public async getChapterText(sourceId: string, chapterUrl: string) {
    const plugin = this.getPlugin(sourceId);
    if (!plugin) {
      for (const p of this.plugins.values()) {
        if (chapterUrl.includes(p.info.baseUrl.replace('https://', '').replace('www.', '').replace('/', ''))) {
          return await p.getChapterText(chapterUrl);
        }
      }
      const defaultPlugin = this.getPlugin('novel543');
      return defaultPlugin
        ? await defaultPlugin.getChapterText(chapterUrl)
        : { contentHtml: '<p>Source not found.</p>', rawText: '' };
    }
    return await plugin.getChapterText(chapterUrl);
  }
}

export const pluginRegistry = new PluginRegistry();
