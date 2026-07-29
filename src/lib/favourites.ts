import { NovelItem } from './types';

const STORAGE_KEY = 'novel_favourites';
const HISTORY_KEY = 'novel_read_history';

export interface FavouriteEntry extends NovelItem {
  addedAt: number; // timestamp
  lastReadAt?: number;
  lastChapterId?: string;
  lastChapterTitle?: string;
}

export function getFavourites(): FavouriteEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addFavourite(novel: NovelItem): void {
  const favs = getFavourites();
  if (favs.some(f => f.id === novel.id)) return; // already favourited
  favs.unshift({ ...novel, addedAt: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

export function removeFavourite(novelId: string): void {
  const favs = getFavourites().filter(f => f.id !== novelId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

export function isFavourite(novelId: string): boolean {
  return getFavourites().some(f => f.id === novelId);
}

export function updateReadingProgress(novelId: string, chapterId: string, chapterTitle: string): void {
  // Update in favourites
  const favs = getFavourites();
  const fav = favs.find(f => f.id === novelId);
  if (fav) {
    fav.lastReadAt = Date.now();
    fav.lastChapterId = chapterId;
    fav.lastChapterTitle = chapterTitle;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
  }
  // Update in history
  const history = getReadingHistory();
  const existing = history.findIndex(h => h.id === novelId);
  const entry: FavouriteEntry = {
    id: novelId, title: '', url: '', sourceId: '',
    lastReadAt: Date.now(),
    lastChapterId: chapterId,
    lastChapterTitle: chapterTitle,
    addedAt: Date.now()
  };
  if (existing >= 0) {
    history[existing] = { ...history[existing], ...entry };
  } else {
    history.unshift(entry);
  }
  // Keep max 50 history items
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

export function updateHistoryWithNovel(novel: NovelItem): void {
  const history = getReadingHistory();
  const existing = history.findIndex(h => h.id === novel.id);
  const entry: FavouriteEntry = {
    ...novel,
    addedAt: Date.now(),
    lastReadAt: Date.now(),
  };
  if (existing >= 0) {
    history[existing] = { ...history[existing], ...entry, lastReadAt: Date.now() };
    // Move to front
    history.splice(existing, 1);
    history.unshift(entry);
  } else {
    history.unshift(entry);
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

export function getReadingHistory(): FavouriteEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function removeFromHistory(novelId: string): void {
  const history = getReadingHistory().filter(f => f.id !== novelId);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
