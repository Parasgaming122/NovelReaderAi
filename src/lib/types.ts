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

export interface NovelItem {
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

export interface ChapterItem {
  id: string;
  title: string;
  url: string;
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

export interface AlternativeSourceResult {
  sourceId: string;
  sourceName: string;
  icon?: string;
  baseUrl: string;
  matches: NovelItem[];
}
