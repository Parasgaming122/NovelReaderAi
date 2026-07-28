import * as cheerio from 'cheerio';

interface CacheEntry {
  translatedHtml: string;
  timestamp: number;
}

const translationCache = new Map<string, CacheEntry>();
const CACHE_TTL = 7 * 24 * 3600 * 1000; // 7 days cache

export const translatorStats = {
  totalCalls: 0,
  totalItemsTranslated: 0,
  cacheHits: 0,
};

async function translateTextChunk(text: string, from = 'zh-CN', to = 'en'): Promise<string> {
  if (!text || !text.trim()) return text;
  translatorStats.totalCalls++;
  
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(
      text
    )}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      return text;
    }

    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data[0].map((item: any) => item[0]).join('');
    }
    return text;
  } catch (err) {
    console.error('Translation error:', err);
    return text;
  }
}

export async function translateText(text: string, from = 'zh-CN', to = 'en'): Promise<string> {
  if (!text || !text.trim()) return text;
  // If text is already predominantly ASCII/English, return as is
  if (!/[\u4e00-\u9fa5]/.test(text)) {
    return text;
  }
  return await translateTextChunk(text, from, to);
}

export async function translateBatchTexts(texts: string[], from = 'zh-CN', to = 'en'): Promise<string[]> {
  if (!texts || texts.length === 0) return [];
  
  // Identify items needing translation
  const indicesToTranslate: number[] = [];
  const itemsToTranslate: string[] = [];

  texts.forEach((txt, idx) => {
    if (txt && /[\u4e00-\u9fa5]/.test(txt)) {
      indicesToTranslate.push(idx);
      itemsToTranslate.push(txt.trim());
    }
  });

  if (itemsToTranslate.length === 0) {
    return [...texts];
  }

  translatorStats.totalItemsTranslated += itemsToTranslate.length;

  // Join with delimiter and translate in chunks
  const results = [...texts];
  const batchSize = 10;
  for (let i = 0; i < itemsToTranslate.length; i += batchSize) {
    const chunkIndices = indicesToTranslate.slice(i, i + batchSize);
    const chunkItems = itemsToTranslate.slice(i, i + batchSize);
    const combined = chunkItems.join('\n---ITEM_BREAK---\n');

    const translatedChunk = await translateTextChunk(combined, from, to);
    const parts = translatedChunk.split(/---ITEM_BREAK---|\n---\n/);

    chunkIndices.forEach((origIdx, chunkSubIdx) => {
      if (parts[chunkSubIdx]) {
        results[origIdx] = parts[chunkSubIdx].trim();
      }
    });
  }

  return results;
}

export async function translateNovelDetail<T extends { title: string; chineseTitle?: string; author?: string; summary?: string }>(
  detail: T
): Promise<T> {
  const originalTitle = detail.chineseTitle || detail.title;
  const originalAuthor = detail.author || '';
  const originalSummary = detail.summary || '';

  const [translatedTitle, translatedAuthor, translatedSummary] = await translateBatchTexts([
    originalTitle,
    originalAuthor,
    originalSummary,
  ]);

  return {
    ...detail,
    title: translatedTitle || originalTitle,
    chineseTitle: originalTitle,
    author: translatedAuthor || originalAuthor,
    summary: translatedSummary || originalSummary,
  };
}

export async function translateNovelItems<T extends { title: string; chineseTitle?: string; author?: string; summary?: string }>(
  items: T[]
): Promise<T[]> {
  if (!items || items.length === 0) return [];

  const titlesToTranslate = items.map((i) => i.chineseTitle || i.title);
  const translatedTitles = await translateBatchTexts(titlesToTranslate);

  const authorsToTranslate = items.map((i) => i.author || '');
  const translatedAuthors = await translateBatchTexts(authorsToTranslate);

  return items.map((item, idx) => ({
    ...item,
    chineseTitle: item.chineseTitle || item.title,
    title: translatedTitles[idx] || item.title,
    author: translatedAuthors[idx] || item.author,
  }));
}
export async function translateHtml(
  html: string,
  from = 'zh-CN',
  to = 'en'
): Promise<string> {
  if (!html || !html.trim()) return '';

  const cacheKey = `${from}_${to}_${html.substring(0, 100)}_${html.length}`;
  const cached = translationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    translatorStats.cacheHits++;
    return cached.translatedHtml;
  }

  const $ = cheerio.load(html, { xmlMode: false });
  const paragraphs: { text: string; el: any }[] = [];

  // Extract non-empty text paragraphs
  $('p, div, h1, h2, h3, h4, li').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 0 && $(el).children().length === 0) {
      paragraphs.push({ text, el });
    }
  });

  // If no block tags, split text by newlines
  if (paragraphs.length === 0) {
    const rawText = $.text().trim();
    const lines = rawText.split(/\n+/).filter((l) => l.trim().length > 0);
    const translatedLines: string[] = [];

    for (let i = 0; i < lines.length; i += 5) {
      const batch = lines.slice(i, i + 5).join('\n');
      const translatedBatch = await translateTextChunk(batch, from, to);
      translatedLines.push(...translatedBatch.split('\n'));
    }

    const resultHtml = translatedLines
      .map((line) => `<p class="my-3 leading-relaxed text-base">${line}</p>`)
      .join('');

    translationCache.set(cacheKey, { translatedHtml: resultHtml, timestamp: Date.now() });
    return resultHtml;
  }

  // Batch translate paragraphs in chunks of ~15 lines to avoid URI length limits
  const batchSize = 10;
  for (let i = 0; i < paragraphs.length; i += batchSize) {
    const batch = paragraphs.slice(i, i + batchSize);
    const combined = batch.map((p) => p.text).join('\n---PARAGRAPH_BREAK---\n');

    const translatedBatch = await translateTextChunk(combined, from, to);
    const translatedParts = translatedBatch.split(/---PARAGRAPH_BREAK---|\n---\n/);

    batch.forEach((p, idx) => {
      const trans = translatedParts[idx] ? translatedParts[idx].trim() : p.text;
      $(p.el).text(trans);
    });
  }

  const resultHtml = $.html('body')
    .replace(/^<body>/, '')
    .replace(/<\/body>$/, '');

  translationCache.set(cacheKey, { translatedHtml: resultHtml, timestamp: Date.now() });
  return resultHtml;
}
