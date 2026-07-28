'use client';

import React, { useState } from 'react';
import { Bookmark, Clock, Trash2, BookOpen, ShieldCheck, Cpu } from 'lucide-react';
import { NovelItem } from '@/lib/types';

interface HistoryBookmarksProps {
  onSelectNovel: (novel: NovelItem) => void;
}

export default function HistoryBookmarks({ onSelectNovel }: HistoryBookmarksProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'bookmarks'>('history');

  const sampleHistory: NovelItem[] = [
    {
      id: 'novel543-1001',
      title: '诡秘之主 (Lord of the Mysteries)',
      url: 'https://www.novel543.com/novel/1001.html',
      sourceId: 'novel543',
      author: '爱潜水的乌贼',
      summary: 'With the rising tide of steam and machinery, who can come close to being a Beyonder?',
      cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80',
      latestChapter: 'Chapter 1402: The Fools Journey',
    },
    {
      id: 'timotxt-2002',
      title: '宿命之环 (Circle of Inevitability)',
      url: 'https://www.timotxt.com/txt/2002.html',
      sourceId: 'timotxt',
      author: '爱潜水的乌贼',
      summary: 'In the year 1358, at the end of July, Lumian Lee returned to the village of Cordu...',
      cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
      latestChapter: 'Chapter 890: Secret of Cordu',
    },
  ];

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
          <span>Recently Read ({sampleHistory.length})</span>
        </button>

        <button
          className={`btn-secondary ${activeTab === 'bookmarks' ? 'status-orange' : ''}`}
          onClick={() => setActiveTab('bookmarks')}
        >
          <Bookmark size={16} strokeWidth={1.8} />
          <span>Saved Bookmarks</span>
        </button>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
        {sampleHistory.map((novel) => (
          <div
            key={novel.id}
            className="console-card"
            style={{ display: 'flex', gap: 20, cursor: 'pointer' }}
            onClick={() => onSelectNovel(novel)}
          >
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
              <img src={novel.cover} alt={novel.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
              <div>
                <span className="status-pill status-blue" style={{ fontSize: 10, marginBottom: 6 }}>
                  {novel.sourceId.toUpperCase()}
                </span>
                <h3 className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 }}>
                  {novel.title}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
                  {novel.latestChapter}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>Continue Reading ➔</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
