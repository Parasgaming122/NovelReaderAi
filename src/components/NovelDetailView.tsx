'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BookOpen,
  List,
  Search,
  ChevronRight,
  RefreshCw,
  Copy,
  Check,
  Heart,
} from 'lucide-react';
import { addFavourite, removeFavourite, isFavourite } from '@/lib/favourites';
import { NovelItem, ChapterItem } from '@/lib/types';

interface NovelDetailViewProps {
  novel: NovelItem;
  onBack: () => void;
  onSelectChapter: (chapter: ChapterItem, allChapters: ChapterItem[]) => void;
}

export default function NovelDetailView({
  novel,
  onBack,
  onSelectChapter,
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

  // Favourite state
  const [favourited, setFavourited] = useState(false);

  // Check favourite status on mount/novel change
  useEffect(() => {
    setFavourited(isFavourite(novel.id));
  }, [novel.id]);

  const handleToggleFavourite = () => {
    const enrichedNovel: NovelItem = {
      ...novel,
      title: novel.title,
      chineseTitle: chineseTitle || novel.chineseTitle,
      author: author || novel.author,
      summary: summary || novel.summary,
      cover: cover || novel.cover,
    };
    if (favourited) {
      removeFavourite(novel.id);
      setFavourited(false);
    } else {
      addFavourite(enrichedNovel);
      setFavourited(true);
    }
  };

  useEffect(() => {
    async function loadNovelData() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (novel.bookId) {
          params.set('bookId', novel.bookId);
        }
        params.set('source', novel.sourceId);

        const res = await fetch(`/api/novel?${params.toString()}`);
        const data = await res.json();
        if (data.success && data.novel) {
          if (data.novel.chapters) setChapters(data.novel.chapters);
          if (data.novel.summary) setSummary(data.novel.summary);
          if (data.novel.author) setAuthor(data.novel.author);
          if (data.novel.cover) setCover(data.novel.cover);
          if (data.novel.chineseTitle || data.novel.title) {
            setChineseTitle(data.novel.chineseTitle || data.novel.title);
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

              <button
                className={favourited ? 'btn-primary' : 'btn-secondary'}
                onClick={handleToggleFavourite}
                style={{ padding: '12px 20px', fontSize: 14, borderColor: favourited ? 'var(--red, #ef4444)' : undefined }}
                title={favourited ? 'Remove from Favourites' : 'Add to Favourites'}
              >
                <Heart
                  size={16}
                  strokeWidth={favourited ? 0 : 1.8}
                  fill={favourited ? 'var(--red, #ef4444)' : 'none'}
                  style={{ color: favourited ? 'var(--red, #ef4444)' : 'currentColor' }}
                />
                <span>{favourited ? 'Favourited' : 'Add to Favourites'}</span>
              </button>
            </div>
          </div>
        </div>
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
            <p style={{ fontSize: 14 }}>Fetching chapter catalog...</p>
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
