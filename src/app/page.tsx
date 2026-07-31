'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ConsoleShell from '@/components/ConsoleShell';
import NovelCatalog from '@/components/NovelCatalog';
import NovelDetailView from '@/components/NovelDetailView';
import ReaderConsole from '@/components/ReaderConsole';
import SourcesView from '@/components/SourcesView';
import SearchView from '@/components/SearchView';
import HistoryBookmarks from '@/components/HistoryBookmarks';
import SettingsView from '@/components/SettingsView';
import FetchIndicator from '@/components/FetchIndicator';
import { NovelItem, ChapterItem, NovelSourceInfo, GroupedSearchResult } from '@/lib/types';
import { updateHistoryWithNovel } from '@/lib/favourites';

type TabId = 'catalog' | 'sources' | 'search' | 'shelf' | 'settings';

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('catalog');
  const [sources, setSources] = useState<NovelSourceInfo[]>([]);
  const [selectedNovel, setSelectedNovel] = useState<NovelItem | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<{
    chapter: ChapterItem;
    allChapters: ChapterItem[];
  } | null>(null);

  // Search State
  const [groupedSearchResults, setGroupedSearchResults] = useState<GroupedSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState('');

  // Source fetch statuses for FetchIndicator
  const [fetchStatuses, setFetchStatuses] = useState<{
    sourceId: string;
    sourceName: string;
    status: 'pending' | 'fetching' | 'success' | 'error';
    items?: number;
    error?: string;
  }[]>([]);
  const [showFetchIndicator, setShowFetchIndicator] = useState(false);

  // Restore state from URL params on mount
  useEffect(() => {
    const novelParam = searchParams.get('novel');
    if (novelParam) {
      try {
        const novel = JSON.parse(decodeURIComponent(novelParam));
        if (novel && novel.id) {
          setSelectedNovel(novel);
          setSelectedChapter(null);
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch Sources List on Mount
  useEffect(() => {
    async function loadSources() {
      try {
        const res = await fetch('/api/sources');
        const data = await res.json();
        if (data.success && Array.isArray(data.sources)) {
          setSources(data.sources);
        }
      } catch (err) {
        console.error('Error loading sources:', err);
      }
    }
    loadSources();
  }, []);

  // Handle Search Trigger across all sources
  const handleSearchSubmit = async (query: string) => {
    if (!query.trim()) return;
    setLastSearchQuery(query);
    setIsSearching(true);
    setActiveTab('search');
    setSelectedNovel(null);
    setSelectedChapter(null);

    try {
      // Derive fetch statuses from sources
      const searchSources = sources.length > 0
        ? sources
        : [{ id: 'unknown', name: 'Sources' }];
      const initialStatuses = searchSources.map(s => ({
        sourceId: s.id, sourceName: s.name, status: 'fetching' as const,
      }));
      setFetchStatuses(initialStatuses);
      setShowFetchIndicator(true);

      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.groupedResults)) {
        setGroupedSearchResults(data.groupedResults);
        // Update fetch statuses based on results
        const updatedStatuses = initialStatuses.map(s => {
          const result = data.groupedResults.find((g: any) => g.sourceId === s.sourceId);
          if (result && result.items && result.items.length > 0) {
            return { ...s, status: 'success' as const, items: result.items.length };
          }
          return { ...s, status: 'error' as const, error: 'No results' };
        });
        setFetchStatuses(updatedStatuses);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectNovel = (novel: NovelItem) => {
    setSelectedNovel(novel);
    setSelectedChapter(null);
    // Update reading history
    updateHistoryWithNovel(novel);
    // Update URL
    router.push(`?novel=${encodeURIComponent(JSON.stringify({ id: novel.id, url: novel.url, sourceId: novel.sourceId, title: novel.title, bookId: novel.bookId }))}`, { scroll: false });
  };

  const handleSelectChapter = (chapter: ChapterItem, allChapters: ChapterItem[]) => {
    setSelectedChapter({ chapter, allChapters });
  };

  const handleNavigateTab = (tab: TabId) => {
    setActiveTab(tab);
    setSelectedNovel(null);
    setSelectedChapter(null);
    // Clear URL params when navigating tabs
    router.push('/', { scroll: false });
  };

  return (
    <ConsoleShell
      activeTab={activeTab}
      setActiveTab={handleNavigateTab}
      onSearchSubmit={handleSearchSubmit}
    >
      {/* Fetch Indicator - small floating widget showing source fetch status */}
      {showFetchIndicator && fetchStatuses.length > 0 && (
        <FetchIndicator
          statuses={fetchStatuses}
          isComplete={!isSearching && fetchStatuses.some(s => s.status !== 'fetching' && s.status !== 'pending')}
          onDismiss={() => setShowFetchIndicator(false)}
        />
      )}

      {/* 1. Reader Console Mode */}
      {selectedChapter && selectedNovel ? (
        <ReaderConsole
          novel={selectedNovel}
          initialChapter={selectedChapter.chapter}
          allChapters={selectedChapter.allChapters}
          onBack={() => setSelectedChapter(null)}
        />
      ) : selectedNovel ? (
        /* 2. Novel Detail View Mode */
        <NovelDetailView
          novel={selectedNovel}
          onBack={() => {
            setSelectedNovel(null);
            router.push('/', { scroll: false });
          }}
          onSelectChapter={handleSelectChapter}
        />
      ) : activeTab === 'sources' ? (
        /* 3. Sources Feed & Single-Source Search Page */
        <SourcesView sources={sources} onSelectNovel={handleSelectNovel} />
      ) : activeTab === 'search' ? (
        /* 4. Multi-Source Grouped Search Results Tab */
        <SearchView
          query={lastSearchQuery}
          isSearching={isSearching}
          groupedResults={groupedSearchResults}
          onSelectNovel={handleSelectNovel}
        />
      ) : activeTab === 'shelf' ? (
        /* 5. Bookshelf & Reading History */
        <HistoryBookmarks onSelectNovel={handleSelectNovel} />
      ) : activeTab === 'settings' ? (
        /* 6. Settings */
        <SettingsView />
      ) : (
        /* 7. Default Home Catalog View */
        <NovelCatalog
          sources={sources}
          onSelectNovel={handleSelectNovel}
          onSelectSource={() => {
            handleNavigateTab('sources');
          }}
        />
      )}
    </ConsoleShell>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
