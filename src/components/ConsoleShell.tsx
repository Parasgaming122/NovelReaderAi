'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Bookmark,
  Globe,
  Settings,
  Sun,
  Moon,
  Clock,
  Bell,
  Sparkles,
} from 'lucide-react';

type TabId = 'catalog' | 'sources' | 'search' | 'shelf' | 'settings';

interface ConsoleShellProps {
  children: React.ReactNode;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  onSearchSubmit: (query: string) => void;
}

export default function ConsoleShell({
  children,
  activeTab,
  setActiveTab,
  onSearchSubmit,
}: ConsoleShellProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      onSearchSubmit(searchQuery.trim());
      setActiveTab('search');
    }
  };

  return (
    <div className="app-container">
      {/* Left Fixed Icon Rail */}
      <nav className="icon-rail" aria-label="Main Navigation">
        <div style={{ marginBottom: 28, color: 'var(--blue)', fontWeight: 800 }}>
          <Sparkles size={28} strokeWidth={2} />
        </div>

        <button
          className={`rail-item ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
          aria-label="Novel Catalog"
        >
          <BookOpen size={20} strokeWidth={1.8} />
          <span className="rail-tooltip">Catalog</span>
        </button>

        <button
          className={`rail-item ${activeTab === 'sources' ? 'active' : ''}`}
          onClick={() => setActiveTab('sources')}
          aria-label="Sources Feed"
        >
          <Globe size={20} strokeWidth={1.8} />
          <span className="rail-tooltip">Sources</span>
        </button>

        <button
          className={`rail-item ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
          aria-label="Multi-Source Search"
        >
          <Search size={20} strokeWidth={1.8} />
          <span className="rail-tooltip">Multi-Source Search</span>
        </button>

        <button
          className={`rail-item ${activeTab === 'shelf' ? 'active' : ''}`}
          onClick={() => setActiveTab('shelf')}
          aria-label="Reading Bookshelf"
        >
          <Bookmark size={20} strokeWidth={1.8} />
          <span className="rail-tooltip">Bookshelf</span>
        </button>

        <button
          className={`rail-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          aria-label="Console Settings"
        >
          <Settings size={20} strokeWidth={1.8} />
          <span className="rail-tooltip">Settings</span>
        </button>
      </nav>

      {/* Main Wrapper */}
      <div className="main-wrapper">
        {/* Sticky Frosted Top App Bar */}
        <header className="top-bar">
          {/* Search Pill */}
          <form
            className="search-pill"
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                onSearchSubmit(searchQuery.trim());
                setActiveTab('search');
              }
            }}
          >
            <button
              type="submit"
              style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
              title="Execute Search"
            >
              <Search size={16} strokeWidth={1.8} style={{ color: 'var(--blue)' }} />
            </button>
            <input
              type="text"
              className="search-input"
              placeholder="Search novels, authors, or sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {/* Right Header Status Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Live Clock */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', fontFamily: 'Space Grotesk' }}>
              <Clock size={15} strokeWidth={1.8} />
              <span>{currentTime}</span>
            </div>

            {/* Theme Toggle Button */}
            <button
              className="btn-secondary"
              onClick={toggleTheme}
              style={{ padding: '8px 14px', borderRadius: 999 }}
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={16} strokeWidth={1.8} /> : <Sun size={16} strokeWidth={1.8} />}
              <span style={{ fontSize: 12 }}>{theme === 'light' ? 'Dark' : 'Light'}</span>
            </button>

            {/* Notifications Dot */}
            <div style={{ position: 'relative', cursor: 'pointer', color: 'var(--text-2)' }}>
              <Bell size={18} strokeWidth={1.8} />
              <div className="live-dot" style={{ position: 'absolute', top: -2, right: -2 }} />
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
