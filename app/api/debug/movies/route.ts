import { NextRequest, NextResponse } from 'next/server';
import { fetchLanguageSeed } from '@/lib/ingestion';
import { filterMovies } from '@/lib/movies';
import { convertTMDBToLanguages } from '@/lib/tmdb';
import type { Language } from '@/lib/store';

// Debug endpoint to fetch and filter movies by year and language
// Usage: /api/debug/movies?year=2025&language=hindi
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year') || null;
    const languageParam = (searchParams.get('language') || 'hindi').toLowerCase();
    const genreParam = searchParams.get('genre') || null;
    const highRatedOnly = searchParams.get('highRatedOnly') === 'true';
    
    // Map language name to code
    const languageMap: Record<string, string> = {
      'english': 'en',
      'hindi': 'hi',
      'tamil': 'ta',
      'telugu': 'te',
      'malayalam': 'ml',
      'bengali': 'bn'
    };
    
    const languageCode = languageMap[languageParam];
    if (!languageCode) {
      return NextResponse.json(
        { error: `Unknown language: ${languageParam}. Supported: ${Object.keys(languageMap).join(', ')}` },
        { status: 400 }
      );
    }
    
    // Parse year filter
    let releaseYear: '2025' | '2000s' | 'older' | null = null;
    if (year === '2025') {
      releaseYear = '2025';
    } else if (year === '2000s') {
      releaseYear = '2000s';
    } else if (year === 'older') {
      releaseYear = 'older';
    } else if (year) {
      const yearNum = parseInt(year);
      if (!isNaN(yearNum)) {
        releaseYear = yearNum as any;
      }
    }
    
    // Parse genre filter
    const genres = genreParam ? [genreParam] as any : [];
    
    console.log(`🔍 Debug: Fetching ${languageParam} movies${year ? ` from ${year}` : ''}${genreParam ? ` with genre ${genreParam}` : ''}...`);
    
    // Fetch a good sample (20 pages = ~400 movies for better coverage)
    const allMovies = await fetchLanguageSeed(languageCode, 20, false);
    
    console.log(`📥 Fetched ${allMovies.length} raw movies`);
    
    // Filter with all preferences
    const languageEnum: Language = languageParam.charAt(0).toUpperCase() + languageParam.slice(1) as Language;
    
    const filtered = filterMovies(allMovies, {
      genres: genres,
      ottPlatforms: [],
      languages: [languageEnum],
      adultContent: false,
      releaseYear: releaseYear,
      highRatedOnly: highRatedOnly,
    });
    
    console.log(`✅ Filtered to ${filtered.length} movies`);
    
    // Verify filters
    const verification = filtered.map(m => {
      const yearMatch = !releaseYear || (() => {
        if (releaseYear === '2025') return m.year === 2025;
        if (releaseYear === '2000s') return m.year >= 2000 && m.year <= 2024;
        if (releaseYear === 'older') return m.year < 2000;
        if (typeof releaseYear === 'number') return m.year >= releaseYear;
        return true;
      })();
      
      const genreMatch = genres.length === 0 || genres.every((g: string) => m.genres.includes(g as any));
      const ratingMatch = !highRatedOnly || (m.rating && m.rating >= 8.0);
      const langMatch = m.original_language === languageCode || 
        convertTMDBToLanguages(m.original_language || 'en') === languageEnum;
      
      return {
        id: m.id,
        title: m.title,
        year: m.year,
        rating: m.rating,
        genres: m.genres,
        ott: m.ott,
        original_language: m.original_language,
        matches: {
          year: yearMatch,
          genre: genreMatch,
          rating: ratingMatch,
          language: langMatch,
          all: yearMatch && genreMatch && ratingMatch && langMatch
        }
      };
    });
    
    const mismatches = verification.filter(m => !m.matches.all);
    
    return NextResponse.json({
      filters: {
        year: year || 'none',
        language: languageParam,
        genre: genreParam || 'none',
        highRatedOnly: highRatedOnly,
      },
      languageCode: languageCode,
      releaseYearFilter: releaseYear,
      totalFetched: allMovies.length,
      filteredCount: filtered.length,
      movies: filtered.slice(0, 100), // Return first 100
      summary: {
        perfectMatches: verification.filter(m => m.matches.all).length,
        mismatches: mismatches.length,
        sampleTitles: filtered.slice(0, 20).map(m => ({ 
          title: m.title, 
          year: m.year, 
          rating: m.rating,
          genres: m.genres,
          ott: m.ott 
        })),
        mismatchesDetail: mismatches.slice(0, 10) // Show first 10 mismatches if any
      },
      verification: verification.slice(0, 50) // Show verification for first 50
    });
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

