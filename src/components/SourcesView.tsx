'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Search,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  BookOpen,
  ArrowLeft,
  Server,
  Filter,
} from 'lucide-react';
import { NovelSourceInfo, NovelItem } from '@/lib/types';

interface SourcesViewProps {
  sources: NovelSourceInfo[];
  onSelectNovel: (novel: NovelItem) => void;
}

export default function SourcesView({ sources, onSelectNovel }: SourcesViewProps) {
  const [selectedSource, setSelectedSource] = useState<NovelSourceInfo | null>(null);
  const [orderedSources, setOrderedSources] = useState<NovelSourceInfo[]>(sources);

  useEffect(() => {
    const applyPluginSettings = () => {
      const saved = localStorage.getItem('plugin_settings');
      if (!saved) {
        setOrderedSources(sources);
        return;
      }
      try {
        const parsed: { id: string; enabled: boolean }[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const enabledMap = new Map(parsed.map((p) => [p.id, p.enabled]));
          const orderMap = new Map(parsed.map((p, idx) => [p.id, idx]));

          const filtered = sources.filter((s) => enabledMap.get(s.id) !== false);
          filtered.sort((a, b) => {
            const orderA = orderMap.get(a.id) ?? 99;
            const orderB = orderMap.get(b.id) ?? 99;
            return orderA - orderB;
          });
          setOrderedSources(filtered);
        } else {
          setOrderedSources(sources);
        }
      } catch {
        setOrderedSources(sources);
      }
    };

    applyPluginSettings();
    window.addEventListener('plugin_settings_updated', applyPluginSettings);
    return () => window.removeEventListener('plugin_settings_updated', applyPluginSettings);
  }, [sources]);
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
                  <span className="status-pill status-orange" style={{ fontSize: 11 }}>
                    VERSION {selectedSource.version}
                  </span>
                  <span className="status-pill status-neutral" style={{ fontSize: 11 }}>
                    <ShieldCheck size={12} /> Cloudflare Bypass Active
                  </span>
                </div>
                <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-1)' }}>
                  {selectedSource.name} Feed & Isolated Search
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
                  {selectedSource.description || 'Native TypeScript scraper with GBK/UTF8 decoding.'}
                </p>
              </div>

              {/* Single Source Isolated Search Input */}
              <form onSubmit={handleSingleSourceSearch} style={{ display: 'flex', gap: 10, minWidth: 300 }}>
                <div className="search-pill" style={{ flex: 1, padding: '8px 14px' }}>
                  <Search size={16} strokeWidth={1.8} style={{ color: 'var(--text-3)' }} />
                  <input
                    type="text"
                    className="search-input"
                    placeholder={`Search within ${selectedSource.name} only...`}
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
        /* All Sources Listing View */
        <div>
          <div style={{ marginBottom: 32 }}>
            <h1 className="font-display" style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-1)' }}>
              Source Repositories & Plugin Engine
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
              Select a source to browse its native feed or perform single-source isolated searches.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 24 }}>
            {orderedSources.map((src) => (
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
                        ID: {src.id} | v{src.version}
                      </span>
                    </div>
                  </div>

                  <span className="status-pill status-blue" style={{ fontSize: 11 }}>
                    ONLINE
                  </span>
                </div>

                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 20 }}>
                  {src.description || 'Native TypeScript plugin scraper with 4-tier Cloudflare bypass.'}
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
