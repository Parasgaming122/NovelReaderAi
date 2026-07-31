'use client';

import React, { useState, useEffect } from 'react';
import { Settings, ChevronDown, ChevronUp, Save } from 'lucide-react';

interface TranslationSettings {
  provider: 'google' | 'gemini' | 'openrouter';
  geminiApiKey: string;
  openrouterApiKey: string;
}

const DEFAULT_SETTINGS: TranslationSettings = {
  provider: 'google',
  geminiApiKey: '',
  openrouterApiKey: '',
};

export default function SettingsView() {
  const [settings, setSettings] = useState<TranslationSettings>(DEFAULT_SETTINGS);
  const [isTranslationExpanded, setIsTranslationExpanded] = useState(true);
  const [isApiKeysExpanded, setIsApiKeysExpanded] = useState(true);
  const [saved, setSaved] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('translation_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error('Failed to parse saved translation settings', e);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('translation_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fade-up">
      {/* Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-1)' }}>
            Settings
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
            Configure translation providers and API keys. Google Translate is always used for UI text (titles, summaries). Gemini and OpenRouter are optional and only used for chapter content.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={handleSave}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {saved ? <Save size={15} /> : <Save size={15} />}
          <span>{saved ? 'Saved!' : 'Save Settings'}</span>
        </button>
      </div>

      {/* Section 1: Translation Provider */}
      <div className="console-card" style={{ padding: 28, marginBottom: 24 }}>
        <div
          onClick={() => setIsTranslationExpanded(!isTranslationExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            marginBottom: isTranslationExpanded ? 20 : 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Settings size={22} style={{ color: 'var(--blue)' }} />
            <div>
              <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>
                Translation Provider
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-2)' }}>
                Choose which service translates novel content.
              </p>
            </div>
          </div>
          {isTranslationExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>

        {isTranslationExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Google Translate */}
            <div
              onClick={() => setSettings({ ...settings, provider: 'google' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: 12,
                border: `2px solid ${settings.provider === 'google' ? 'var(--blue)' : 'var(--border)'}`,
                backgroundColor: settings.provider === 'google' ? 'var(--blue-soft)' : 'var(--surface-2)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
                  Google Translate
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                  Default translator for all UI text and chapter content. No API key required.
                </div>
              </div>
              <span
                className="status-pill status-blue"
                style={{ fontSize: 11, opacity: settings.provider === 'google' ? 1 : 0.4 }}
              >
                {settings.provider === 'google' ? 'Active' : 'Available'}
              </span>
            </div>

            {/* Gemini */}
            <div
              onClick={() => setSettings({ ...settings, provider: 'gemini' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: 12,
                border: `2px solid ${settings.provider === 'gemini' ? 'var(--orange)' : 'var(--border)'}`,
                backgroundColor: settings.provider === 'gemini' ? 'rgba(249,115,22,0.05)' : 'var(--surface-2)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
                  Gemini
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                  Optional. Used for chapter content translation only (not UI text). Requires a Gemini API key.
                </div>
              </div>
              <span
                className={`status-pill ${settings.provider === 'gemini' ? 'status-orange' : 'status-neutral'}`}
                style={{ fontSize: 11, opacity: settings.provider === 'gemini' ? 1 : 0.4 }}
              >
                {settings.provider === 'gemini' ? 'Active' : 'Available'}
              </span>
            </div>

            {/* OpenRouter */}
            <div
              onClick={() => setSettings({ ...settings, provider: 'openrouter' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: 12,
                border: `2px solid ${settings.provider === 'openrouter' ? 'var(--orange)' : 'var(--border)'}`,
                backgroundColor: settings.provider === 'openrouter' ? 'rgba(249,115,22,0.05)' : 'var(--surface-2)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
                  OpenRouter
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                  Optional. Used for chapter content translation only (not UI text). Requires an OpenRouter API key.
                </div>
              </div>
              <span
                className={`status-pill ${settings.provider === 'openrouter' ? 'status-orange' : 'status-neutral'}`}
                style={{ fontSize: 11, opacity: settings.provider === 'openrouter' ? 1 : 0.4 }}
              >
                {settings.provider === 'openrouter' ? 'Active' : 'Available'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: API Keys */}
      <div className="console-card" style={{ padding: 28, marginBottom: 24 }}>
        <div
          onClick={() => setIsApiKeysExpanded(!isApiKeysExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            marginBottom: isApiKeysExpanded ? 20 : 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Settings size={22} style={{ color: 'var(--orange)' }} />
            <div>
              <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>
                API Keys
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-2)' }}>
                Enter API keys for Gemini or OpenRouter translation providers.
              </p>
            </div>
          </div>
          {isApiKeysExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>

        {isApiKeysExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Gemini API Key */}
            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--text-2)',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  display: 'block',
                  letterSpacing: '0.5px',
                }}
              >
                Gemini API Key
              </label>
              <input
                type="password"
                value={settings.geminiApiKey}
                onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                placeholder="Enter your Gemini API key..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-2)',
                  color: 'var(--text-1)',
                  fontSize: 14,
                  fontFamily: 'Space Grotesk, sans-serif',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--blue)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                Required when using Gemini as the translation provider. Get your key from Google AI Studio.
              </p>
            </div>

            {/* OpenRouter API Key */}
            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--text-2)',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  display: 'block',
                  letterSpacing: '0.5px',
                }}
              >
                OpenRouter API Key
              </label>
              <input
                type="password"
                value={settings.openrouterApiKey}
                onChange={(e) => setSettings({ ...settings, openrouterApiKey: e.target.value })}
                placeholder="Enter your OpenRouter API key..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-2)',
                  color: 'var(--text-1)',
                  fontSize: 14,
                  fontFamily: 'Space Grotesk, sans-serif',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--blue)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              />

              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                Required when using OpenRouter as the translation provider. Get your key from openrouter.ai.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
