const BASE = 'https://novelapi.vercel.app/api';

type ApiResponse<T = any> = {
  success: boolean;
  source: string;
  action: string;
  data?: T;
  error?: string;
  timestamp: number;
};

export interface ApiNovelItem {
  bookId: string;
  title: string;
  author?: string;
  coverUrl?: string;
  description?: string;
  bookUrl?: string;
  latestChapter?: string;
}

export interface ApiChapterItem {
  chapterId: string;
  title: string;
  chapterUrl?: string;
  ordernum?: number;
}

export interface ApiNovelInfo {
  bookId: string;
  title: string;
  author?: string;
  coverUrl?: string;
  description?: string;
  chapters: ApiChapterItem[];
}

export interface ApiSourceInfo {
  id: string;
  name: string;
  baseUrl: string;
  language: string;
  charset: string;
  hasSearch: boolean;
  hasCatalog: boolean;
}

async function apiFetch<T>(path: string): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 0 },
  });
  return res.json();
}

/* ── Public API ── */

export async function getSources(): Promise<ApiSourceInfo[]> {
  const res = await apiFetch<ApiSourceInfo[]>('/sources');
  return res.success && res.data ? res.data : [];
}

export async function searchSource(sourceId: string, query: string): Promise<ApiNovelItem[]> {
  const res = await apiFetch<{ success: boolean; items?: ApiNovelItem[] }>(
    `/${sourceId}/search?q=${encodeURIComponent(query)}`
  );
  if (res.success && res.data?.success && res.data.items) {
    return res.data.items;
  }
  return [];
}

export async function getCatalog(sourceId: string, page = 1): Promise<ApiNovelItem[]> {
  const res = await apiFetch<{ success: boolean; items?: ApiNovelItem[] }>(
    `/${sourceId}/catalog?page=${page}`
  );
  if (res.success && res.data?.success && res.data.items) {
    return res.data.items;
  }
  return [];
}

export async function getNovelInfo(sourceId: string, bookId: string): Promise<ApiNovelInfo | null> {
  const res = await apiFetch<{ success: boolean; novel?: ApiNovelInfo }>(
    `/${sourceId}/novel/${bookId}`
  );
  if (res.success && res.data?.success && res.data.novel) {
    return res.data.novel;
  }
  return null;
}

export async function getChapterList(sourceId: string, bookId: string): Promise<ApiChapterItem[]> {
  const res = await apiFetch<{ success: boolean; items?: ApiChapterItem[] }>(
    `/${sourceId}/novel/${bookId}/chapters`
  );
  if (res.success && res.data?.success && res.data.items) {
    return res.data.items;
  }
  return [];
}

export async function getChapterText(
  sourceId: string,
  bookId: string,
  chapterId: string
): Promise<{ title?: string; content?: string } | null> {
  const res = await apiFetch<{ success: boolean; title?: string; content?: string }>(
    `/${sourceId}/novel/${bookId}/${chapterId}`
  );
  if (res.success && res.data?.success) {
    return { title: res.data.title, content: res.data.content };
  }
  return null;
}
