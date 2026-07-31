'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Loader2, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';

interface SourceFetchStatus {
  sourceId: string;
  sourceName: string;
  status: 'pending' | 'fetching' | 'success' | 'error';
  items?: number;
  error?: string;
}

interface FetchIndicatorProps {
  statuses: SourceFetchStatus[];
  isComplete: boolean;
  onDismiss?: () => void;
}

export default function FetchIndicator({ statuses, isComplete, onDismiss }: FetchIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissTimer, setDismissTimer] = useState<NodeJS.Timeout | null>(null);

  const completedCount = statuses.filter(s => s.status === 'success' || s.status === 'error').length;
  const totalCount = statuses.length;
  const successCount = statuses.filter(s => s.status === 'success').length;
  const errorCount = statuses.filter(s => s.status === 'error').length;

  // Auto-dismiss 3s after completion
  useEffect(() => {
    if (isComplete && !dismissTimer) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, 3000);
      setDismissTimer(timer);
    }
    return () => {
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [isComplete, dismissTimer, onDismiss]);

  if (!isVisible) return null;

  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
        width: isExpanded ? 360 : 280,
        backgroundColor: 'var(--surface)',
        borderRadius: 16,
        border: '1px solid var(--border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isComplete ? 'translateY(0)' : 'translateY(0)',
        opacity: 1,
      }}
    >
      {/* Header - Click to expand/collapse */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          cursor: 'pointer',
          borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
          backgroundColor: isComplete
            ? (errorCount > 0 ? 'rgba(239,68,68,0.05)' : 'rgba(34,197,94,0.05)')
            : 'var(--surface)',
          transition: 'background-color 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isComplete ? (
            errorCount > 0 ? (
              <XCircle size={18} style={{ color: '#ef4444' }} />
            ) : (
              <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
            )
          ) : (
            <div className="spin">
              <Loader2 size={18} style={{ color: 'var(--blue)' }} />
            </div>
          )}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'Space Grotesk' }}>
              {isComplete
                ? `${successCount}/${totalCount} Sources Loaded`
                : `Fetching from ${totalCount} Sources...`}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>
              {isComplete
                ? `${errorCount} returned no results`
                : `${completedCount}/${totalCount} complete`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Mini progress bar */}
          <div
            style={{
              width: 40,
              height: 4,
              backgroundColor: 'var(--surface-2)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: isComplete ? (errorCount > 0 ? '#ef4444' : '#22c55e') : 'var(--blue)',
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <ChevronDown
            size={14}
            style={{
              color: 'var(--text-3)',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.2s ease',
            }}
          />
        </div>
      </div>

      {/* Expanded: Source list */}
      {isExpanded && (
        <div style={{ padding: '8px 12px', maxHeight: 240, overflowY: 'auto' }}>
          {statuses.map((source) => (
            <div
              key={source.sourceId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: 8,
                marginBottom: 2,
                backgroundColor: source.status === 'fetching' ? 'rgba(59,130,246,0.05)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Globe size={14} style={{ color: 'var(--text-3)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: 600 }}>
                  {source.sourceName}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {source.status === 'pending' && (
                  <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Waiting</span>
                )}
                {source.status === 'fetching' && (
                  <div className="spin">
                    <Loader2 size={12} style={{ color: 'var(--blue)' }} />
                  </div>
                )}
                {source.status === 'success' && (
                  <>
                    <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>
                      {source.items || 0} results
                    </span>
                    <CheckCircle2 size={12} style={{ color: '#22c55e' }} />
                  </>
                )}
                {source.status === 'error' && (
                  <>
                    <span style={{ fontSize: 10, color: '#ef4444' }}>
                      {source.error || 'No results'}
                    </span>
                    <XCircle size={12} style={{ color: '#ef4444' }} />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
