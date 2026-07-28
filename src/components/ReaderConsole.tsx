'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Globe,
  Settings,
  List,
  Sparkles,
  RefreshCw,
  Zap,
  BookOpen,
  Sliders,
  X,
  Type,
} from 'lucide-react';
import { ChapterItem, NovelItem } from '@/lib/types';

interface ReaderConsoleProps {
  novel: NovelItem;
  initialChapter: ChapterItem;
  allChapters: ChapterItem[];
  onBack: () => void;
}

export default function ReaderConsole({
  novel,
  initialChapter,
  allChapters,
  onBack,
}: ReaderConsoleProps) {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(
    allChapters.findIndex((c) => c.url === initialChapter.url) !== -1
      ? allChapters.findIndex((c) => c.url === initialChapter.url)
      : 0
  );

  const currentChapter = allChapters[currentChapterIndex] || initialChapter;

  const [loading, setLoading] = useState(true);
  const [chapterData, setChapterData] = useState<{
    title: string;
    rawHtml: string;
    translatedHtml: string;
    rawText: string;
  } | null>(null);

  // Reader Settings
  const [translationMode, setTranslationMode] = useState<'en' | 'zh' | 'bilingual'>('en');
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'display'>('sans');
  const [readerBg, setReaderBg] = useState<'paper' | 'dark' | 'black'>('paper');
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showTocDrawer, setShowTocDrawer] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);

  // Active Source Selection
  const [activeSource, setActiveSource] = useState(novel.sourceId || 'novel543');

  // Load Chapter Content
  useEffect(() => {
    async function loadChapter() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/chapter?url=${encodeURIComponent(currentChapter.url)}&translate=true&lang=en`
        );
        const data = await res.json();
        if (data.success) {
          setChapterData({
            title: data.title || currentChapter.title,
            rawHtml: data.rawHtml || '',
            translatedHtml: data.translatedHtml || data.rawHtml || '',
            rawText: data.rawText || '',
          });
        }
      } catch (err) {
        console.error('Error fetching chapter:', err);
      } finally {
        setLoading(false);
      }
    }

    loadChapter();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentChapter, activeSource]);

  // Track Reading Scroll Progress
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
        setReadingProgress(Math.round(progress));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
    }
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < allChapters.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
    }
  };

  // Font family styles mapping
  const getFontFamilyStyle = () => {
    if (fontFamily === 'serif') return 'Georgia, serif';
    if (fontFamily === 'display') return "'Space Grotesk', sans-serif";
    return "'Plus Jakarta Sans', sans-serif";
  };

  // Reader Background Theme Mapping
  const getReaderBgStyle = () => {
    if (readerBg === 'black') return { bg: '#090a0d', text: '#d1d5db', border: '#1f2937' };
    if (readerBg === 'dark') return { bg: '#262a31', text: '#edeef1', border: '#323842' };
    return { bg: '#fcfaf6', text: '#272219', border: '#e8e0d4' };
  };

  const bgTheme = getReaderBgStyle();

  return (
    <div className="fade-up" style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Floating Top Progress Line */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: 'var(--surface-3)',
          zIndex: 100,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${readingProgress}%`,
            backgroundColor: 'var(--blue)',
            transition: 'width 0.1s ease',
          }}
        />
      </div>

      {/* Reader Control Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          padding: '12px 20px',
          backgroundColor: 'var(--surface)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-secondary" onClick={onBack} style={{ padding: '8px 14px', fontSize: 13 }}>
            <ArrowLeft size={16} strokeWidth={1.8} />
            <span>Novel Overview</span>
          </button>

          <button
            className="btn-secondary"
            onClick={() => setShowTocDrawer(true)}
            style={{ padding: '8px 14px', fontSize: 13 }}
          >
            <List size={16} strokeWidth={1.8} />
            <span>Chapters ({currentChapterIndex + 1}/{allChapters.length})</span>
          </button>
        </div>

        {/* Translation Mode Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className={`status-pill ${translationMode === 'en' ? 'status-blue' : 'status-neutral'}`}
            onClick={() => setTranslationMode('en')}
            style={{ cursor: 'pointer', padding: '6px 14px', fontSize: 12 }}
          >
            English (Translated)
          </button>

          <button
            className={`status-pill ${translationMode === 'bilingual' ? 'status-orange' : 'status-neutral'}`}
            onClick={() => setTranslationMode('bilingual')}
            style={{ cursor: 'pointer', padding: '6px 14px', fontSize: 12 }}
          >
            Bilingual (ZH + EN)
          </button>

          <button
            className={`status-pill ${translationMode === 'zh' ? 'status-blue' : 'status-neutral'}`}
            onClick={() => setTranslationMode('zh')}
            style={{ cursor: 'pointer', padding: '6px 14px', fontSize: 12 }}
          >
            Original Chinese (ZH)
          </button>
        </div>

        {/* Customization Drawer Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn-secondary"
            onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
            style={{ padding: '8px 14px', fontSize: 13 }}
          >
            <Sliders size={16} strokeWidth={1.8} />
            <span>Format Controls</span>
          </button>
        </div>
      </div>

      {/* Reader Settings Floating Panel */}
      {showSettingsDrawer && (
        <div
          className="console-card fade-up"
          style={{
            marginBottom: 24,
            padding: 24,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 20,
            border: '1px solid var(--blue)',
          }}
        >
          {/* Font Size Adjuster */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
              Font Size ({fontSize}px)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn-secondary" onClick={() => setFontSize(Math.max(14, fontSize - 2))} style={{ padding: '6px 12px' }}>-</button>
              <input
                type="range"
                min="14"
                max="28"
                step="2"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <button className="btn-secondary" onClick={() => setFontSize(Math.min(28, fontSize + 2))} style={{ padding: '6px 12px' }}>+</button>
            </div>
          </div>

          {/* Line Height Adjuster */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
              Line Height ({lineHeight})
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1.5, 1.8, 2.0].map((lh) => (
                <button
                  key={lh}
                  className={`btn-secondary ${lineHeight === lh ? 'status-blue' : ''}`}
                  onClick={() => setLineHeight(lh)}
                  style={{ flex: 1, padding: '6px 0', fontSize: 12 }}
                >
                  {lh}x
                </button>
              ))}
            </div>
          </div>

          {/* Reader Canvas Theme */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
              Canvas Theme
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-secondary"
                onClick={() => setReaderBg('paper')}
                style={{ flex: 1, padding: '6px 0', fontSize: 12, backgroundColor: '#fcfaf6', color: '#272219' }}
              >
                Paper
              </button>
              <button
                className="btn-secondary"
                onClick={() => setReaderBg('dark')}
                style={{ flex: 1, padding: '6px 0', fontSize: 12, backgroundColor: '#262a31', color: '#edeef1' }}
              >
                Dark
              </button>
              <button
                className="btn-secondary"
                onClick={() => setReaderBg('black')}
                style={{ flex: 1, padding: '6px 0', fontSize: 12, backgroundColor: '#090a0d', color: '#d1d5db' }}
              >
                Pitch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Chapter Content Container */}
      <div
        className="console-card"
        style={{
          padding: '48px 56px',
          backgroundColor: bgTheme.bg,
          color: bgTheme.text,
          borderColor: bgTheme.border,
          minHeight: 600,
          boxShadow: 'var(--shadow-card)',
          transition: 'background-color 0.3s ease, color 0.3s ease',
        }}
      >
        {loading ? (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-2)' }}>
            <RefreshCw size={28} strokeWidth={1.8} className="spin" style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 15, fontWeight: 600, fontFamily: 'Space Grotesk' }}>
              Bypassing Cloudflare protection & translating chapter...
            </p>
          </div>
        ) : (
          <div>
            {/* Chapter Header Title */}
            <div style={{ textAlign: 'center', marginBottom: 40, borderBottom: `1px solid ${bgTheme.border}`, paddingBottom: 24 }}>
              <span className="status-pill status-blue" style={{ fontSize: 11, marginBottom: 12 }}>
                CHAPTER {currentChapterIndex + 1} OF {allChapters.length}
              </span>

              <h1
                style={{
                  fontSize: fontSize + 8,
                  fontWeight: 700,
                  fontFamily: 'Space Grotesk',
                  marginTop: 12,
                  lineHeight: 1.3,
                }}
              >
                {chapterData?.title || currentChapter.title}
              </h1>

              <p style={{ fontSize: 13, opacity: 0.7, marginTop: 8 }}>
                Novel: {novel.title} | Source: {activeSource.toUpperCase()}
              </p>
            </div>

            {/* Chapter Text Body */}
            <div
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                fontFamily: getFontFamilyStyle(),
              }}
            >
              {translationMode === 'en' && (
                <div
                  dangerouslySetInnerHTML={{ __html: chapterData?.translatedHtml || '' }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1.2em' }}
                />
              )}

              {translationMode === 'zh' && (
                <div
                  dangerouslySetInnerHTML={{ __html: chapterData?.rawHtml || '' }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1.2em' }}
                />
              )}

              {translationMode === 'bilingual' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                  <div>
                    <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12, opacity: 0.6 }}>
                      Original Chinese (ZH)
                    </h4>
                    <div dangerouslySetInnerHTML={{ __html: chapterData?.rawHtml || '' }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12, opacity: 0.6 }}>
                      English Translation (EN)
                    </h4>
                    <div dangerouslySetInnerHTML={{ __html: chapterData?.translatedHtml || '' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Chapter Navigation */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 64,
                paddingTop: 32,
                borderTop: `1px solid ${bgTheme.border}`,
              }}
            >
              <button
                className="btn-secondary"
                onClick={handlePrevChapter}
                disabled={currentChapterIndex === 0}
                style={{ opacity: currentChapterIndex === 0 ? 0.5 : 1, padding: '12px 24px' }}
              >
                <ChevronLeft size={18} strokeWidth={2} />
                <span>Previous Chapter</span>
              </button>

              <span style={{ fontSize: 13, opacity: 0.8, fontFamily: 'Space Grotesk' }}>
                Progress: {readingProgress}%
              </span>

              <button
                className="btn-primary"
                onClick={handleNextChapter}
                disabled={currentChapterIndex === allChapters.length - 1}
                style={{ opacity: currentChapterIndex === allChapters.length - 1 ? 0.5 : 1, padding: '12px 24px' }}
              >
                <span>Next Chapter</span>
                <ChevronRight size={18} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chapter TOC Drawer Modal */}
      {showTocDrawer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            className="fade-up"
            style={{
              width: 420,
              maxWidth: '90vw',
              backgroundColor: 'var(--surface)',
              height: '100%',
              padding: 32,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-card)',
              borderLeft: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h3 className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>
                Jump to Chapter
              </h3>
              <button className="btn-secondary" onClick={() => setShowTocDrawer(false)} style={{ padding: 8 }}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allChapters.map((chap, idx) => (
                <div
                  key={chap.id}
                  onClick={() => {
                    setCurrentChapterIndex(idx);
                    setShowTocDrawer(false);
                  }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    backgroundColor: idx === currentChapterIndex ? 'var(--blue-soft)' : 'var(--surface-2)',
                    color: idx === currentChapterIndex ? 'var(--blue)' : 'var(--text-1)',
                    fontWeight: idx === currentChapterIndex ? 700 : 500,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {chap.title}
                  </span>
                  {idx === currentChapterIndex && <Sparkles size={16} strokeWidth={2} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
