import { NextResponse } from 'next/server';
import { pluginRegistry } from '@/lib/plugins/plugin-registry';

export async function GET() {
  const sources = pluginRegistry.getAllSources();
  return NextResponse.json({
    success: true,
    count: sources.length,
    sources,
  });
}
