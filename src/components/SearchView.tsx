'use client';

import React from 'react';
import { Search, Globe, RefreshCw, ChevronRight, BookOpen } from 'lucide-react';
import { GroupedSearchResult, NovelItem } from '@/lib/types';

interface SearchViewProps {
  query: string;
  isSearching: boolean;
  groupedResults: GroupedSearchResult[];
  onSelectNovel: (novel: NovelItem) => void;
}

export default function SearchView({
  query,
  isSearching,
  groupedResults,
  onSelectNovel,
}: SearchViewProps) {
  const totalCount = groupedResults.reduce((acc, g) => acc + (g.items ? g.items.length : 0), 0);

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 className="font-display" style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-1)' }}>
          Multi-Source Search Results
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
          {query
            ? `Searching across all novel sources for "${query}". Found ${totalCount} results.`
            : 'Enter a search term in the top bar to query all novel repositories.'}
        </p>
      </div>

      {isSearching ? (
        <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-2)' }}>
          <RefreshCw size={28} strokeWidth={1.8} className="spin" style={{ marginBottom: 16 }} />
          <p style={{ fontSize: 15, fontWeight: 600, fontFamily: 'Space Grotesk' }}>
            Querying all novel sources...
          </p>
        </div>
      ) : !query ? (
        <div className="console-card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-2)' }}>
          <Search size={32} strokeWidth={1.8} style={{ color: 'var(--text-3)', marginBottom: 12 }} />
          <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700 }}>
            Start a Search
          </h3>
          <p style={{ fontSize: 13, marginTop: 8 }}>
            Type any title or keyword in the top search bar to scan all sources.
          </p>
        </div>
      ) : totalCount === 0 ? (
        <div className="console-card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-2)' }}>
          <BookOpen size={32} strokeWidth={1.8} style={{ color: 'var(--text-3)', marginBottom: 12 }} />
          <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700 }}>
            No titles found for &quot;{query}&quot;
          </h3>
          <p style={{ fontSize: 13, marginTop: 8 }}>
            Try a different keyword or check your spelling.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {groupedResults.map((group) => {
            if (!group.items || group.items.length === 0) return null;

            return (
              <div key={group.sourceId} className="console-card" style={{ padding: '24px 28px' }}>
                {/* Source Name Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Globe size={18} style={{ color: 'var(--blue)' }} />
                    <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>
                      {group.sourceName}
                    </h2>
                    <span className="status-pill status-blue" style={{ fontSize: 10 }}>
                      {group.sourceId.toUpperCase()}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>
                    {group.items.length} Result(s)
                  </span>
                </div>

                {/* Horizontal Slider for this Source */}
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    overflowX: 'auto',
                    paddingBottom: 12,
                    paddingTop: 4,
                    scrollBehavior: 'smooth',
                  }}
                >
                  {group.items.map((novel) => (
                    <div
                      key={novel.id}
                      style={{
                        minWidth: 160,
                        maxWidth: 180,
                        backgroundColor: 'var(--surface-2)',
                        borderRadius: 12,
                        padding: 12,
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        flexShrink: 0,
                      }}
                      onClick={() => onSelectNovel(novel)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--blue)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: 210,
                          borderRadius: 8,
                          overflow: 'hidden',
                          backgroundColor: 'var(--surface)',
                          marginBottom: 10,
                          position: 'relative',
                        }}
                      >
                        <img
                          src={novel.cover || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80'}
                          alt={novel.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                        <div>
                          {novel.chineseTitle && (
                            <div
                              style={{
                                fontSize: 10,
                                color: 'var(--text-3)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                marginBottom: 2,
                              }}
                            >
                              {novel.chineseTitle}
                            </div>
                          )}
                          <h3
                            className="font-display"
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: 'var(--text-1)',
                              lineHeight: 1.3,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {novel.title}
                          </h3>
                        </div>

                        <div style={{ marginTop: 8 }}>
                          <p style={{ fontSize: 11, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {novel.author || 'Anonymous'}
                          </p>
                          <span style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2, marginTop: 4 }}>
                            Read Novel <ChevronRight size={12} />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
