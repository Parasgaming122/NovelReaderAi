'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Cpu,
  Zap,
  BarChart2,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  ToggleLeft,
  ToggleRight,
  RotateCcw,
  Sliders,
  ChevronDown,
  ServerCrash,
  AlertTriangle,
  CircleDot,
} from 'lucide-react';
import { PluginSourceInfo, BypassMethod } from '@/lib/plugins/types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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
  bypassMethods: BypassMethod[];
}

interface SettingsViewProps {
  onPluginSettingsChange?: (settings: PluginSettingItem[]) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BYPASS_METHOD_COLORS: Record<BypassMethod, { bg: string; text: string; label: string }> = {
  smartFetch: { bg: 'rgba(45, 156, 219, 0.15)', text: '#2d9cdb', label: 'Smart Fetch' },
  impit: { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6', label: 'Impit Proxy' },
  browser: { bg: 'rgba(249, 115, 22, 0.15)', text: '#f97316', label: 'Browser Headless' },
  scraper: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', label: 'Scraper API' },
  clientProxy: { bg: 'rgba(156, 163, 175, 0.20)', text: '#9ca3af', label: 'Client Proxy' },
};

const CF_BADGE_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  none: { bg: 'rgba(34, 197, 94, 0.14)', text: '#16a34a', icon: <CheckCircle2 size={12} />, label: 'CF: None' },
  partial: { bg: 'rgba(234, 179, 8, 0.15)', text: '#ca8a04', icon: <AlertTriangle size={12} />, label: 'CF: Partial' },
  full: { bg: 'rgba(239, 68, 68, 0.15)', text: '#dc2626', icon: <ShieldCheck size={12} />, label: 'CF: Full' },
  blocked: { bg: 'rgba(156, 163, 175, 0.18)', text: '#6b7280', icon: <ServerCrash size={12} />, label: 'Site Down' },
};

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */

function getCfBadgeKey(source: PluginSourceInfo): string {
  if (source.blocked) return 'blocked';
  return source.cfBlockLevel || 'none';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SettingsView({ onPluginSettingsChange }: SettingsViewProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sourcesMap, setSourcesMap] = useState<Map<string, PluginSourceInfo>>(new Map());
  const [pluginSettings, setPluginSettings] = useState<PluginSettingItem[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* -------------------------------------------------------------- */
  /*  Fetch stats (polling)                                           */
  /* -------------------------------------------------------------- */
  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success) {
        setStats({ bypasser: data.bypasser, translator: data.translator });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /* -------------------------------------------------------------- */
  /*  Fetch sources & initialise plugin settings                      */
  /* -------------------------------------------------------------- */
  const fetchSources = useCallback(async () => {
    setSourcesLoading(true);
    try {
      const res = await fetch('/api/sources');
      const data = await res.json();
      if (data.success && Array.isArray(data.sources)) {
        const map = new Map<string, PluginSourceInfo>();
        (data.sources as PluginSourceInfo[]).forEach((s) => map.set(s.id, s));
        setSourcesMap(map);

        const saved = localStorage.getItem('plugin_settings');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const savedIds = new Set(parsed.map((p: PluginSettingItem) => p.id));
              const merged: PluginSettingItem[] = [...parsed];
              data.sources.forEach((s: PluginSourceInfo) => {
                if (!savedIds.has(s.id)) {
                  merged.push({
                    id: s.id,
                    enabled: !s.blocked,
                    bypassMethods: s.recommendedBypassMethods || [],
                  });
                }
              });
              setPluginSettings(merged);
              return;
            }
          } catch (e) {
            console.error('Failed to parse saved plugin_settings', e);
          }
        }

        // No saved settings — initialise all plugins from API
        const defaults: PluginSettingItem[] = data.sources.map((s: PluginSourceInfo) => ({
          id: s.id,
          enabled: !s.blocked,
          bypassMethods: s.recommendedBypassMethods || [],
        }));
        setPluginSettings(defaults);
      }
    } catch (err) {
      console.error('Error fetching sources:', err);
    } finally {
      setSourcesLoading(false);
    }
  }, []);

  /* -------------------------------------------------------------- */
  /*  Effects                                                          */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    fetchStats();
    fetchSources();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchSources]);

  /* -------------------------------------------------------------- */
  /*  Persistence & dispatch                                           */
  /* -------------------------------------------------------------- */
  const saveSettings = useCallback(
    (newSettings: PluginSettingItem[]) => {
      setPluginSettings(newSettings);
      localStorage.setItem('plugin_settings', JSON.stringify(newSettings));
      if (onPluginSettingsChange) {
        onPluginSettingsChange(newSettings);
      }
      window.dispatchEvent(new Event('plugin_settings_updated'));
    },
    [onPluginSettingsChange]
  );

  /* -------------------------------------------------------------- */
  /*  Actions                                                          */
  /* -------------------------------------------------------------- */
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
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    saveSettings(next);
  };

  const resetPluginOrder = () => {
    const defaults: PluginSettingItem[] = [];
    sourcesMap.forEach((source, id) => {
      defaults.push({
        id,
        enabled: !source.blocked,
        bypassMethods: source.recommendedBypassMethods || [],
      });
    });
    saveSettings(defaults);
  };

  const toggleBypassMethod = (pluginId: string, method: BypassMethod) => {
    const next = pluginSettings.map((p) => {
      if (p.id !== pluginId) return p;
      const has = p.bypassMethods.includes(method);
      const methods = has
        ? p.bypassMethods.filter((m) => m !== method)
        : [...p.bypassMethods, method];
      return { ...p, bypassMethods: methods };
    });
    saveSettings(next);
  };

  const toggleExpanded = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  /* -------------------------------------------------------------- */
  /*  Counters for header                                              */
  /* -------------------------------------------------------------- */
  const enabledCount = pluginSettings.filter((p) => p.enabled).length;
  const totalCount = pluginSettings.length;

  /* -------------------------------------------------------------- */
  /*  Render                                                           */
  /* -------------------------------------------------------------- */
  return (
    <div className="fade-up">
      {/* Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-1)' }}>
            Console Settings & Source Plugins Manager
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
            Manage all {totalCount} registered source plugins — CF status, bypass methods, priority order & enable/disable.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn-secondary" onClick={fetchSources} disabled={sourcesLoading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={15} className={sourcesLoading ? 'spin' : ''} />
            <span>Refresh Sources</span>
          </button>
          <button className="btn-secondary" onClick={fetchStats} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh Stats</span>
          </button>
        </div>
      </div>

      {/* Plugin Management & Priority Reordering */}
      <div className="console-card plugin-card-static" style={{ padding: 28, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sliders size={22} style={{ color: 'var(--blue)' }} />
            <div>
              <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>
                🔌 Plugin Source Preferences & Order
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-2)' }}>
                {enabledCount} of {totalCount} plugins active — top plugins appear first in catalog & search results.
              </p>
            </div>
          </div>
          <button className="btn-secondary" onClick={resetPluginOrder} style={{ fontSize: 12, padding: '6px 12px' }}>
            <RotateCcw size={14} />
            <span>Reset Defaults</span>
          </button>
        </div>

        {/* Summary bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {(() => {
            const cfCounts = { none: 0, partial: 0, full: 0, blocked: 0 };
            pluginSettings.forEach((p) => {
              const src = sourcesMap.get(p.id);
              if (!src) return;
              const key = src.blocked ? 'blocked' : (src.cfBlockLevel || 'none');
              cfCounts[key as keyof typeof cfCounts]++;
            });
            return (
              <>
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                    backgroundColor: CF_BADGE_STYLES.none.bg, color: CF_BADGE_STYLES.none.text,
                  }}
                >
                  <CircleDot size={10} /> {cfCounts.none} Open
                </span>
                {cfCounts.partial > 0 && (
                  <span
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      backgroundColor: CF_BADGE_STYLES.partial.bg, color: CF_BADGE_STYLES.partial.text,
                    }}
                  >
                    <AlertTriangle size={10} /> {cfCounts.partial} Partial CF
                  </span>
                )}
                {cfCounts.full > 0 && (
                  <span
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      backgroundColor: CF_BADGE_STYLES.full.bg, color: CF_BADGE_STYLES.full.text,
                    }}
                  >
                    <ShieldCheck size={10} /> {cfCounts.full} Full CF
                  </span>
                )}
                {cfCounts.blocked > 0 && (
                  <span
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      backgroundColor: CF_BADGE_STYLES.blocked.bg, color: CF_BADGE_STYLES.blocked.text,
                    }}
                  >
                    <ServerCrash size={10} /> {cfCounts.blocked} Down
                  </span>
                )}
              </>
            );
          })()}
        </div>

        {/* Plugin list — scrollable */}
        <div className="plugin-list-scroll" style={{ maxHeight: 520, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
          {sourcesLoading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)', fontSize: 14 }}>
              <RefreshCw size={20} className="spin" style={{ display: 'inline-block', marginBottom: 10 }} />
              <p>Loading source plugins…</p>
            </div>
          ) : (
            pluginSettings.map((item, index) => {
              const sourceInfo = sourcesMap.get(item.id);
              const name = sourceInfo?.name || item.id;
              const desc = sourceInfo?.description || 'Source scraper plugin';
              const cfKey = sourceInfo ? getCfBadgeKey(sourceInfo) : 'none';
              const cfBadge = CF_BADGE_STYLES[cfKey] || CF_BADGE_STYLES.none;
              const isExpanded = expandedId === item.id;
              const availableMethods: BypassMethod[] = sourceInfo?.availableBypassMethods || [];
              const recommendedMethods: BypassMethod[] = sourceInfo?.recommendedBypassMethods || [];

              return (
                <div
                  key={item.id}
                  className="plugin-list-item"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: item.enabled ? 'var(--surface)' : 'var(--surface-2)',
                    opacity: item.enabled ? 1 : 0.5,
                    borderRadius: 12,
                    border: item.enabled ? '1px solid var(--border)' : '1px dashed var(--border-2)',
                    transition: 'opacity 0.2s ease, border-color 0.2s ease',
                    overflow: 'hidden',
                  }}
                >
                  {/* Main row */}
                  <div
                    className="plugin-list-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      gap: 10,
                      cursor: availableMethods.length > 0 ? 'pointer' : 'default',
                    }}
                    onClick={() => availableMethods.length > 0 && toggleExpanded(item.id)}
                  >
                    {/* Left: priority + info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      {/* Priority badge */}
                      <div
                        style={{
                          width: 30, height: 30, borderRadius: 9,
                          backgroundColor: 'var(--blue-soft)', color: 'var(--blue)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 12, flexShrink: 0,
                          fontFamily: "'Space Grotesk', sans-serif",
                        }}
                      >
                        #{index + 1}
                      </div>

                      {/* Name + badges */}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        {/* Line 1: Name + CF badge + ON/OFF */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>
                            {name}
                          </h4>
                          <span
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '3px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 600,
                              backgroundColor: cfBadge.bg, color: cfBadge.text,
                            }}
                          >
                            {cfBadge.icon} {cfBadge.label}
                          </span>
                          <span className={`status-pill ${item.enabled ? 'status-blue' : 'status-neutral'}`} style={{ fontSize: 9.5 }}>
                            {item.enabled ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        {/* Line 2: ID + bypass methods (muted) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <span
                            style={{
                              fontSize: 10, color: 'var(--text-3)', fontWeight: 500,
                              backgroundColor: 'var(--surface-3)', padding: '2px 8px', borderRadius: 6,
                              fontFamily: "'Space Grotesk', monospace",
                            }}
                          >
                            {item.id}
                          </span>
                          {availableMethods.length > 0 && (
                            <span style={{ fontSize: 10, color: 'var(--text-3)', opacity: 0.7 }}>
                              {item.bypassMethods.length > 0
                                ? item.bypassMethods.map((m) => BYPASS_METHOD_COLORS[m]?.label || m).join(', ')
                                : 'No bypass set'}
                            </span>
                          )}
                        </div>
                        {(isExpanded || cfKey === 'blocked' || cfKey === 'full') && sourceInfo?.cfStatus && (
                          <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 3, lineHeight: 1.4 }}>
                            {sourceInfo.blocked && sourceInfo.blockedReason
                              ? `⚠ ${sourceInfo.blockedReason}`
                              : sourceInfo.cfStatus}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button
                          className="btn-secondary"
                          onClick={() => movePlugin(index, 'up')}
                          disabled={index === 0}
                          style={{ padding: '5px 7px', opacity: index === 0 ? 0.25 : 1 }}
                          title="Move Up"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => movePlugin(index, 'down')}
                          disabled={index === pluginSettings.length - 1}
                          style={{ padding: '5px 7px', opacity: index === pluginSettings.length - 1 ? 0.25 : 1 }}
                          title="Move Down"
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>

                      <button
                        onClick={() => togglePlugin(item.id)}
                        style={{
                          border: 'none', background: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 5,
                          color: item.enabled ? 'var(--blue)' : 'var(--text-3)',
                          fontWeight: 600, fontSize: 12, padding: '5px 10px',
                          borderRadius: 8, backgroundColor: 'var(--surface-2)',
                        }}
                      >
                        {item.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        <span>{item.enabled ? 'Active' : 'Off'}</span>
                      </button>

                      {availableMethods.length > 0 && (
                        <button
                          onClick={() => toggleExpanded(item.id)}
                          style={{
                            border: 'none', background: 'none', cursor: 'pointer',
                            padding: '5px 7px', borderRadius: 8, color: 'var(--text-3)',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                            display: 'flex',
                          }}
                        >
                          <ChevronDown size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded: Bypass Method Selector */}
                  {isExpanded && availableMethods.length > 0 && (
                    <div
                      className="plugin-bypass-panel"
                      style={{
                        padding: '12px 14px 14px 14px',
                        borderTop: '1px solid var(--border)',
                        backgroundColor: 'var(--surface-2)',
                      }}
                    >
                      <div style={{ paddingTop: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>
                            Bypass Methods
                          </span>
                          <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
                            ⭐ = recommended · Click to toggle
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {availableMethods.map((method) => {
                            const isSelected = item.bypassMethods.includes(method);
                            const isRecommended = recommendedMethods.includes(method);
                            const colorInfo = BYPASS_METHOD_COLORS[method];

                            return (
                              <button
                                key={method}
                                onClick={() => toggleBypassMethod(item.id, method)}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  padding: '5px 12px', borderRadius: 999,
                                  fontSize: 11.5, fontWeight: 600,
                                  border: `1.5px solid ${isSelected ? colorInfo.text : 'transparent'}`,
                                  backgroundColor: isSelected ? colorInfo.bg : 'var(--surface-3)',
                                  color: isSelected ? colorInfo.text : 'var(--text-3)',
                                  cursor: 'pointer', transition: 'all 0.15s ease',
                                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                                }}
                                title={`${isRecommended ? 'Recommended · ' : ''}${colorInfo.label}`}
                              >
                                {isRecommended && (
                                  <span style={{ fontSize: 11, lineHeight: 1 }}>⭐</span>
                                )}
                                {colorInfo.label}
                              </button>
                            );
                          })}
                        </div>

                        {sourceInfo?.cfStatus && cfKey !== 'blocked' && (
                          <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 10, lineHeight: 1.5 }}>
                            💡 {sourceInfo.cfStatus}
                          </p>
                        )}
                        {sourceInfo?.blockedReason && (
                          <p style={{ fontSize: 11, color: '#dc2626', marginTop: 6, lineHeight: 1.5 }}>
                            ⚠ Block reason: {sourceInfo.blockedReason}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
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
