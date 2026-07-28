import { NextResponse } from 'next/server';
import { bypasserStats } from '@/lib/bypasser';
import { translatorStats } from '@/lib/translator';

export async function GET() {
  return NextResponse.json({
    success: true,
    bypasser: bypasserStats,
    translator: translatorStats,
  });
}
