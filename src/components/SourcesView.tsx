'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  BookOpen,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';
import { NovelSourceInfo, NovelItem, GroupedSearchResult } from '@/lib/types';

interface SourcesViewProps {
  sources: NovelSourceInfo[];
  onSelectNovel: (novel: NovelItem) => void;
}

export default function SourcesView({ sources, onSelectNovel }: SourcesViewProps) {
  const [selectedSource, setSelectedSource] = useState<NovelSourceInfo | null>(null);
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<GroupedSearchResult[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (sourceId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      return next;
    });
  };

  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = globalQuery.trim();
    if (!query) return;

    setGlobalLoading(true);
    setGlobalResults([]);
    try {
      const res = await fetch(`/api/multi-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setGlobalResults(data.results || []);
    } catch (err) {
      console.error('Global search error:', err);
    } finally {
      setGlobalLoading(false);
    }
  };

  const [sourceFeed, setSourceFeed] = useState<NovelItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [singleSearchQuery, setSingleSearchQuery] = useState('');
  const [isSearchingSingle, setIsSearchingSingle] = useState(false);

  useEffect(() => {
    if (!selectedSource) return;
    let isMounted = true;
    setLoadingFeed(true);
    setSingleSearchQuery('');
    fetch(`/api/catalog?source=${selectedSource.id}&page=1`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.items)) {
          setSourceFeed(data.items);
        }
      })
      .catch((err) => console.error('Error loading source feed:', err))
      .finally(() => {
        if (isMounted) setLoadingFeed(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedSource]);

  const handleSingleSourceSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSource || !singleSearchQuery.trim()) return;

    setIsSearchingSingle(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(singleSearchQuery.trim())}&source=${selectedSource.id}`
      );
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.results) && data.results.length > 0) {
          setSourceFeed(data.results);
        } else if (Array.isArray(data.groupedResults) && data.groupedResults.length > 0) {
          setSourceFeed(data.groupedResults[0].items || []);
        } else {
          setSourceFeed([]);
        }
      }
    } catch (err) {
      console.error('Single source search error:', err);
    } finally {
      setIsSearchingSingle(false);
    }
  };

  return (
    <div className="fade-up">
      {/* If a specific source is selected, show its feed & isolated search */}
      {selectedSource ? (
        <div>
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button className="btn-secondary" onClick={() => setSelectedSource(null)}>
              <ArrowLeft size={16} strokeWidth={1.8} />
              <span>Back to All Sources</span>
            </button>

            <a
              href={selectedSource.baseUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              style={{ textDecoration: 'none' }}
            >
              <ExternalLink size={16} strokeWidth={1.8} />
              <span>Visit {selectedSource.name} Site</span>
            </a>
          </div>

          {/* Source Banner & Single-Source Search Form */}
          <div className="console-card" style={{ padding: 28, marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span className="status-pill status-blue" style={{ fontSize: 11 }}>
                    {selectedSource.id.toUpperCase()}
                  </span>
                </div>
                <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-1)' }}>
                  {selectedSource.name} Feed & Search
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
                  {selectedSource.description || 'Browse and search novels from this source.'}
                </p>
              </div>

              {/* Single Source Isolated Search Input */}
              <form onSubmit={handleSingleSourceSearch} style={{ display: 'flex', gap: 10, minWidth: 300 }}>
                <div className="search-pill" style={{ flex: 1, padding: '8px 14px' }}>
                  <Search size={16} strokeWidth={1.8} style={{ color: 'var(--text-3)' }} />
                  <input
                    type="text"
                    className="search-input"
                    placeholder={`Search within ${selectedSource.name}...`}
                    value={singleSearchQuery}
                    onChange={(e) => setSingleSearchQuery(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
                  Search
                </button>
              </form>
            </div>
          </div>

          {/* Source Feed Grid */}
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700 }}>
              {singleSearchQuery ? `Search Results in ${selectedSource.name}` : `Catalog Feed for ${selectedSource.name}`}
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Showing {sourceFeed.length} Titles
            </span>
          </div>

          {loadingFeed || isSearchingSingle ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-2)' }}>
              <RefreshCw size={24} className="spin" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14 }}>Fetching catalog from {selectedSource.name}...</p>
            </div>
          ) : sourceFeed.length === 0 ? (
            <div className="console-card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-2)' }}>
              <BookOpen size={32} style={{ marginBottom: 12, color: 'var(--text-3)' }} />
              <p style={{ fontSize: 15, fontWeight: 600 }}>No titles found for this search in {selectedSource.name}.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
              {sourceFeed.map((novel) => (
                <div
                  key={novel.id}
                  className="console-card"
                  style={{ display: 'flex', gap: 16, cursor: 'pointer', padding: 16 }}
                  onClick={() => onSelectNovel(novel)}
                >
                  <div
                    style={{
                      width: 80,
                      height: 110,
                      borderRadius: 10,
                      overflow: 'hidden',
                      flexShrink: 0,
                      backgroundColor: 'var(--surface-2)',
                    }}
                  >
                    <img
                      src={novel.cover || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80'}
                      alt={novel.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                    <div>
                      {novel.chineseTitle && (
                        <span className="status-pill status-neutral" style={{ fontSize: 9, marginBottom: 4, display: 'inline-block' }}>
                          {novel.chineseTitle}
                        </span>
                      )}
                      <h4 className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 }}>
                        {novel.title}
                      </h4>
                      <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
                        By {novel.author || 'Anonymous'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                      <span style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        Open Details <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="console-card" style={{ padding: 24, marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'var(--blue-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--blue)',
                }}
              >
                <Search size={18} strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
                  Global Search
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
                  Search across all {sources.length} sources at once
                </p>
              </div>
            </div>

            <form onSubmit={handleGlobalSearch} style={{ display: 'flex', gap: 10 }}>
              <div className="search-pill" style={{ flex: 1, padding: '10px 14px' }}>
                <Search size={16} strokeWidth={1.8} style={{ color: 'var(--text-3)' }} />
                <input
                  type="text"
                  className="search-input"
                  placeholder={`Search all ${sources.length} sources...`}
                  value={globalQuery}
                  onChange={(e) => setGlobalQuery(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '10px 20px', fontSize: 13 }} disabled={globalLoading}>
                {globalLoading ? (
                  <RefreshCw size={14} className="spin" />
                ) : (
                  <Search size={14} strokeWidth={1.8} />
                )}
                <span>{globalLoading ? 'Searching...' : 'Search All'}</span>
              </button>
            </form>

            {/* Global Search Results grouped by source */}
            {globalResults.length > 0 && (
              <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
                  Found results in {globalResults.length} source{globalResults.length !== 1 ? 's' : ''}
                </div>

                {globalResults.map((group) => (
                  <div key={group.sourceId} style={{ marginBottom: 12 }}>
                    {/* Collapsible group header */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.sourceId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        color: 'var(--text-1)',
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: 'Space Grotesk, sans-serif',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface)')}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Globe size={14} style={{ color: 'var(--blue)' }} />
                        {group.sourceName}
                        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>
                          ({group.items.length} result{group.items.length !== 1 ? 's' : ''})
                        </span>
                      </span>
                      <ChevronDown
                        size={16}
                        style={{
                          color: 'var(--text-3)',
                          transition: 'transform 0.2s ease',
                          transform: collapsedGroups.has(group.sourceId) ? 'rotate(-90deg)' : 'rotate(0deg)',
                        }}
                      />
                    </button>

                    {/* Collapsible items */}
                    {!collapsedGroups.has(group.sourceId) && (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {group.items.map((novel) => (
                          <div
                            key={novel.id}
                            className="console-card"
                            style={{ display: 'flex', gap: 14, cursor: 'pointer', padding: 12 }}
                            onClick={() => onSelectNovel(novel)}
                          >
                            <div
                              style={{
                                width: 52,
                                height: 72,
                                borderRadius: 8,
                                overflow: 'hidden',
                                flexShrink: 0,
                                backgroundColor: 'var(--surface-2)',
                              }}
                            >
                              <img
                                src={novel.cover || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80'}
                                alt={novel.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, minWidth: 0 }}>
                              <h4
                                className="font-display"
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: 'var(--text-1)',
                                  lineHeight: 1.3,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {novel.title}
                              </h4>
                              {novel.author && (
                                <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
                                  By {novel.author}
                                </p>
                              )}
                              <span
                                style={{
                                  fontSize: 11,
                                  color: 'var(--blue)',
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  marginTop: 6,
                                }}
                              >
                                Open Details <ChevronRight size={12} />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {globalLoading && (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-2)' }}>
                <RefreshCw size={20} className="spin" style={{ marginBottom: 8 }} />
                <p style={{ fontSize: 13 }}>Searching across all sources...</p>
              </div>
            )}

            {!globalLoading && globalQuery && globalResults.length === 0 && (
              <div style={{ marginTop: 20, padding: '24px 0', textAlign: 'center', color: 'var(--text-2)' }}>
                <BookOpen size={24} style={{ marginBottom: 8, color: 'var(--text-3)' }} />
                <p style={{ fontSize: 13 }}>No results found across any source for &quot;{globalQuery}&quot;.</p>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 32 }}>
            <h1 className="font-display" style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-1)' }}>
              Source Repositories
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
              Select a source to browse its native feed or perform single-source searches.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 24 }}>
            {sources.map((src) => (
              <div
                key={src.id}
                className="console-card"
                style={{ padding: 24, cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => setSelectedSource(src)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: 'var(--blue-soft)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--blue)',
                      }}
                    >
                      <Globe size={22} strokeWidth={1.8} />
                    </div>
                    <div>
                      <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>
                        {src.name}
                      </h3>
                      <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'Space Grotesk' }}>
                        ID: {src.id}
                      </span>
                    </div>
                  </div>

                  <span className="status-pill status-blue" style={{ fontSize: 11 }}>
                    ONLINE
                  </span>
                </div>

                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 20 }}>
                  {src.description || 'Web novel source with catalog and search.'}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    Base: {src.baseUrl.replace('https://', '').replace('/', '')}
                  </span>
                  <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }}>
                    <span>Open Feed</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
