import { NovelSourcePlugin, PluginSourceInfo, PluginNovelItem, PluginNovelDetail } from './types';

// ============================================================================
// WORKING SOURCES (6 current - DO NOT CHANGE)
// These have complete HTML samples (catalog, search, novel_info, chapter) and work reliably
// ============================================================================
import { Ixdzs8Plugin } from './Ixdzs8Plugin';
import { XBiqugePlugin } from './XBiqugePlugin';
import { BiQuGeCompanyPlugin } from './BiQuGeCompanyPlugin';
import { TTKanPlugin } from './TTKanPlugin';
import { ShuHaiGePlugin } from './ShuHaiGePlugin';
import { Quanben5Plugin } from './Quanben5Plugin';

// ============================================================================
// MULTI-HTML SOURCES (4+ files - less likely to block app)
// Have multiple HTML samples but may need bypass methods
// ============================================================================
import { RayforboePlugin } from './RayforboePlugin';

// ============================================================================
// SINGLE-HTML SOURCES WITH HTML FOLDERS
// Only have homepage.html - may work with proper bypass but higher risk of blocking
// ============================================================================
import { Novel543Plugin } from './Novel543Plugin';
import { TimoTxtPlugin } from './TimoTxtPlugin';
import { PiaotiaPlugin } from './PiaotiaPlugin';
import { PoWanJuanPlugin } from './PoWanJuanPlugin';
import { Shw5Plugin } from './Shw5Plugin';
import { SnapdPlugin } from './SnapdPlugin';
import { SoxsPlugin } from './SoxsPlugin';
import { TrxsPlugin } from './TrxsPlugin';
import { WanbenPlugin } from './WanbenPlugin';
import { ZonghengPlugin } from './ZonghengPlugin';
import { Shuba69Plugin } from './Shuba69Plugin';

// ============================================================================
// REMOVED PLUGINS (No HTML folder exists - deleted per guidelines)
// These plugins were removed because they don't have corresponding HTML samples:
// - DdxssPlugin (no HTML folder)
// - FanqiePlugin (no HTML folder)
// - HaodooPlugin (no HTML folder)
// - QimaoPlugin (no HTML folder)
// - TWKanPlugin (no HTML folder)
// - BiQuGe5200Plugin (no HTML folder)
// ============================================================================

/**
 * Ordered list of source IDs by priority:
 * 1. Six current working sources (ixdzs8, xbiquge, biqugecompany, ttkan, shuhaige, quanben5)
 * 2. Multi-HTML sources (rayforboe)
 * 3. Single-HTML sources with HTML folders (sorted alphabetically)
 */
const SOURCE_PRIORITY_ORDER = [
  // 6 Current working sources (DO NOT CHANGE)
  'ixdzs8',
  'xbiquge',
  'biqugecompany',
  'ttkan',
  'shuhaige',
  'quanben5',
  // Multi-HTML sources
  'rayforboe',
  // Single-HTML sources (have HTML folders)
  'novel543',
  'piaotia',
  'powanjuan',
  'shuba69',
  'shw5',
  'snapd',
  'soxs',
  'timotxt',
  'trxs',
  'wanben',
  'zongheng',
];

/**
 * Set of source IDs allowed for group search (search across all sources).
 * Only working sources with complete HTML samples are used.
 */
const GROUP_SEARCH_SOURCE_IDS = new Set([
  'ixdzs8',
  'xbiquge',
  'biqugecompany',
  'ttkan',
  'shuhaige',
  'quanben5',
]);

/**
 * Set of source IDs that are blocked by Cloudflare or anti-bot protection.
 * These plugins are registered but return empty results for search/catalog/detail operations.
 * Users can toggle them in settings.
 * 
 * Sources WITHOUT HTML folders are removed from the registry entirely.
 */
const BLOCKED_SOURCE_IDS = new Set([
  'novel543',    // Has HTML but 403 Forbidden - keep for reference
  'timotxt',     // Has HTML but 403 Cloudflare Turnstile
  'piaotia',     // Has HTML but 403 Forbidden
  'powanjuan',   // Has HTML but 404 Not Found
  'shw5',        // Has HTML but 404 Not Found
  'soxs',        // Has HTML but domain parked - for sale
  'wanben',      // Has HTML but 404 Not Found
  'zongheng',    // Has HTML but 404 — rank pages gone
  'trxs',        // Has HTML but now fan-fiction site in GB2312
  'snapd',       // Has HTML but search broken (404)
  'rayforboe',   // Has HTML but site changed to quote/essay aggregator
  'ddxss',       // No HTML - domain parked
  'fanqie',      // No HTML - JS-rendered
  'haodoo',      // No HTML - Traditional Chinese archive
  'qimao',       // No HTML - 405 Not Allowed
  'twkan',       // No HTML - 403 Forbidden
  'shuba69',     // Has HTML but site down
]);

class PluginRegistry {
  private plugins: Map<string, NovelSourcePlugin> = new Map();
  private disabledIds: Set<string> = new Set();

  constructor() {
    // Register all plugins (blocked ones will be disabled below)
    // ========================================================================
    // WORKING SOURCES (6 current - DO NOT CHANGE)
    // ========================================================================
    this.register(new Ixdzs8Plugin());
    this.register(new XBiqugePlugin());
    this.register(new BiQuGeCompanyPlugin());
    this.register(new TTKanPlugin());
    this.register(new ShuHaiGePlugin());
    this.register(new Quanben5Plugin());
    
    // ========================================================================
    // MULTI-HTML SOURCES
    // ========================================================================
    this.register(new RayforboePlugin());
    
    // ========================================================================
    // SINGLE-HTML SOURCES (have HTML folders)
    // ========================================================================
    this.register(new Novel543Plugin());
    this.register(new TimoTxtPlugin());
    this.register(new PiaotiaPlugin());
    this.register(new PoWanJuanPlugin());
    this.register(new Shw5Plugin());
    this.register(new SnapdPlugin());
    this.register(new SoxsPlugin());
    this.register(new TrxsPlugin());
    this.register(new WanbenPlugin());
    this.register(new ZonghengPlugin());
    this.register(new Shuba69Plugin());

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
      : SOURCE_PRIORITY_ORDER.map(id => this.plugins.get(id)).filter(Boolean);

    return all.map(p => ({
      ...p.info,
      enabled: !this.disabledIds.has(p.info.id),
    }));
  }

  /** Get only enabled sources (for search/catalog operations) */
  public getAllSources(orderedIds?: string[]): PluginSourceInfo[] {
    const all = orderedIds
      ? orderedIds.map(id => this.plugins.get(id)).filter(Boolean)
      : SOURCE_PRIORITY_ORDER.map(id => this.plugins.get(id)).filter(Boolean);

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
    // Sort: sources with items first (working), then empty sources
    return results.sort((a, b) => b.items.length - a.items.length);
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

    // For group search ('all'), only search the 4 known working sources
    const allEnabledSources = this.getAllSources(orderedIds);
    const sources = orderedIds
      ? allEnabledSources
      : allEnabledSources.filter((info) => GROUP_SEARCH_SOURCE_IDS.has(info.id));
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

    // Only search alternative sources from the 4 known working sources
    const sources = Array.from(this.plugins.values()).filter(
      (p) => (!this.disabledIds.has(p.info.id)) 
        && (!excludeSourceId || p.info.id !== excludeSourceId)
        && GROUP_SEARCH_SOURCE_IDS.has(p.info.id)
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
