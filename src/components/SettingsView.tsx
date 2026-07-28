'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Cpu,
  Zap,
  BarChart2,
  CheckCircle2,
  Server,
  ArrowUp,
  ArrowDown,
  ToggleLeft,
  ToggleRight,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { NovelSourceInfo } from '@/lib/types';

interface StatsData {
  bypasser: {
    totalCalls: number;
    tier1Count: number;
    tier2Count: number;
    tier3Count: number;
    tier4Count: number;
  };
  translator: {
    totalCalls: number;
    totalItemsTranslated: number;
    cacheHits: number;
  };
}

export interface PluginSettingItem {
  id: string;
  enabled: boolean;
}

const DEFAULT_PLUGIN_ORDER: PluginSettingItem[] = [
  { id: 'novel543', enabled: true },
  { id: 'shuba69', enabled: true },
  { id: 'timotxt', enabled: true },
  { id: 'ixdzs8', enabled: true },
  { id: 'xbiquge', enabled: true },
];

interface SettingsViewProps {
  onPluginSettingsChange?: (settings: PluginSettingItem[]) => void;
}

export default function SettingsView({ onPluginSettingsChange }: SettingsViewProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<NovelSourceInfo[]>([]);
  const [pluginSettings, setPluginSettings] = useState<PluginSettingItem[]>(DEFAULT_PLUGIN_ORDER);

  // Load sources & plugin settings
  useEffect(() => {
    fetchStats();
    fetchSources();

    const saved = localStorage.getItem('plugin_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPluginSettings(parsed);
        }
      } catch (e) {
        console.error('Failed to parse saved plugin_settings', e);
      }
    }

    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success) {
        setStats({
          bypasser: data.bypasser,
          translator: data.translator,
        });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/sources');
      const data = await res.json();
      if (data.success && Array.isArray(data.sources)) {
        setSources(data.sources);
      }
    } catch (err) {
      console.error('Error fetching sources:', err);
    }
  };

  const saveSettings = (newSettings: PluginSettingItem[]) => {
    setPluginSettings(newSettings);
    localStorage.setItem('plugin_settings', JSON.stringify(newSettings));
    if (onPluginSettingsChange) {
      onPluginSettingsChange(newSettings);
    }
    // Dispatch custom event so app components pick it up
    window.dispatchEvent(new Event('plugin_settings_updated'));
  };

  const togglePlugin = (id: string) => {
    const next = pluginSettings.map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    saveSettings(next);
  };

  const movePlugin = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pluginSettings.length) return;

    const next = [...pluginSettings];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    saveSettings(next);
  };

  const resetPluginOrder = () => {
    saveSettings(DEFAULT_PLUGIN_ORDER);
  };

  return (
    <div className="fade-up">
      {/* Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-1)' }}>
            Console Settings & Source Plugins Manager
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
            Enable or disable novel source plugins, reorder priority preferences, and inspect live Cloudflare bypass stats.
          </p>
        </div>

        <button className="btn-secondary" onClick={fetchStats} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>Refresh Stats</span>
        </button>
      </div>

      {/* Plugin Management & Priority Reordering */}
      <div className="console-card" style={{ padding: 28, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sliders size={22} style={{ color: 'var(--blue)' }} />
            <div>
              <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>
                🔌 Plugin Source Preferences & Order
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-2)' }}>
                Rearrange priority (top plugins appear first) and toggle plugins on/off for catalog & searches.
              </p>
            </div>
          </div>

          <button className="btn-secondary" onClick={resetPluginOrder} style={{ fontSize: 12, padding: '6px 12px' }}>
            <RotateCcw size={14} />
            <span>Reset Default Order</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pluginSettings.map((item, index) => {
            const sourceInfo = sources.find((s) => s.id === item.id);
            const name = sourceInfo ? sourceInfo.name : item.id;
            const desc = sourceInfo ? sourceInfo.description : 'Source scraper plugin';
            const charset = sourceInfo ? sourceInfo.charset || 'UTF-8' : 'UTF-8';

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: item.enabled ? 'var(--surface-1)' : 'var(--surface-2)',
                  opacity: item.enabled ? 1 : 0.6,
                  padding: '14px 18px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Priority Rank & Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      backgroundColor: 'var(--blue-soft)',
                      color: 'var(--blue)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    #{index + 1}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{name}</h4>
                      <span className={`status-pill ${item.enabled ? 'status-blue' : 'status-neutral'}`} style={{ fontSize: 10 }}>
                        {item.enabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                      <span className="status-pill status-neutral" style={{ fontSize: 10 }}>
                        {charset}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{desc}</p>
                  </div>
                </div>

                {/* Actions: Reorder Buttons & Enable Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn-secondary"
                      onClick={() => movePlugin(index, 'up')}
                      disabled={index === 0}
                      style={{ padding: '6px 8px', opacity: index === 0 ? 0.3 : 1 }}
                      title="Move Up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => movePlugin(index, 'down')}
                      disabled={index === pluginSettings.length - 1}
                      style={{ padding: '6px 8px', opacity: index === pluginSettings.length - 1 ? 0.3 : 1 }}
                      title="Move Down"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  <button
                    onClick={() => togglePlugin(item.id)}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: item.enabled ? 'var(--blue)' : 'var(--text-3)',
                      fontWeight: 600,
                      fontSize: 13,
                      padding: '6px 12px',
                      borderRadius: 8,
                      backgroundColor: 'var(--surface-2)',
                    }}
                  >
                    {item.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                    <span>{item.enabled ? 'Active' : 'Off'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Telemetry KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 28 }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Bypasser Requests
            </span>
            <div className="kpi-icon-box kpi-icon-orange">
              <Zap size={20} strokeWidth={1.8} />
            </div>
          </div>
          <div className="kpi-val">{stats ? stats.bypasser.totalCalls : '0'}</div>
          <div className="kpi-sub">Total HTTP / CF requests</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Translation Calls
            </span>
            <div className="kpi-icon-box kpi-icon-blue">
              <Cpu size={20} strokeWidth={1.8} />
            </div>
          </div>
          <div className="kpi-val">{stats ? stats.translator.totalCalls : '0'}</div>
          <div className="kpi-sub">Google Translate API batches</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Items Translated
            </span>
            <div className="kpi-icon-box kpi-icon-blue">
              <BarChart2 size={20} strokeWidth={1.8} />
            </div>
          </div>
          <div className="kpi-val">{stats ? stats.translator.totalItemsTranslated : '0'}</div>
          <div className="kpi-sub">Titles & summaries processed</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Cache Hits
            </span>
            <div className="kpi-icon-box kpi-icon-orange">
              <CheckCircle2 size={20} strokeWidth={1.8} />
            </div>
          </div>
          <div className="kpi-val">{stats ? stats.translator.cacheHits : '0'}</div>
          <div className="kpi-sub">Saved translation API calls</div>
        </div>
      </div>

      {/* Cloudflare Bypasser Tier Breakdown */}
      <div className="console-card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <ShieldCheck size={22} style={{ color: 'var(--blue)' }} />
          <div>
            <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>
              🛡️ Cloudflare Bypasser Tier Telemetry
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-2)' }}>
              Live telemetry tracking of which bypass tier successfully cleared Chinese source anti-bot challenges.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          <div style={{ backgroundColor: 'var(--surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
            <span className="status-pill status-blue" style={{ fontSize: 10, marginBottom: 8, display: 'inline-block' }}>
              TIER 1 (DIRECT)
            </span>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>
              {stats ? stats.bypasser.tier1Count : 0}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>
              Direct HTTP GET requests without challenges
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
            <span className="status-pill status-orange" style={{ fontSize: 10, marginBottom: 8, display: 'inline-block' }}>
              TIER 2 (SPOOFED TLS)
            </span>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>
              {stats ? stats.bypasser.tier2Count : 0}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>
              Spoofed Chrome TLS user-agent & browser headers
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
            <span className="status-pill status-blue" style={{ fontSize: 10, marginBottom: 8, display: 'inline-block' }}>
              TIER 3 (SESSION CACHE)
            </span>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>
              {stats ? stats.bypasser.tier3Count : 0}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>
              Reused cf_clearance session cookies & headers
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
            <span className="status-pill status-neutral" style={{ fontSize: 10, marginBottom: 8, display: 'inline-block' }}>
              TIER 4 (FALLBACK)
            </span>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>
              {stats ? stats.bypasser.tier4Count : 0}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>
              Retried fallback requests or errors
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
