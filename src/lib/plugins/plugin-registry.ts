import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail } from './types';

// Original 5 plugins
import { Novel543Plugin } from './Novel543Plugin';
import { TimoTxtPlugin } from './TimoTxtPlugin';
import { Shuba69Plugin } from './Shuba69Plugin';
import { Ixdzs8Plugin } from './Ixdzs8Plugin';
import { XBiqugePlugin } from './XBiqugePlugin';

// Batch 1 — 11 new plugins
import { BiQuGe5200Plugin } from './BiQuGe5200Plugin';
import { BiQuGeCompanyPlugin } from './BiQuGeCompanyPlugin';
import { DdxssPlugin } from './DdxssPlugin';
import { FanqiePlugin } from './FanqiePlugin';
import { HaodooPlugin } from './HaodooPlugin';
import { PiaotiaPlugin } from './PiaotiaPlugin';
import { PoWanJuanPlugin } from './PoWanJuanPlugin';
import { Quanben5Plugin } from './Quanben5Plugin';
import { RayforboePlugin } from './RayforboePlugin';
import { ShuHaiGePlugin } from './ShuHaiGePlugin';
import { Shw5Plugin } from './Shw5Plugin';

// Batch 2 — 8 new plugins
import { SnapdPlugin } from './SnapdPlugin';
import { SoxsPlugin } from './SoxsPlugin';
import { TrxsPlugin } from './TrxsPlugin';
import { TTKanPlugin } from './TTKanPlugin';
import { TWKanPlugin } from './TWKanPlugin';
import { WanbenPlugin } from './WanbenPlugin';
import { ZonghengPlugin } from './ZonghengPlugin';
import { QimaoPlugin } from './QimaoPlugin';

/**
 * Set of source IDs that are blocked by Cloudflare or anti-bot protection.
 * These plugins are registered but return empty results for search/catalog/detail operations.
 * Users can toggle them in settings.
 */
const BLOCKED_SOURCE_IDS = new Set([
  'shuba69',   // 403 Forbidden
  'qimao',     // 405 Not Allowed
  'soxs',      // Timeout (blocked)
  'twkan',     // 403 Forbidden
]);

class PluginRegistry {
  private plugins: Map<string, NovelSourcePlugin> = new Map();
  private disabledIds: Set<string> = new Set();

  constructor() {
    // ── Original 5 plugins ────────────────────────────────────────
    this.register(new Novel543Plugin());
    this.register(new TimoTxtPlugin());
    this.register(new Shuba69Plugin());    // BLOCKED: 403
    this.register(new Ixdzs8Plugin());
    this.register(new XBiqugePlugin());

    // ── Batch 1: 11 new plugins ───────────────────────────────────
    this.register(new BiQuGe5200Plugin());
    this.register(new BiQuGeCompanyPlugin());
    this.register(new DdxssPlugin());
    this.register(new FanqiePlugin());
    this.register(new HaodooPlugin());
    this.register(new PiaotiaPlugin());
    this.register(new PoWanJuanPlugin());
    this.register(new Quanben5Plugin());
    this.register(new RayforboePlugin());
    this.register(new ShuHaiGePlugin());
    this.register(new Shw5Plugin());

    // ── Batch 2: 8 new plugins ──────────────────────────────────
    this.register(new SnapdPlugin());
    this.register(new SoxsPlugin());       // BLOCKED: Timeout
    this.register(new TrxsPlugin());
    this.register(new TTKanPlugin());
    this.register(new TWKanPlugin());      // BLOCKED: 403
    this.register(new WanbenPlugin());
    this.register(new ZonghengPlugin());
    this.register(new QimaoPlugin());      // BLOCKED: 405

    // Disable all blocked sources by default
    for (const id of BLOCKED_SOURCE_IDS) {
      this.disabledIds.add(id);
    }
  }

  public register(plugin: NovelSourcePlugin) {
    this.plugins.set(plugin.info.id, plugin);
  }

  public getPlugin(sourceId: string): NovelSourcePlugin | undefined {
    if (this.disabledIds.has(sourceId)) return undefined;
    return this.plugins.get(sourceId);
  }

  /** Get all sources including disabled ones (for settings UI) */
  public getAllSourcesWithStatus(orderedIds?: string[]): (PluginSourceInfo & { enabled: boolean })[] {
    const all = orderedIds
      ? orderedIds.map(id => this.plugins.get(id)).filter(Boolean)
      : Array.from(this.plugins.values());

    return all.map(p => ({
      ...p.info,
      enabled: !this.disabledIds.has(p.info.id),
    }));
  }

  /** Get only enabled sources (for search/catalog operations) */
  public getAllSources(orderedIds?: string[]): PluginSourceInfo[] {
    const all = orderedIds
      ? orderedIds.map(id => this.plugins.get(id)).filter(Boolean)
      : Array.from(this.plugins.values());

    return all
      .filter(p => !this.disabledIds.has(p.info.id))
      .map(p => p.info);
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
        const plugin = this.plugins.get(info.id);
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
        const plugin = this.plugins.get(info.id);
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
      (p) => (!this.disabledIds.has(p.info.id)) && (!excludeSourceId || p.info.id !== excludeSourceId)
    );

    const alternativeResults = await Promise.all(
      sources.map(async (plugin) => {
        try {
          const res = await plugin.getCatalogSearch(chineseTitle.trim(), 1);
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
        if (this.disabledIds.has(p.info.id)) continue;
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
        if (this.disabledIds.has(p.info.id)) continue;
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

  /** Enable a disabled source */
  public enableSource(sourceId: string): boolean {
    if (!this.plugins.has(sourceId)) return false;
    this.disabledIds.delete(sourceId);
    return true;
  }

  /** Disable a source */
  public disableSource(sourceId: string): boolean {
    if (!this.plugins.has(sourceId)) return false;
    this.disabledIds.add(sourceId);
    return true;
  }

  /** Check if a source is enabled */
  public isSourceEnabled(sourceId: string): boolean {
    return !this.disabledIds.has(sourceId);
  }

  /** Get count of enabled and total sources */
  public getSourceCounts(): { enabled: number; total: number; blocked: number } {
    const total = this.plugins.size;
    const blocked = this.disabledIds.size;
    return { enabled: total - blocked, total, blocked };
  }
}

export const pluginRegistry = new PluginRegistry();
