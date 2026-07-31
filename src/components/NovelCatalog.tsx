'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Globe,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { NovelItem, NovelSourceInfo } from '@/lib/types';

interface NovelCatalogProps {
  sources: NovelSourceInfo[];
  onSelectNovel: (novel: NovelItem) => void;
  onSelectSource: (sourceId: string) => void;
}

interface MultiSourceCatalogGroup {
  sourceId: string;
  sourceName: string;
  icon?: string;
  items: NovelItem[];
}

export default function NovelCatalog({
  sources,
  onSelectNovel,
  onSelectSource,
}: NovelCatalogProps) {
  const [multiCatalogs, setMultiCatalogs] = useState<MultiSourceCatalogGroup[]>([]);
  const [loadingMulti, setLoadingMulti] = useState(true);
  const sliderRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    async function loadMultiCatalog() {
      setLoadingMulti(true);
      try {
        const res = await fetch('/api/catalog');
        const data = await res.json();
        if (data.success && Array.isArray(data.catalogs)) {
          setMultiCatalogs(data.catalogs);
        }
      } catch (err) {
        console.error('Failed to load catalog:', err);
      } finally {
        setLoadingMulti(false);
      }
    }

    loadMultiCatalog();
  }, []);

  const scrollSlider = (sourceId: string, direction: 'left' | 'right') => {
    const el = sliderRefs.current[sourceId];
    if (el) {
      const scrollAmount = direction === 'left' ? -420 : 420;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="fade-up">
      {/* Header Banner */}
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="status-pill status-blue" style={{ fontSize: 11 }}>
              <Sparkles size={13} /> Multi-Source Catalog
            </span>
            <span className="status-pill status-orange" style={{ fontSize: 11 }}>
              Auto-English Translated
            </span>
          </div>
          <h1
            className="font-display"
            style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.8px', color: 'var(--text-1)' }}
          >
            Novel Catalog
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, maxWidth: 640 }}>
            Browse novels from multiple sources with real-time auto-translation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={() => onSelectSource('all')}>
            <Globe size={16} strokeWidth={1.8} />
            <span>Browse Sources</span>
          </button>
        </div>
      </div>

      {/* KPI: Number of Sources */}
      <div className="kpi-grid" style={{ marginBottom: 36 }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Available Sources
            </span>
            <div className="kpi-icon-box kpi-icon-blue">
              <Globe size={20} strokeWidth={1.8} />
            </div>
          </div>
          <div className="kpi-val">{sources.length} Sources</div>
          <div className="kpi-sub">Web novel repositories</div>
        </div>
      </div>

      {/* Dynamic Source Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 32 }}>
          <h2 className="font-display" style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>
            Multi-Source Catalog
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
            Browse the latest releases from each source repository with auto-translated titles and covers.
          </p>
        </div>

        {loadingMulti ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-2)' }}>
            <RefreshCw size={28} className="spin" style={{ marginBottom: 12, color: 'var(--blue)' }} />
            <p style={{ fontSize: 14, fontWeight: 600 }}>Loading catalog from all sources...</p>
          </div>
        ) : (
          multiCatalogs.map((cat) => {
            const hasItems = cat.items && cat.items.length > 0;
            return (
              <div key={cat.sourceId} className="console-card" style={{ padding: '24px 28px' }}>
                {/* Source Slider Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        backgroundColor: 'var(--blue-soft)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--blue)',
                        fontWeight: 700,
                      }}
                    >
                      <Globe size={18} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>
                          {cat.sourceName}
                        </h3>
                        <span className="status-pill status-blue" style={{ fontSize: 10 }}>
                          {cat.sourceId.toUpperCase()}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {cat.items.length} titles available in slider
                      </span>
                    </div>
                  </div>

                  {/* Slider Control Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '8px 12px', borderRadius: 8 }}
                      onClick={() => scrollSlider(cat.sourceId, 'left')}
                      aria-label="Scroll left"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '8px 12px', borderRadius: 8 }}
                      onClick={() => scrollSlider(cat.sourceId, 'right')}
                      aria-label="Scroll right"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '8px 14px', borderRadius: 8, marginLeft: 8 }}
                      onClick={() => onSelectSource(cat.sourceId)}
                    >
                      <span>View Feed</span>
                    </button>
                  </div>
                </div>

                {/* Horizontal Scroll Container */}
                {!hasItems ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                    No titles found for this source.
                  </div>
                ) : (
                  <div
                    ref={(el) => {
                      sliderRefs.current[cat.sourceId] = el;
                    }}
                    style={{
                      display: 'flex',
                      gap: 20,
                      overflowX: 'auto',
                      scrollBehavior: 'smooth',
                      paddingBottom: 12,
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                    }}
                  >
                    {cat.items.map((novel, idx) => (
                      <div
                        key={`${cat.sourceId}-${novel.id || idx}-${idx}`}
                        style={{
                          width: 170,
                          flexShrink: 0,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          borderRadius: 12,
                          overflow: 'hidden',
                          backgroundColor: 'var(--surface-1)',
                          border: '1px solid var(--border)',
                          padding: 12,
                          transition: 'all 0.2s ease',
                        }}
                        onClick={() => onSelectNovel(novel)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--blue)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.transform = 'none';
                        }}
                      >
                        {/* Poster Cover Image */}
                        <div
                          style={{
                            width: '100%',
                            height: 220,
                            borderRadius: 8,
                            overflow: 'hidden',
                            backgroundColor: 'var(--surface-2)',
                            marginBottom: 10,
                            position: 'relative',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                          }}
                        >
                          <img
                            src={
                              novel.cover ||
                              'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80'
                            }
                            alt={novel.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          {novel.chineseTitle && (
                            <span
                              style={{
                                position: 'absolute',
                                bottom: 6,
                                left: 6,
                                right: 6,
                                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                                color: '#ffffff',
                                fontSize: 10,
                                padding: '2px 6px',
                                borderRadius: 4,
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                backdropFilter: 'blur(4px)',
                              }}
                            >
                              {novel.chineseTitle}
                            </span>
                          )}
                        </div>

                        {/* Card Meta */}
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                          <div>
                            <h4
                              className="font-display"
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: 'var(--text-1)',
                                lineHeight: 1.3,
                                marginBottom: 4,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                height: 34,
                              }}
                            >
                              {novel.title}
                            </h4>

                            <p
                              style={{
                                fontSize: 11,
                                color: 'var(--text-2)',
                                fontWeight: 500,
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                marginBottom: 6,
                              }}
                            >
                              By {novel.author || 'Anonymous'}
                            </p>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingTop: 8,
                              borderTop: '1px solid var(--border)',
                              fontSize: 10,
                              fontWeight: 600,
                              color: 'var(--blue)',
                            }}
                          >
                            <span>Read Novel</span>
                            <ChevronRight size={13} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
