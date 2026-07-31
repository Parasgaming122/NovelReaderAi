/* ── NovelAPI Client Types ── */

export interface SourceInfo {
  id: string;
  name: string;
  baseUrl: string;
  language: string;
  charset: string;
  hasSearch: boolean;
  hasCatalog: boolean;
}

export interface NovelItem {
  id: string;
  title: string;
  chineseTitle?: string;
  url: string;
  cover?: string;
  author?: string;
  summary?: string;
  description?: string;
  status?: string;
  latestChapter?: string;
  sourceId: string;
  sourceName?: string;
  bookId?: string;
  bookUrl?: string;
  coverUrl?: string;
}

export interface ChapterItem {
  id: string;
  title: string;
  url: string;
  chapterId?: string;
  chapterUrl?: string;
  ordernum?: number;
}

export interface NovelDetail extends NovelItem {
  chapters: ChapterItem[];
}

export interface GroupedSearchResult {
  sourceId: string;
  sourceName: string;
  icon?: string;
  items: NovelItem[];
}

/* ── UI-facing source info (simplified) ── */
export interface NovelSourceInfo {
  id: string;
  name: string;
  baseUrl: string;
  language: string;
  version: string;
  icon?: string;
  hasSearch: boolean;
  description?: string;
  charset?: string;
}
