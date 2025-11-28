/**
 * Fix movies with rating 0 in movie cards
 * Finds all movies with rating 0 and replaces them with non-zero rated movies
 * 
 * Usage:
 *   npm run fix-zero-rated
 */

// Load environment variables from .env.local FIRST
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { movieCardService } from '../lib/supabase';
import { convertTMDBMovie, GENRE_MAP } from '../lib/tmdb';
import type { MoodPreset, Movie } from '../lib/store';

// Direct TMDB API client for scripts
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.error('❌ TMDB API key is missing!');
  console.error('   Please set NEXT_PUBLIC_TMDB_API_KEY or TMDB_API_KEY in your environment or .env.local');
  process.exit(1);
}

console.log('✅ TMDB API key loaded:', TMDB_API_KEY ? `${TMDB_API_KEY.substring(0, 8)}...` : 'MISSING');

const MOODS: MoodPreset[] = ['Bollywood', 'LightFun', 'CriticallyAcclaimed', 'NewPopular'];

// Fetch movies from TMDB discover endpoint
async function fetchTMDBDiscoverPage(page: number, params: {
  language?: string;
  with_original_language?: string;
  sort_by?: string;
  include_adult?: boolean;
  'primary_release_date.gte'?: string;
  'primary_release_date.lte'?: string;
  with_genres?: string;
  'vote_average.gte'?: string;
}): Promise<any> {
  const queryParams = new URLSearchParams({
    api_key: TMDB_API_KEY,
    page: page.toString(),
    ...(params.language && { language: params.language }),
    ...(params.with_original_language && { with_original_language: params.with_original_language }),
    ...(params.sort_by && { sort_by: params.sort_by }),
    ...(params.include_adult !== undefined && { include_adult: params.include_adult.toString() }),
    ...(params['primary_release_date.gte'] && { 'primary_release_date.gte': params['primary_release_date.gte'] }),
    ...(params['primary_release_date.lte'] && { 'primary_release_date.lte': params['primary_release_date.lte'] }),
    ...(params.with_genres && { with_genres: params.with_genres }),
    ...(params['vote_average.gte'] && { 'vote_average.gte': params['vote_average.gte'] }),
  });

  const url = `${TMDB_BASE_URL}/discover/movie?${queryParams.toString()}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error(`   ❌ Error fetching page ${page}:`, error.message);
    throw error;
  }
}

// Fetch top rated movies from TMDB
async function fetchTMDBTopRated(page: number, language: string = 'en-US'): Promise<any> {
  const url = `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&page=${page}&language=${language}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error(`   ❌ Error fetching top rated page ${page}:`, error.message);
    throw error;
  }
}

// Find a replacement movie for a zero-rated movie
async function findReplacementMovie(
  originalMovie: Movie,
  mood: MoodPreset,
  existingMovieIds: Set<string>
): Promise<Movie | null> {
  console.log(`   🔍 Finding replacement for: ${originalMovie.title} (${originalMovie.year})`);
  
  // Try to match similar criteria
  const languageCodes: Record<string, string> = { 
    English: 'en', Hindi: 'hi', Tamil: 'ta', Telugu: 'te', 
    Malayalam: 'ml', Bengali: 'bn' 
  };
  
  // Determine language from original movie's original_language or genres
  let languageCode: string | undefined;
  if (mood === 'Bollywood') {
    languageCode = 'hi'; // Hindi for Bollywood
  } else {
    languageCode = 'en'; // Default to English
  }
  
  // Convert genres to TMDB genre IDs
  const genreIds: number[] = [];
  if (originalMovie.genres && originalMovie.genres.length > 0) {
    for (const [tmdbId, genreName] of Object.entries(GENRE_MAP)) {
      if (originalMovie.genres.includes(genreName)) {
        genreIds.push(parseInt(tmdbId));
      }
    }
  }
  
  // Try multiple strategies to find a replacement
  const strategies = [
    // Strategy 1: Same genres, minimum rating 5.0
    async () => {
      if (genreIds.length === 0) return null;
      const genreString = genreIds.join(',');
      for (let page = 1; page <= 5; page++) {
        const data = await fetchTMDBDiscoverPage(page, {
          with_genres: genreString,
          language: 'en-US',
          sort_by: 'popularity.desc',
          include_adult: false,
          'vote_average.gte': '5.0',
          ...(languageCode && languageCode !== 'en' && { with_original_language: languageCode }),
        });
        const candidates = (data.results || [])
          .map((m: any) => convertTMDBMovie(m))
          .filter((m: Movie) => 
            m.rating > 0 && 
            !existingMovieIds.has(m.id) &&
            m.id !== originalMovie.id
          );
        if (candidates.length > 0) {
          return candidates[0];
        }
        await new Promise(resolve => setTimeout(resolve, 250)); // Rate limiting
      }
      return null;
    },
    
    // Strategy 2: Popular movies with minimum rating 5.0
    async () => {
      for (let page = 1; page <= 5; page++) {
        const data = await fetchTMDBDiscoverPage(page, {
          language: 'en-US',
          sort_by: 'popularity.desc',
          include_adult: false,
          'vote_average.gte': '5.0',
          ...(languageCode && languageCode !== 'en' && { with_original_language: languageCode }),
        });
        const candidates = (data.results || [])
          .map((m: any) => convertTMDBMovie(m))
          .filter((m: Movie) => 
            m.rating > 0 && 
            !existingMovieIds.has(m.id) &&
            m.id !== originalMovie.id
          );
        if (candidates.length > 0) {
          return candidates[0];
        }
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      return null;
    },
    
    // Strategy 3: Top rated movies (for CriticallyAcclaimed)
    async () => {
      if (mood === 'CriticallyAcclaimed') {
        for (let page = 1; page <= 5; page++) {
          const data = await fetchTMDBTopRated(page, 'en-US');
          const candidates = (data.results || [])
            .map((m: any) => convertTMDBMovie(m))
            .filter((m: Movie) => 
              m.rating > 0 && 
              !existingMovieIds.has(m.id) &&
              m.id !== originalMovie.id
            );
          if (candidates.length > 0) {
            return candidates[0];
          }
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }
      return null;
    },
  ];
  
  // Try each strategy until we find a replacement
  for (const strategy of strategies) {
    try {
      const replacement = await strategy();
      if (replacement) {
        console.log(`   ✅ Found replacement: ${replacement.title} (${replacement.year}) - Rating: ${replacement.rating}/10`);
        return replacement;
      }
    } catch (error: any) {
      console.warn(`   ⚠️ Strategy failed:`, error.message);
      continue;
    }
  }
  
  console.warn(`   ❌ Could not find replacement for: ${originalMovie.title}`);
  return null;
}

// Fix zero-rated movies in a mood card
async function fixZeroRatedMovies(mood: MoodPreset): Promise<void> {
  console.log(`\n🎬 Fixing zero-rated movies in ${mood} card...`);
  
  try {
    // Fetch the movie card from Supabase
    const card = await movieCardService.getMovieCard(mood);
    
    if (!card) {
      console.log(`   ❌ No card found for ${mood}`);
      return;
    }
    
    const movies = card.movies as Movie[];
    
    if (!Array.isArray(movies) || movies.length === 0) {
      console.log(`   ❌ No movies in ${mood} card`);
      return;
    }
    
    // Find movies with rating 0
    const zeroRatedMovies = movies.filter(m => m.rating === 0);
    
    if (zeroRatedMovies.length === 0) {
      console.log(`   ✅ No zero-rated movies found in ${mood} card`);
      return;
    }
    
    console.log(`   📊 Found ${zeroRatedMovies.length} movies with rating 0`);
    
    // Create a set of existing movie IDs to avoid duplicates
    const existingMovieIds = new Set(movies.map(m => m.id));
    
    // Find replacements for each zero-rated movie
    const replacements: Array<{ original: Movie; replacement: Movie }> = [];
    
    for (const zeroRatedMovie of zeroRatedMovies) {
      const replacement = await findReplacementMovie(zeroRatedMovie, mood, existingMovieIds);
      if (replacement) {
        replacements.push({ original: zeroRatedMovie, replacement });
        existingMovieIds.add(replacement.id); // Add to set to avoid duplicates
        // Rate limiting between replacements
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (replacements.length === 0) {
      console.log(`   ⚠️ No replacements found for zero-rated movies in ${mood}`);
      return;
    }
    
    console.log(`   ✅ Found ${replacements.length} replacements`);
    
    // Replace zero-rated movies with their replacements
    const updatedMovies = movies.map(movie => {
      const replacement = replacements.find(r => r.original.id === movie.id);
      if (replacement) {
        return replacement.replacement;
      }
      return movie;
    });
    
    // Update the card in Supabase
    console.log(`   💾 Updating ${mood} card in Supabase...`);
    await movieCardService.upsertMovieCard(
      mood,
      card.card_type || 'mood_preset',
      card.card_config || {},
      updatedMovies
    );
    
    console.log(`   ✅ Successfully updated ${mood} card with ${replacements.length} replacements`);
    
    // Summary
    console.log(`\n   📋 Summary for ${mood}:`);
    console.log(`      - Original movies: ${movies.length}`);
    console.log(`      - Zero-rated movies: ${zeroRatedMovies.length}`);
    console.log(`      - Replacements found: ${replacements.length}`);
    console.log(`      - Updated movies: ${updatedMovies.length}`);
    
  } catch (error: any) {
    console.error(`   ❌ Error fixing ${mood}:`, error.message);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const moodArg = args.find(arg => arg.startsWith('--mood='));
  const specificMood = moodArg ? moodArg.split('=')[1] as MoodPreset : null;
  
  const moodsToFix: MoodPreset[] = specificMood 
    ? [specificMood]
    : MOODS;
  
  console.log('🎬 Starting zero-rated movie fix...');
  console.log(`   Cards to check: ${moodsToFix.join(', ')}`);
  console.log(`   This will replace all movies with rating 0 with non-zero rated movies\n`);
  
  for (const mood of moodsToFix) {
    try {
      await fixZeroRatedMovies(mood);
    } catch (error: any) {
      console.error(`❌ Failed to fix ${mood}:`, error.message);
      // Continue with other moods
    }
  }
  
  console.log('\n✅ Zero-rated movie fix complete!');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { fixZeroRatedMovies };

