import * as cheerio from 'cheerio';

interface CacheEntry {
  translatedHtml: string;
  timestamp: number;
}

const translationCache = new Map<string, CacheEntry>();
const CACHE_TTL = 7 * 24 * 3600 * 1000;

/* ── Helpers to read saved translation settings ── */
function getTranslationSettings(): { provider: string; geminiKey?: string; openrouterKey?: string } {
  if (typeof window === 'undefined') return { provider: 'google' };
  try {
    const raw = localStorage.getItem('translation_settings');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { provider: 'google' };
}

/* ── Google Translate (default, free, no API key needed) ── */

async function googleTranslateChunk(text: string, from = 'zh-CN', to = 'en'): Promise<string> {
  if (!text || !text.trim()) return text;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) return text;
  const data = await res.json();
  if (Array.isArray(data) && Array.isArray(data[0])) {
    return data[0].map((item: any) => item[0]).join('');
  }
  return text;
}

async function googleTranslateText(text: string, from = 'zh-CN', to = 'en'): Promise<string> {
  if (!text || !text.trim()) return text;
  if (!/[一-龥]/.test(text)) return text;
  return googleTranslateChunk(text, from, to);
}

/* ── Gemini (optional, API key required, chapters only) ── */

async function geminiTranslateChunk(text: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Translate the following Chinese text to English. Return ONLY the English translation, preserving paragraph breaks. Do not add any explanation:\n\n${text}` }] }],
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || text;
}

async function geminiTranslateText(text: string, apiKey: string): Promise<string> {
  if (!text || !text.trim()) return text;
  if (!/[一-龥]/.test(text)) return text;
  return geminiTranslateChunk(text, apiKey);
}

/* ── OpenRouter (optional, API key required, chapters only) ── */

async function openrouterTranslateChunk(text: string, apiKey: string): Promise<string> {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        { role: 'system', content: 'You are a professional Chinese-to-English novel translator. Translate the given text to natural English. Return ONLY the translation, preserving paragraph breaks.' },
        { role: 'user', content: text },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter API error: ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || text;
}

async function openrouterTranslateText(text: string, apiKey: string): Promise<string> {
  if (!text || !text.trim()) return text;
  if (!/[一-龥]/.test(text)) return text;
  return openrouterTranslateChunk(text, apiKey);
}

/* ── Public API ── */

export async function translateText(text: string, from = 'zh-CN', to = 'en', provider?: string): Promise<string> {
  if (!text || !text.trim()) return text;
  if (!/[一-龥]/.test(text)) return text;

  const settings = provider ? { provider } : getTranslationSettings();
  const p = settings.provider || 'google';

  if (p === 'gemini' && settings.geminiKey) {
    return geminiTranslateText(text, settings.geminiKey);
  }
  if (p === 'openrouter' && settings.openrouterKey) {
    return openrouterTranslateText(text, settings.openrouterKey);
  }
  return googleTranslateText(text, from, to);
}

export async function translateBatchTexts(texts: string[], from = 'zh-CN', to = 'en', provider?: string): Promise<string[]> {
  if (!texts || texts.length === 0) return [];

  const indicesToTranslate: number[] = [];
  const itemsToTranslate: string[] = [];

  texts.forEach((txt, idx) => {
    if (txt && /[一-龥]/.test(txt)) {
      indicesToTranslate.push(idx);
      itemsToTranslate.push(txt.trim());
    }
  });

  if (itemsToTranslate.length === 0) return [...texts];

  const results = [...texts];
  const BATCH_SIZE = 5;
  const DELIMITER = '|||';

  const settings = provider ? { provider } : getTranslationSettings();
  const p = settings.provider || 'google';

  for (let i = 0; i < itemsToTranslate.length; i += BATCH_SIZE) {
    const chunkIndices = indicesToTranslate.slice(i, i + BATCH_SIZE);
    const chunkItems = itemsToTranslate.slice(i, i + BATCH_SIZE);
    const combined = chunkItems.join(DELIMITER);

    try {
      let translatedChunk: string;
      if (p === 'gemini' && settings.geminiKey) {
        translatedChunk = await geminiTranslateChunk(combined, settings.geminiKey);
      } else if (p === 'openrouter' && settings.openrouterKey) {
        translatedChunk = await openrouterTranslateChunk(combined, settings.openrouterKey);
      } else {
        translatedChunk = await googleTranslateChunk(combined, from, to);
      }

      const parts = translatedChunk.split(DELIMITER);
      if (parts.length === chunkItems.length) {
        chunkIndices.forEach((origIdx, subIdx) => { results[origIdx] = parts[subIdx].trim(); });
      } else {
        chunkIndices.forEach((origIdx, subIdx) => { results[origIdx] = chunkItems[subIdx]; });
      }
    } catch {
      chunkIndices.forEach((origIdx, subIdx) => { results[origIdx] = chunkItems[subIdx]; });
    }

    if (i + BATCH_SIZE < itemsToTranslate.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return results;
}

export async function translateNovelDetail<T extends { title: string; chineseTitle?: string; author?: string; summary?: string }>(
  detail: T
): Promise<T> {
  // Always use Google for UI-facing translations (titles, summaries, authors)
  const originalTitle = detail.chineseTitle || detail.title;
  const originalAuthor = detail.author || '';
  const originalSummary = detail.summary || '';

  const [translatedTitle, translatedAuthor, translatedSummary] = await translateBatchTexts([
    originalTitle, originalAuthor, originalSummary,
  ], 'zh-CN', 'en', 'google');

  return { ...detail, title: translatedTitle || originalTitle, chineseTitle: originalTitle, author: translatedAuthor || originalAuthor, summary: translatedSummary || originalSummary };
}

export async function translateNovelItems<T extends { title: string; chineseTitle?: string; author?: string; summary?: string }>(
  items: T[]
): Promise<T[]> {
  if (!items || items.length === 0) return [];
  const titlesToTranslate = items.map(i => i.chineseTitle || i.title);
  const translatedTitles = await translateBatchTexts(titlesToTranslate, 'zh-CN', 'en', 'google');
  const authorsToTranslate = items.map(i => i.author || '');
  const translatedAuthors = await translateBatchTexts(authorsToTranslate, 'zh-CN', 'en', 'google');
  return items.map((item, idx) => ({ ...item, chineseTitle: item.chineseTitle || item.title, title: translatedTitles[idx] || item.title, author: translatedAuthors[idx] || item.author }));
}

export async function translateHtml(html: string, from = 'zh-CN', to = 'en', provider?: string): Promise<string> {
  if (!html || !html.trim()) return '';

  const cacheKey = `${from}_${to}_${provider || 'google'}_${html.substring(0, 100)}_${html.length}`;
  const cached = translationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.translatedHtml;

  const $ = cheerio.load(html, { xmlMode: false });
  const paragraphs: { text: string; el: any }[] = [];
  $('p, div, h1, h2, h3, h4, li').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 0 && $(el).children().length === 0) paragraphs.push({ text, el });
  });

  if (paragraphs.length === 0) {
    const rawText = $.text().trim();
    const lines = rawText.split(/\n+/).filter(l => l.trim().length > 0);
    const translatedLines: string[] = [];
    for (let i = 0; i < lines.length; i += 5) {
      const batch = lines.slice(i, i + 5).join('\n');
      const translatedBatch = await translateText(batch, from, to, provider);
      translatedLines.push(...translatedBatch.split('\n'));
    }
    const resultHtml = translatedLines.map(line => `<p class="my-3 leading-relaxed text-base">${line}</p>`).join('');
    translationCache.set(cacheKey, { translatedHtml: resultHtml, timestamp: Date.now() });
    return resultHtml;
  }

  const batchSize = 10;
  for (let i = 0; i < paragraphs.length; i += batchSize) {
    const batch = paragraphs.slice(i, i + batchSize);
    const combined = batch.map(p => p.text).join('\n---PARAGRAPH_BREAK---\n');
    const translatedBatch = await translateText(combined, from, to, provider);
    const translatedParts = translatedBatch.split(/---PARAGRAPH_BREAK---|\n---\n/);
    batch.forEach((p, idx) => {
      const trans = translatedParts[idx] ? translatedParts[idx].trim() : p.text;
      $(p.el).text(trans);
    });
  }

  const resultHtml = $.html('body').replace(/^<body>/, '').replace(/<\/body>$/, '');
  translationCache.set(cacheKey, { translatedHtml: resultHtml, timestamp: Date.now() });
  return resultHtml;
}
