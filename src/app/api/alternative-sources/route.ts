import { NextRequest, NextResponse } from 'next/server';
import { pluginRegistry } from '@/lib/plugins/plugin-registry';
import { translateBatchTexts } from '@/lib/translator';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chineseTitle = searchParams.get('title') || searchParams.get('q') || '';
  const excludeSource = searchParams.get('exclude') || undefined;

  if (!chineseTitle.trim()) {
    return NextResponse.json({
      success: false,
      error: 'Query parameter "title" is required.',
    });
  }

  try {
    const alternativeSources = await pluginRegistry.findAlternativeSources(
      chineseTitle,
      excludeSource
    );

    // Translate all match titles from Chinese to English
    const allMatches = alternativeSources.flatMap((s) => s.matches);
    if (allMatches.length > 0) {
      const titles = allMatches.map((m) => m.title);
      const translatedTitles = await translateBatchTexts(titles);
      allMatches.forEach((m, i) => {
        m.chineseTitle = titles[i]; // preserve original Chinese title
        m.title = translatedTitles[i] || titles[i]; // set English translated title
      });
    }

    return NextResponse.json({
      success: true,
      queryTitle: chineseTitle,
      alternativeSourcesCount: alternativeSources.length,
      sources: alternativeSources,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to find alternative sources',
    });
  }
}
