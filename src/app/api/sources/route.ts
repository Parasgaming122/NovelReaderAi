import { NextResponse } from 'next/server';
import { getSources } from '@/lib/novelapi-client';
import { NovelSourceInfo } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const raw = await getSources();
    const sources: NovelSourceInfo[] = raw.map(s => ({
      id: s.id,
      name: s.name,
      baseUrl: s.baseUrl,
      language: s.language,
      version: '1.0.0',
      hasSearch: s.hasSearch,
      charset: s.charset,
      description: `${s.name} — ${s.hasSearch ? 'Search & Catalog' : 'Catalog only'} (via NovelAPI)`,
    }));
    return NextResponse.json({ success: true, sources });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
