'use client';

import React, { useState } from 'react';
import {
  Code2,
  Terminal,
  Play,
  Copy,
  Check,
  Bot,
  Globe,
  Zap,
  Server,
  Layers,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export default function ApiDocsView() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Interactive API Playground State
  const [testEndpoint, setTestEndpoint] = useState<string>('/api/sources');
  const [testParam, setTestParam] = useState<string>('');
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [loadingTest, setLoadingTest] = useState(false);

  const handleCopyCode = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleRunApiTest = async () => {
    setLoadingTest(true);
    setApiResponse(null);
    try {
      let fullUrl = testEndpoint;
      if (testEndpoint === '/api/search') {
        fullUrl += `?q=${encodeURIComponent(testParam || '诡秘之主')}`;
      } else if (testEndpoint === '/api/catalog') {
        fullUrl += `?source=${encodeURIComponent(testParam || 'novel543')}`;
      } else if (testEndpoint === '/api/novel') {
        fullUrl += `?url=${encodeURIComponent(testParam || 'https://www.novel543.com/novel/1001.html')}&source=novel543`;
      } else if (testEndpoint === '/api/alternative-sources') {
        fullUrl += `?title=${encodeURIComponent(testParam || '诡秘之主')}`;
      }

      const res = await fetch(fullUrl);
      const data = await res.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setApiResponse(JSON.stringify({ error: err.message || 'API Test Failed' }, null, 2));
    } finally {
      setLoadingTest(false);
    }
  };

  const apiEndpoints = [
    {
      method: 'GET',
      path: '/api/sources',
      description: 'Returns all active Chinese novel source plugins, their version, status, and capabilities.',
      exampleUrl: '/api/sources',
    },
    {
      method: 'GET',
      path: '/api/catalog?source={sourceId}&page={page}',
      description: 'Fetches the novel feed catalog for a specific source site or multi-source aggregation.',
      exampleUrl: '/api/catalog?source=novel543&page=1',
    },
    {
      method: 'GET',
      path: '/api/search?q={query}&source={sourceId}',
      description: 'Multi-source grouped search across Chinese novel repositories.',
      exampleUrl: '/api/search?q=诡秘之主',
    },
    {
      method: 'GET',
      path: '/api/novel?url={novelUrl}&source={sourceId}',
      description: 'Fetches novel details, translated title, original Chinese name, cover, description, and chapter TOC.',
      exampleUrl: '/api/novel?url=https://www.novel543.com/novel/1001.html&source=novel543',
    },
    {
      method: 'GET',
      path: '/api/chapter?url={chapterUrl}&source={sourceId}&translate=true',
      description: 'Retrieves chapter text with 4-tier Cloudflare bypass and HTML Google translation.',
      exampleUrl: '/api/chapter?url=https://www.novel543.com/novel/1001/1.html&source=novel543&translate=true',
    },
    {
      method: 'GET',
      path: '/api/alternative-sources?title={chineseTitle}',
      description: 'Searches all alternative Chinese novel sources for mirrors using the Chinese name.',
      exampleUrl: '/api/alternative-sources?title=诡秘之主',
    },
    {
      method: 'POST',
      path: '/api/translate',
      description: 'Translates raw Chinese HTML/text payload into English while preserving HTML DOM structure.',
      exampleUrl: '/api/translate',
    },
  ];

  const agentPythonSnippet = `# Python example for AI Agent to fetch translated chapters:
import requests

BASE_URL = "http://localhost:3000"

def get_translated_chapter(chapter_url, source_id="novel543"):
    endpoint = f"{BASE_URL}/api/chapter"
    params = {
        "url": chapter_url,
        "source": source_id,
        "translate": "true",
        "lang": "en"
    }
    response = requests.get(endpoint, params=params)
    data = response.json()
    if data.get("success"):
        return data.get("translatedHtml")
    return None

# Usage:
content = get_translated_chapter("https://www.novel543.com/novel/1001/1.html")
print(content[:300])`;

  const agentJsSnippet = `// Node.js / JavaScript example for AI Agents:
async function fetchNovelCatalog(sourceId = 'all') {
  const res = await fetch(\`http://localhost:3000/api/catalog?source=\${sourceId}\`);
  const data = await res.json();
  if (data.success) {
    console.log('Catalog count:', data.count || data.catalogs.length);
    return data;
  }
  throw new Error(data.error);
}

// Search across all sources:
async function searchNovels(query) {
  const res = await fetch(\`http://localhost:3000/api/search?q=\${encodeURIComponent(query)}\`);
  const data = await res.json();
  return data.groupedResults;
}`;

  return (
    <div className="fade-up">
      {/* Title Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 className="font-display" style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-1)' }}>
          API Specification & AI Agent Developer Guide
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
          Public REST API routes for external web applications, mobile apps, and AI agents to query Chinese web novels.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="kpi-grid" style={{ marginBottom: 32 }}>
        <div className="kpi-card">
          <div className="kpi-header">
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase' }}>
              Format
            </span>
            <Server size={20} style={{ color: 'var(--blue)' }} />
          </div>
          <div className="kpi-val">JSON REST</div>
          <div className="kpi-sub">Standard HTTP endpoints</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase' }}>
              Translation
            </span>
            <Globe size={20} style={{ color: 'var(--orange)' }} />
          </div>
          <div className="kpi-val">Google GTX</div>
          <div className="kpi-sub">HTML structure preserved</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase' }}>
              Cloudflare Bypass
            </span>
            <Zap size={20} style={{ color: 'var(--blue)' }} />
          </div>
          <div className="kpi-val">4-Tier Engine</div>
          <div className="kpi-sub">Header spoofing & session cache</div>
        </div>
      </div>

      {/* AI Agent Guide Section */}
      <div className="console-card" style={{ padding: 32, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'var(--orange-soft)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={22} />
          </div>
          <div>
            <h2 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>
              🤖 Guide for AI Agents & Bot Integrations
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
              How AI agents (Antigravity, Gemini, AutoGPT) can programmatically consume this API to build custom novel apps.
            </p>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--surface-2)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 20, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
          <ol style={{ marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>
              <strong>Step 1: Discover Sources</strong> — Call <code style={{ color: 'var(--blue)' }}>GET /api/sources</code> to list active novel providers (Novel543, TimoTxt, 69shuba, Biquge5200, XBiquge).
            </li>
            <li>
              <strong>Step 2: Search or Browse Catalog</strong> — Call <code style={{ color: 'var(--blue)' }}>GET /api/search?q={"{keyword}"}</code> to retrieve grouped search results across all sites.
            </li>
            <li>
              <strong>Step 3: Fetch Novel TOC & Details</strong> — Call <code style={{ color: 'var(--blue)' }}>GET /api/novel?url={"{novelUrl}"}&amp;source={"{sourceId}"}</code> to retrieve chapter lists, cover image, and original Chinese title.
            </li>
            <li>
              <strong>Step 4: Find Mirrors / Alternative Sources</strong> — Call <code style={{ color: 'var(--blue)' }}>GET /api/alternative-sources?title={"{chineseTitle}"}</code> if a chapter fails or is paywalled.
            </li>
            <li>
              <strong>Step 5: Get Translated Chapters</strong> — Call <code style={{ color: 'var(--blue)' }}>GET /api/chapter?url={"{chapterUrl}"}&amp;translate=true</code> to receive clean translated HTML content ready for rendering.
            </li>
          </ol>
        </div>

        {/* Code Snippets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 20 }}>
          {/* Python Snippet */}
          <div style={{ backgroundColor: 'var(--base)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'Space Grotesk', color: 'var(--orange)' }}>
                Python (requests)
              </span>
              <button
                className="btn-secondary"
                style={{ padding: '4px 8px', fontSize: 11 }}
                onClick={() => handleCopyCode(agentPythonSnippet, 1)}
              >
                {copiedIndex === 1 ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedIndex === 1 ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre style={{ fontSize: 11, color: 'var(--text-1)', fontFamily: 'monospace', overflowX: 'auto', margin: 0, lineHeight: 1.5 }}>
              {agentPythonSnippet}
            </pre>
          </div>

          {/* JS Snippet */}
          <div style={{ backgroundColor: 'var(--base)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'Space Grotesk', color: 'var(--blue)' }}>
                JavaScript / Node.js (fetch)
              </span>
              <button
                className="btn-secondary"
                style={{ padding: '4px 8px', fontSize: 11 }}
                onClick={() => handleCopyCode(agentJsSnippet, 2)}
              >
                {copiedIndex === 2 ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedIndex === 2 ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre style={{ fontSize: 11, color: 'var(--text-1)', fontFamily: 'monospace', overflowX: 'auto', margin: 0, lineHeight: 1.5 }}>
              {agentJsSnippet}
            </pre>
          </div>
        </div>
      </div>

      {/* Interactive API Tester / Playground */}
      <div className="console-card" style={{ padding: 32, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Terminal size={20} style={{ color: 'var(--blue)' }} />
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>
            Interactive Live API Tester
          </h2>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <select
            value={testEndpoint}
            onChange={(e) => setTestEndpoint(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text-1)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <option value="/api/sources">GET /api/sources</option>
            <option value="/api/catalog">GET /api/catalog</option>
            <option value="/api/search">GET /api/search</option>
            <option value="/api/novel">GET /api/novel</option>
            <option value="/api/alternative-sources">GET /api/alternative-sources</option>
          </select>

          {testEndpoint !== '/api/sources' && (
            <input
              type="text"
              placeholder={
                testEndpoint === '/api/search' || testEndpoint === '/api/alternative-sources'
                  ? 'Query term e.g. 诡秘之主'
                  : 'Source ID or Novel URL'
              }
              value={testParam}
              onChange={(e) => setTestParam(e.target.value)}
              style={{
                flex: 1,
                minWidth: 200,
                padding: '10px 14px',
                borderRadius: 10,
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-1)',
                fontSize: 13,
              }}
            />
          )}

          <button className="btn-primary" onClick={handleRunApiTest} disabled={loadingTest}>
            <Play size={16} />
            <span>{loadingTest ? 'Executing...' : 'Send Request'}</span>
          </button>
        </div>

        {apiResponse && (
          <div style={{ backgroundColor: 'var(--base)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 8, fontFamily: 'Space Grotesk' }}>
              RESPONSE PAYLOAD (JSON):
            </span>
            <pre style={{ fontSize: 12, color: 'var(--text-1)', fontFamily: 'monospace', maxHeight: 300, overflowY: 'auto', margin: 0 }}>
              {apiResponse}
            </pre>
          </div>
        )}
      </div>

      {/* Full API Route Reference List */}
      <div className="console-card" style={{ padding: 32 }}>
        <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 20 }}>
          API Route Reference
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {apiEndpoints.map((ep, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: 'var(--surface-2)',
                padding: 16,
                borderRadius: 12,
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span className="status-pill status-blue" style={{ fontSize: 10, fontWeight: 800 }}>
                  {ep.method}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: 'var(--orange)' }}>
                  {ep.path}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                {ep.description}
              </p>
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                Example: <code style={{ color: 'var(--blue)' }}>{ep.exampleUrl}</code>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
