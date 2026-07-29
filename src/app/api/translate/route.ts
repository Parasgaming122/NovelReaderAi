import { NextRequest, NextResponse } from 'next/server';
import { translateHtml } from '@/lib/translator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { html, from = 'zh-CN', to = 'en' } = body;

    if (!html) {
      return NextResponse.json({
        success: false,
        error: 'Body field "html" is required.',
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
