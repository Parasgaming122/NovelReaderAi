import { NextResponse } from 'next/server';
import { pluginRegistry } from '@/lib/plugins/plugin-registry';

export async function GET() {
  // Return ALL sources (including disabled/blocked) with their enabled status
  const sources = pluginRegistry.getAllSourcesWithStatus();
  const counts = pluginRegistry.getSourceCounts();
  return NextResponse.json({
    success: true,
    count: sources.length,
    enabledCount: counts.enabled,
    blockedCount: counts.blocked,
    sources,
  });
}
