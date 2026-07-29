'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BookOpen,
  List,
  Search,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Layers,
  Sparkles,
  Globe,
} from 'lucide-react';
import { NovelItem, ChapterItem, AlternativeSourceResult } from '@/lib/types';

interface NovelDetailViewProps {
  novel: NovelItem;
  onBack: () => void;
  onSelectChapter: (chapter: ChapterItem, allChapters: ChapterItem[]) => void;
  onSwitchNovelSource?: (novel: NovelItem) => void;
}

export default function NovelDetailView({
  novel,
  onBack,
  onSelectChapter,
  onSwitchNovelSource,
}: NovelDetailViewProps) {
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tocSearch, setTocSearch] = useState('');
  const [isAscending, setIsAscending] = useState(true);
  const [summary, setSummary] = useState(novel.summary || '');
  const [author, setAuthor] = useState(novel.author || 'Unknown Author');
  const [cover, setCover] = useState(novel.cover || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80');
  const [chineseTitle, setChineseTitle] = useState(novel.chineseTitle || novel.title || '');

  // Copy buttons state
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedChineseTitle, setCopiedChineseTitle] = useState(false);

  // Alternative sources state
  const [altSources, setAltSources] = useState<AlternativeSourceResult[]>([]);
  const [loadingAltSources, setLoadingAltSources] = useState(false);

  useEffect(() => {
    async function fetchAlternativeSources(titleToQuery: string) {
      if (!titleToQuery) return;
      setLoadingAltSources(true);
      try {
        const res = await fetch(`/api/alternative-sources?title=${encodeURIComponent(titleToQuery)}&exclude=${novel.sourceId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.sources)) {
          setAltSources(data.sources);
        }
      } catch (err) {
        console.error('Error fetching alternative sources:', err);
      } finally {
        setLoadingAltSources(false);
      }
    }

    async function loadNovelData() {
      setLoading(true);
      try {
        const targetUrl = novel.url || novel.id;
        const res = await fetch(`/api/novel?url=${encodeURIComponent(targetUrl)}&source=${novel.sourceId}`);
        const data = await res.json();
        if (data.success && data.novel) {
          if (data.novel.chapters) setChapters(data.novel.chapters);
          if (data.novel.summary) setSummary(data.novel.summary);
          if (data.novel.author) setAuthor(data.novel.author);
          if (data.novel.cover) setCover(data.novel.cover);
          if (data.novel.chineseTitle || data.novel.title) {
            const zhName = data.novel.chineseTitle || data.novel.title;
            setChineseTitle(zhName);
            fetchAlternativeSources(zhName);
          }
        }
      } catch (err) {
        console.error('Error fetching novel details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadNovelData();
  }, [novel]);

  const copyToClipboard = (text: string, type: 'translated' | 'chinese') => {
    navigator.clipboard.writeText(text);
    if (type === 'translated') {
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    } else {
      setCopiedChineseTitle(true);
      setTimeout(() => setCopiedChineseTitle(false), 2000);
    }
  };

  const filteredChapters = chapters
    .filter((c) => c.title.toLowerCase().includes(tocSearch.toLowerCase()))
    .sort((a, b) => (isAscending ? 0 : -1));

  return (
    <div className="fade-up">
      {/* Back Button Header */}
      <div style={{ marginBottom: 24 }}>
        <button className="btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} strokeWidth={1.8} />
          <span>Back to Catalog</span>
        </button>
      </div>

      {/* Main Novel Metadata Card */}
      <div className="console-card" style={{ padding: 32, marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {/* Large Cover */}
          <div
            style={{
              width: 180,
              height: 250,
              borderRadius: 16,
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              backgroundColor: 'var(--surface-2)',
            }}
          >
            <img src={cover} alt={novel.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* Detailed Info */}
          <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                <span className="status-pill status-blue" style={{ fontSize: 11 }}>
                  SOURCE: {novel.sourceId.toUpperCase()}
                </span>
                <span className="status-pill status-orange" style={{ fontSize: 11 }}>
                  CHINESE NOVEL (ZH-CN)
                </span>
                <span className="status-pill status-neutral" style={{ fontSize: 11 }}>
                  <ShieldCheck size={12} strokeWidth={2} /> Cloudflare Bypass Ready
                </span>
              </div>

              {/* Translated Main Title + Copy Button */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                <h1
                  className="font-display"
                  style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.25 }}
                >
                  {novel.title}
                </h1>
                <button
                  className="btn-secondary"
                  style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, flexShrink: 0, marginTop: 4 }}
                  onClick={() => copyToClipboard(novel.title, 'translated')}
                  title="Copy English Translated Title"
                >
                  {copiedTitle ? <Check size={14} style={{ color: 'var(--blue)' }} /> : <Copy size={14} />}
                  <span>{copiedTitle ? 'Copied!' : 'Copy Title'}</span>
                </button>
              </div>

              {/* Chinese Original Name + Copy Button */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: 'var(--surface-2)',
                  padding: '6px 12px',
                  borderRadius: 8,
                  marginBottom: 16,
                  border: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>
                  Original Name:
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)', fontFamily: 'Space Grotesk' }}>
                  {chineseTitle}
                </span>
                <button
                  onClick={() => copyToClipboard(chineseTitle, 'chinese')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-2)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                  title="Copy Original Chinese Name"
                >
                  {copiedChineseTitle ? <Check size={12} style={{ color: 'var(--orange)' }} /> : <Copy size={12} />}
                  <span>{copiedChineseTitle ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              <p style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 600, marginBottom: 16 }}>
                Author: <span style={{ color: 'var(--text-1)' }}>{author}</span>
              </p>

              {/* Translated Description */}
              <div
                style={{
                  backgroundColor: 'var(--surface-2)',
                  padding: 16,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  fontSize: 13,
                  color: 'var(--text-2)',
                  lineHeight: 1.6,
                  maxHeight: 120,
                  overflowY: 'auto',
                }}
              >
                {summary || 'No description available for this novel.'}
              </div>
            </div>

            {/* Quick Action Bar */}
            <div style={{ display: 'flex', gap: 16, marginTop: 24, alignItems: 'center' }}>
              {chapters.length > 0 && (
                <button
                  className="btn-primary"
                  onClick={() => onSelectChapter(chapters[0], chapters)}
                  style={{ padding: '12px 24px', fontSize: 14 }}
                >
                  <BookOpen size={18} strokeWidth={1.8} />
                  <span>Start Reading Chapter 1</span>
                </button>
              )}

              <a
                href={novel.url}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{ padding: '12px 20px', fontSize: 14, textDecoration: 'none' }}
              >
                <ExternalLink size={16} strokeWidth={1.8} />
                <span>Visit Source Site</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Alternative Sources Comparison Section */}
      <div className="console-card" style={{ padding: 24, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers size={20} strokeWidth={1.8} style={{ color: 'var(--orange)' }} />
            <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>
              Alternative Sources for Chinese Novels
            </h2>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            Searches other sites using Chinese title &quot;{chineseTitle}&quot;
          </span>
        </div>

        {loadingAltSources ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-2)' }}>
            <RefreshCw size={20} className="spin" style={{ marginBottom: 8 }} />
            <p style={{ fontSize: 13 }}>Querying alternative Chinese repositories...</p>
          </div>
        ) : altSources.length === 0 ? (
          <div style={{ padding: 20, backgroundColor: 'var(--surface-2)', borderRadius: 12, fontSize: 13, color: 'var(--text-3)' }}>
            No alternative source mirrors found for this exact Chinese title right now.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {altSources.map((sourceRes) => (
              <div
                key={sourceRes.sourceId}
                style={{
                  backgroundColor: 'var(--surface-2)',
                  padding: 16,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Globe size={16} style={{ color: 'var(--blue)' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Space Grotesk', color: 'var(--text-1)' }}>
                      {sourceRes.sourceName}
                    </span>
                    <span className="status-pill status-blue" style={{ fontSize: 10 }}>
                      {sourceRes.sourceId.toUpperCase()}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {sourceRes.matches.length} Match(es) Found
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {sourceRes.matches.map((match) => (
                    <div
                      key={match.id}
                      onClick={() => onSwitchNovelSource && onSwitchNovelSource(match)}
                      style={{
                        backgroundColor: 'var(--surface)',
                        padding: 12,
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--blue)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                          {match.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                          {match.author ? `By ${match.author}` : 'Click to switch source'}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        Switch <ChevronRight size={14} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chapter Table of Contents (TOC) Section */}
      <div className="console-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <List size={20} strokeWidth={1.8} style={{ color: 'var(--blue)' }} />
            <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>
              Table of Contents
            </h2>
            <span className="status-pill status-blue" style={{ fontSize: 11 }}>
              {chapters.length} Chapters
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Search Chapter */}
            <div className="search-pill" style={{ width: 220, padding: '6px 12px' }}>
              <Search size={14} strokeWidth={1.8} style={{ color: 'var(--text-3)' }} />
              <input
                type="text"
                className="search-input"
                placeholder="Filter chapters..."
                value={tocSearch}
                onChange={(e) => setTocSearch(e.target.value)}
                style={{ fontSize: 12 }}
              />
            </div>

            {/* Sort Toggle */}
            <button
              className="btn-secondary"
              onClick={() => setIsAscending(!isAscending)}
              style={{ padding: '6px 14px', fontSize: 12 }}
            >
              <span>{isAscending ? '1 ➔ N' : 'N ➔ 1'}</span>
            </button>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-2)' }}>
            <RefreshCw size={24} strokeWidth={1.8} className="spin" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 14 }}>Fetching chapter catalog from {novel.sourceId.toUpperCase()}...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {filteredChapters.map((chap) => (
              <div
                key={chap.id}
                onClick={() => onSelectChapter(chap, chapters)}
                style={{
                  backgroundColor: 'var(--surface-2)',
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--blue)';
                  e.currentTarget.style.backgroundColor = 'var(--hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.backgroundColor = 'var(--surface-2)';
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-1)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {chap.title}
                </span>
                <ChevronRight size={14} strokeWidth={1.8} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
