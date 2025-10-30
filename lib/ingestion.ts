import { convertTMDBMovie, TMDBResponse, TMDBMovie } from '@/lib/tmdb';
import type { Movie, Genre, OTTPlatform } from '@/lib/store';
import { idbGet, idbSet } from './idb';

// Build a stable cache key from filter params that affect discovery
export function buildCacheKey(params: { language: string; sortBy: string; adult: boolean }): string {
  return `discover:${params.language}:${params.sortBy}:adult=${params.adult ? 1 : 0}`;
}

async function fetchDiscoverPage(page: number, language: string): Promise<TMDBResponse<TMDBMovie>> {
  const endpoint = encodeURIComponent(`/discover/movie?page=${page}&language=${language}&sort_by=popularity.desc&include_adult=false`);
  const res = await fetch(`/api/movies?endpoint=${endpoint}`);
  if (!res.ok) {
    return { page, results: [], total_pages: page, total_results: 0 } as any;
  }
  return res.json();
}

type OnChunk = (movies: Movie[], isComplete: boolean) => void;

// Fetch initial 3 pages fast, then background all remaining pages with a concurrency cap
export async function streamDiscoverAll(
  opts: { language: string; adult: boolean },
  onChunk: OnChunk
) {
  const language = opts.language || 'en-US';
  const cacheKey = buildCacheKey({ language, sortBy: 'popularity.desc', adult: !!opts.adult });

  // Serve cache immediately if exists
  try {
    const cached = await idbGet<{ movies: Movie[]; ts: number }>(cacheKey);
    if (cached?.movies?.length) {
      onChunk(cached.movies.slice(0, 90), false);
    }
  } catch {}

  // Prefetch first 3 pages concurrently
  const firstPages = [1, 2, 3];
  const first = await Promise.all(firstPages.map(p => fetchDiscoverPage(p, language)));
  const totalPages = Math.max(...first.map(f => f.total_pages || 1), 1);
  const firstMovies = first.flatMap(f => (f.results || []).map(convertTMDBMovie));
  if (firstMovies.length) {
    onChunk(firstMovies, false);
    // Write-through cache
    try { await idbSet(cacheKey, { movies: firstMovies, ts: Date.now() }); } catch {}
  }

  // Background: fetch remaining pages with concurrency 4 and gentle pacing
  const remaining = Array.from({ length: Math.max(totalPages - 3, 0) }, (_, i) => i + 4);
  const concurrency = 4;
  let index = 0;
  let buffer: Movie[] = [];

  async function worker() {
    while (index < remaining.length) {
      const page = remaining[index++];
      const resp = await fetchDiscoverPage(page, language);
      const movies = (resp.results || []).map(convertTMDBMovie);
      if (movies.length) {
        buffer.push(...movies);
        if (buffer.length >= 50) {
          onChunk(buffer.splice(0, buffer.length), false);
        }
      }
      // Pace: ~4 req/sec
      await new Promise(r => setTimeout(r, 260));
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  if (buffer.length) {
    onChunk(buffer, false);
  }
  onChunk([], true);
}

// Language streaming using with_original_language, staged then background
export async function streamLanguageAll(
  langCode: string,
  opts: { adult: boolean },
  onChunk: OnChunk
) {
  const cacheKey = `lang:${langCode}:adult=${opts.adult ? 1 : 0}`;
  try {
    const cached = await idbGet<{ movies: Movie[]; ts: number }>(cacheKey);
    if (cached?.movies?.length) onChunk(cached.movies.slice(0, 90), false);
  } catch {}

  async function fetchPage(page: number): Promise<TMDBResponse<TMDBMovie>> {
    // Add origin-country/region hints for Indian languages to improve recall
    const originCountry = ['hi','ta','te','ml','bn'].includes(langCode) ? 'IN' : '';
    const regionParam = originCountry ? `&with_origin_country=${originCountry}&region=${originCountry}` : '';
    const endpoint = encodeURIComponent(`/discover/movie?page=${page}&with_original_language=${langCode}${regionParam}&language=en-US&sort_by=popularity.desc&include_adult=${opts.adult ? 'true' : 'false'}`);
    const res = await fetch(`/api/movies?endpoint=${endpoint}`);
    if (!res.ok) return { page, results: [], total_pages: page, total_results: 0 } as any;
    return res.json();
  }

  const first = await Promise.all([1,2,3,4,5,6].map(p => fetchPage(p)));
  const totalPages = Math.max(...first.map(f => f.total_pages || 1), 1);
  const firstMovies = first.flatMap(f => (f.results || []).map(convertTMDBMovie));
  if (firstMovies.length) {
    onChunk(firstMovies, false);
    try { await idbSet(cacheKey, { movies: firstMovies, ts: Date.now() }); } catch {}
  }

  const remaining = Array.from({ length: Math.max(totalPages - 3, 0) }, (_, i) => i + 4);
  const concurrency = 4; let index = 0; let buffer: Movie[] = [];
  async function worker() {
    while (index < remaining.length) {
      const page = remaining[index++];
      const resp = await fetchPage(page);
      const movies = (resp.results || []).map(convertTMDBMovie);
      if (movies.length) {
        buffer.push(...movies);
        if (buffer.length >= 50) { onChunk(buffer.splice(0, buffer.length), false); }
      }
      await new Promise(r => setTimeout(r, 260));
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  if (buffer.length) onChunk(buffer, false);
  onChunk([], true);
}

// Fetch a fast seed for a language by grabbing the first N pages concurrently
export async function fetchLanguageSeed(langCode: string, pages: number = 12, adult: boolean = false): Promise<Movie[]> {
  const originCountry = ['hi','ta','te','ml','bn'].includes(langCode) ? 'IN' : '';
  const regionParam = originCountry ? `&with_origin_country=${originCountry}&region=${originCountry}` : '';
  const pagesArr = Array.from({ length: pages }, (_, i) => i + 1);
  const promises = pagesArr.map((p, index) => {
    const endpoint = encodeURIComponent(`/discover/movie?page=${p}&with_original_language=${langCode}${regionParam}&language=en-US&sort_by=popularity.desc&include_adult=${adult ? 'true' : 'false'}`);
    const url = `/api/movies?endpoint=${endpoint}`;
    return fetch(url).then(
      r => ({ r, index }),
      () => ({ r: null as any, index })
    );
  });
  const responses = await Promise.all(promises);
  const ok = responses.filter(x => x.r && x.r.ok);
  const data = await Promise.all(ok.map(x => x.r.json()));
  const all = data.flatMap(d => (d.results || []).map(convertTMDBMovie));
  const unique = all.filter((m, i, s) => i === s.findIndex(x => x.id === m.id));
  return unique;
}


