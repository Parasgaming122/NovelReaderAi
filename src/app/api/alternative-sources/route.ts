import { NextRequest, NextResponse } from 'next/server';
import { pluginRegistry } from '@/lib/plugins/plugin-registry';

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
