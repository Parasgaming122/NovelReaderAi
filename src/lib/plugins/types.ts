export type CFBlockLevel = 'none' | 'partial' | 'full';

export type BypassMethod = 'smartFetch' | 'impit' | 'browser' | 'scraper' | 'clientProxy';

export interface PluginSourceInfo {
  id: string;
  name: string;
  baseUrl: string;
  language: string;
  version: string;
  icon?: string;
  hasSearch: boolean;
  charset?: string;
  description?: string;
  /** Whether the source is blocked by Cloudflare/anti-bot and should be disabled by default */
  blocked?: boolean;
  /** Block reason (e.g. "403 Forbidden", "Timeout", "Turnstile") */
  blockedReason?: string;
  /** Cloudflare blocking level: 'none'=accessible, 'partial'=some features blocked(e.g. search only), 'full'=completely blocked */
  cfBlockLevel?: CFBlockLevel;
  /** Detailed CF status description for settings UI */
  cfStatus?: string;
  /** Default bypass methods that work for this source (ordered by effectiveness) */
  recommendedBypassMethods?: BypassMethod[];
  /** All available bypass methods user can try */
  availableBypassMethods?: BypassMethod[];
}

export interface PluginNovelItem {
  id: string;
  title: string;
  chineseTitle?: string;
  url: string;
  cover?: string;
  author?: string;
  summary?: string;
  status?: string;
  latestChapter?: string;
  sourceId: string;
  sourceName?: string;
}

export interface PluginChapterItem {
  id: string;
  title: string;
  url: string;
}

export interface PluginNovelDetail extends PluginNovelItem {
  chapters: PluginChapterItem[];
}

export interface NovelSourcePlugin {
  info: PluginSourceInfo;
  getCatalogList(page?: number): Promise<{ items: PluginNovelItem[]; hasNext: boolean }>;
  getCatalogSearch(query: string, page?: number): Promise<{ items: PluginNovelItem[]; hasNext: boolean }>;
  getBookDetails(bookUrl: string): Promise<PluginNovelDetail | null>;
  getChapterText(chapterUrl: string): Promise<{ title?: string; contentHtml: string; rawText: string }>;
}
