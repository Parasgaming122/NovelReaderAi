import { NextRequest, NextResponse } from 'next/server';
import { translateHtml, setTranslationConfig, TranslationProvider } from '@/lib/translator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { html, from = 'zh-CN', to = 'en', provider, openRouterApiKey, geminiApiKey } = body;

    if (!html) {
      return NextResponse.json({
        success: false,
        error: 'Body field "html" is required.',
      });
    }

    // Set translation provider config if provided
    if (provider) {
      setTranslationConfig({
        provider: provider as TranslationProvider,
        openRouterApiKey,
        geminiApiKey,
      });
    }

    const translatedHtml = await translateHtml(html, from, to);
    return NextResponse.json({
      success: true,
      translatedHtml,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Translation error',
    });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    providers: ['google', 'openrouter', 'gemini'],
    description: 'POST with { html, from?, to?, provider?, openRouterApiKey?, geminiApiKey? }',
  });
}
