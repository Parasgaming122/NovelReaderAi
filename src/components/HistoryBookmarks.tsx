'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bookmark, Clock, Trash2, BookOpen, Heart } from 'lucide-react';
import { NovelItem } from '@/lib/types';
import {
  FavouriteEntry,
  getFavourites,
  getReadingHistory,
  removeFavourite,
  removeFromHistory,
} from '@/lib/favourites';

interface HistoryBookmarksProps {
  onSelectNovel: (novel: NovelItem) => void;
}

export default function HistoryBookmarks({ onSelectNovel }: HistoryBookmarksProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'bookmarks'>('history');
  const [history, setHistory] = useState<FavouriteEntry[]>([]);
  const [favourites, setFavourites] = useState<FavouriteEntry[]>([]);

  const loadData = useCallback(() => {
    setHistory(getReadingHistory());
    setFavourites(getFavourites());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRemoveFavourite = (e: React.MouseEvent, novelId: string) => {
    e.stopPropagation();
    removeFavourite(novelId);
    setFavourites(getFavourites());
  };

  const handleRemoveHistory = (e: React.MouseEvent, novelId: string) => {
    e.stopPropagation();
    removeFromHistory(novelId);
    setHistory(getReadingHistory());
  };

  const handleSelectNovel = (entry: FavouriteEntry) => {
    onSelectNovel({
      id: entry.id,
      title: entry.title,
      url: entry.url,
      sourceId: entry.sourceId,
      sourceName: entry.sourceName,
      cover: entry.cover,
      author: entry.author,
      summary: entry.summary,
      chineseTitle: entry.chineseTitle,
      latestChapter: entry.latestChapter,
    });
  };

  const currentList = activeTab === 'history' ? history : favourites;

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 32 }}>
        <h1 className="font-display" style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-1)' }}>
          My Bookshelf & Reading History
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
          Access your saved Chinese web novels and recently read chapters across all sources.
        </p>
      </div>

      {/* Toggle Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        <button
          className={`btn-secondary ${activeTab === 'history' ? 'status-blue' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Clock size={16} strokeWidth={1.8} />
          <span>Recently Read ({history.length})</span>
        </button>

        <button
          className={`btn-secondary ${activeTab === 'bookmarks' ? 'status-orange' : ''}`}
          onClick={() => setActiveTab('bookmarks')}
        >
          <Bookmark size={16} strokeWidth={1.8} />
          <span>Saved Bookmarks ({favourites.length})</span>
        </button>
      </div>

      {/* Empty State */}
      {currentList.length === 0 && (
        <div
          className="console-card"
          style={{
            padding: 64,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {activeTab === 'history' ? (
            <Clock size={48} strokeWidth={1} style={{ color: 'var(--text-3)', opacity: 0.5 }} />
          ) : (
            <Heart size={48} strokeWidth={1} style={{ color: 'var(--text-3)', opacity: 0.5 }} />
          )}
          <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-2)' }}>
            {activeTab === 'history' ? 'No reading history yet' : 'No saved bookmarks yet'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 360, lineHeight: 1.6 }}>
            {activeTab === 'history'
              ? 'Start reading a novel and your reading history will appear here automatically.'
              : 'Click the heart icon on any novel\'s detail page to save it to your bookmarks for quick access.'}
          </p>
        </div>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
        {currentList.map((entry) => (
          <div
            key={entry.id}
            className="console-card"
            style={{ display: 'flex', gap: 20, cursor: 'pointer', position: 'relative' }}
            onClick={() => handleSelectNovel(entry)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--blue)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            {/* Cover */}
            <div
              style={{
                width: 90,
                height: 125,
                borderRadius: 12,
                overflow: 'hidden',
                flexShrink: 0,
                backgroundColor: 'var(--surface-2)',
              }}
            >
              <img
                src={entry.cover || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80'}
                alt={entry.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Info */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
              <div>
                <span className="status-pill status-blue" style={{ fontSize: 10, marginBottom: 6 }}>
                  {entry.sourceId.toUpperCase()}
                </span>
                <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 }}>
                  {entry.title || 'Unknown Title'}
                </h3>
                {entry.lastChapterTitle && (
                  <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.4 }}>
                    Last: {entry.lastChapterTitle}
                  </p>
                )}
                {entry.latestChapter && !entry.lastChapterTitle && (
                  <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
                    {entry.latestChapter}
                  </p>
                )}
                {entry.lastReadAt && (
                  <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                    {new Date(entry.lastReadAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <BookOpen size={12} strokeWidth={2} />
                  Continue Reading
                </span>
                <button
                  onClick={(e) => {
                    if (activeTab === 'bookmarks') {
                      handleRemoveFavourite(e, entry.id);
                    } else {
                      handleRemoveHistory(e, entry.id);
                    }
                  }}
                  className="btn-secondary"
                  style={{
                    padding: '4px 8px',
                    fontSize: 11,
                    borderRadius: 8,
                    opacity: 0.6,
                  }}
                  title={activeTab === 'bookmarks' ? 'Remove from Bookmarks' : 'Remove from History'}
                >
                  <Trash2 size={12} strokeWidth={1.8} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
