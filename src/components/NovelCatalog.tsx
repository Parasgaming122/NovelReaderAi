'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Globe,
  Zap,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Filter,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { NovelItem, NovelSourceInfo } from '@/lib/types';

interface NovelCatalogProps {
  sources: NovelSourceInfo[];
  onSelectNovel: (novel: NovelItem) => void;
  onSelectSource: (sourceId: string) => void;
}

const FEATURED_NOVELS: NovelItem[] = [
  {
    id: 'https://www.novel543.com/0_1/',
    title: 'Lord of the Mysteries',
    chineseTitle: '诡秘之主',
    url: 'https://www.novel543.com/0_1/',
    sourceId: 'novel543',
    author: 'Cuttlefish That Loves Diving',
    summary:
      'With the rising tide of steam and machinery, who can come close to being a Beyonder? In the shadows of history and mysticism, Zhou Mingrui wakes up in the body of Klein Moretti...',
    cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80',
    status: 'Completed',
    latestChapter: 'Chapter 1402: The Fools Journey',
  },
  {
    id: 'https://www.timotxt.com/txt/2002.html',
    title: 'Circle of Inevitability',
    chineseTitle: '宿命之环',
    url: 'https://www.timotxt.com/txt/2002.html',
    sourceId: 'timotxt',
    author: 'Cuttlefish That Loves Diving',
    summary:
      'In the year 1358, at the end of July, Lumian Lee returned to the village of Cordu in Intis. The crimson moon hung high in the sky as mysteries unfolded...',
    cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
    status: 'Ongoing',
    latestChapter: 'Chapter 890: The Secret of Cordu',
  },
  {
    id: 'https://www.69shuba.pro/txt/3003.html',
    title: 'Deep Space Beyond',
    chineseTitle: '深空彼岸',
    url: 'https://www.69shuba.pro/txt/3003.html',
    sourceId: 'shuba69',
    author: 'Chen Dong',
    summary:
      'Beyond the deep space starry sky lies the origin of ancient myths. As interstellar exploration uncovers ancient secret realm ruins, a young cultivator embarks on a cosmic journey...',
    cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80',
    status: 'Completed',
    latestChapter: 'Chapter 1120: Mythical Origin',
  },
  {
    id: 'https://www.biquge5200.cc/0_4004/',
    title: 'Dao of the Bizarre Immortal',
    chineseTitle: '道诡异仙',
    url: 'https://www.biquge5200.cc/0_4004/',
    sourceId: 'biquge5200',
    author: 'Fox Tail Pen',
    summary:
      'Li Huowang cannot distinguish between hallucination and reality. Is he a patient in a modern psychiatric hospital, or a disciple in a terrifying world of dark immortal cultivation?',
    cover: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=400&q=80',
    status: 'Completed',
    latestChapter: 'Chapter 1018: Truth and Illusion',
  },
  {
    id: 'https://www.xbiquge.info/0_5005/',
    title: 'Beyond the Times',
    chineseTitle: '光阴之外',
    url: 'https://www.xbiquge.info/0_5005/',
    sourceId: 'xbiquge',
    author: 'Er Gen',
    summary:
      'When the divine face descended upon the sky, the world collapsed into mutative miasma. A scavenger boy named Xu Qing rises from the ruins to seize his destiny beyond time...',
    cover: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=400&q=80',
    status: 'Ongoing',
    latestChapter: 'Chapter 942: Scavenger Legend',
  },
];

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
        const saved = localStorage.getItem('plugin_settings');
        let sourcesQuery = '';
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              const activeIds = parsed.filter((p: any) => p.enabled).map((p: any) => p.id);
              if (activeIds.length > 0) {
                sourcesQuery = `?sources=${activeIds.join(',')}`;
              }
            }
          } catch (e) {}
        }

        const res = await fetch(`/api/catalog${sourcesQuery}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.catalogs)) {
          setMultiCatalogs(data.catalogs);
        }
      } catch (err) {
        console.error('Failed to load multi source catalog:', err);
      } finally {
        setLoadingMulti(false);
      }
    }

    loadMultiCatalog();

    const handleUpdate = () => loadMultiCatalog();
    window.addEventListener('plugin_settings_updated', handleUpdate);
    return () => window.removeEventListener('plugin_settings_updated', handleUpdate);
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
            Chinese Web Novel Repositories
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, maxWidth: 640 }}>
            Browse live novel streams across Novel543, 69shuba, TimoTxt, Biquge5200, and XBiquge with auto-translated English titles & posters.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={() => onSelectSource('all')}>
            <Globe size={16} strokeWidth={1.8} />
            <span>All 25+ Sources</span>
          </button>
        </div>
      </div>

      {/* KPI Dashboard Strips */}
      <div className="kpi-grid" style={{ marginBottom: 36 }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Multi-Site Feed Sliders
            </span>
            <div className="kpi-icon-box kpi-icon-blue">
              <Layers size={20} strokeWidth={1.8} />
            </div>
          </div>
          <div className="kpi-val">5 Sources</div>
          <div className="kpi-sub">Novel543, 69shuba, TimoTxt & more</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              CF Bypass Engine
            </span>
            <div className="kpi-icon-box kpi-icon-orange">
              <Zap size={20} strokeWidth={1.8} />
            </div>
          </div>
          <div className="kpi-val">Active</div>
          <div className="kpi-sub">Header spoofing & session replay</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              English Translation
            </span>
            <div className="kpi-icon-box kpi-icon-blue">
              <CheckCircle2 size={20} strokeWidth={1.8} />
            </div>
          </div>
          <div className="kpi-val">Auto-Enabled</div>
          <div className="kpi-sub">Titles, summaries & chapter contents</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              24-Hour Cache
            </span>
            <div className="kpi-icon-box kpi-icon-orange">
              <TrendingUp size={20} strokeWidth={1.8} />
            </div>
          </div>
          <div className="kpi-val">Cached</div>
          <div className="kpi-sub">Fast & zero redundant API calls</div>
        </div>
      </div>

      {/* Dynamic Source Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 32 }}>
          <h2 className="font-display" style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>
            📚 Multi-Website Source Sliders
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
            Explore fresh releases and top novels extracted directly from each source repository with posters and auto-translation.
          </p>
        </div>

        {loadingMulti ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-2)' }}>
            <RefreshCw size={28} className="spin" style={{ marginBottom: 12, color: 'var(--blue)' }} />
            <p style={{ fontSize: 14, fontWeight: 600 }}>Loading live sliders across Novel543, 69shuba, TimoTxt & Biquge...</p>
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
                    No items retrieved for this source stream currently.
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
