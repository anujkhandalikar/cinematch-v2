import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BEARER = process.env.TMDB_BEARER_TOKEN || process.env.NEXT_PUBLIC_TMDB_BEARER_TOKEN;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

async function tmdb(url: string): Promise<Response> {
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (TMDB_BEARER) headers['Authorization'] = `Bearer ${TMDB_BEARER}`;
  const u = TMDB_BEARER ? url : `${url}${url.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}`;
  return fetch(u, { headers });
}

export async function GET(_req: NextRequest) {
  try {
    if (!TMDB_API_KEY && !TMDB_BEARER) {
      return NextResponse.json({ error: 'TMDB credentials missing' }, { status: 500 });
    }

    const lang = 'hi';
    const originCountry = 'IN';
    const pages = Array.from({ length: 10 }, (_, i) => i + 1); // first 10 pages
    const endpoints = pages.map((p) =>
      `${TMDB_BASE_URL}/discover/movie?page=${p}&with_original_language=${lang}&with_origin_country=${originCountry}&region=${originCountry}&language=en-US&sort_by=popularity.desc&include_adult=false`
    );

    const results: any[] = [];
    for (const url of endpoints) {
      try {
        const res = await tmdb(url);
        if (!res.ok) continue;
        const data = await res.json();
        results.push(...(data.results || []));
      } catch {}
    }

    // Deduplicate by id
    const byId = new Map<number, any>();
    results.forEach((m) => { if (!byId.has(m.id)) byId.set(m.id, m); });
    const unique = Array.from(byId.values());

    return NextResponse.json({
      language: 'Hindi',
      pagesFetched: pages.length,
      uniqueCount: unique.length,
      sample: unique.slice(0, 25).map((m) => ({ id: m.id, title: m.title, orig: m.original_language })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown error' }, { status: 500 });
  }
}


