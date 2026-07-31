import { NextRequest, NextResponse } from 'next/server';
import { translateText, translateBatchTexts, translateHtml } from '@/lib/translator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { texts, html, provider } = body;

    if (provider === 'gemini' || provider === 'openrouter') {
      // Gemini / OpenRouter — only for chapter content
      if (!html) {
        return NextResponse.json({ success: false, error: `${provider} translation is only available for chapter content (html field).` });
      }
      const translated = await translateHtml(html, 'zh-CN', 'en', provider);
      return NextResponse.json({ success: true, provider, html: translated });
    }

    // Default: Google Translate
    if (html) {
      const translated = await translateHtml(html, 'zh-CN', 'en', 'google');
      return NextResponse.json({ success: true, provider: 'google', html: translated });
    }

    if (texts && Array.isArray(texts)) {
      const translated = await translateBatchTexts(texts);
      return NextResponse.json({ success: true, provider: 'google', texts: translated });
    }

    return NextResponse.json({ success: false, error: 'Provide texts[] or html field.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
