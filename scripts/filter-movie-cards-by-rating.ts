/**
 * Filter movie cards to only include movies with rating >= 7
 * Removes all movies with rating < 7 and fetches new movies from TMDB to replace them
 * 
 * Usage:
 *   npm run filter-by-rating                    # Filter all 4 mood cards
 *   npm run filter-by-rating -- --mood=Bollywood  # Filter specific mood card
 */

// Load environment variables from .env.local FIRST
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { movieCardService } from '../lib/supabase';
import { filterMovies } from '../lib/movies';
import type { UserPreferences, MoodPreset, Movie } from '../lib/store';
import { convertTMDBMovie, GENRE_MAP } from '../lib/tmdb';

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

// Mood preset configurations (same as populate-movie-cards.ts)
const MOOD_CONFIGS: Record<MoodPreset, Partial<UserPreferences>> = {
  Bollywood: {
    languages: ['Hindi'],
    releaseYear: 2000,
    adultContent: false,
    moodPreset: 'Bollywood',
  },
  LightFun: {
    moodIncludeGenres: ['Comedy', 'Romance', 'Drama', 'Family', 'Animation'],
    moodExcludeGenres: ['Horror', 'Thriller', 'War', 'Crime'],
    adultContent: false,
    moodPreset: 'LightFun',
  },
  CriticallyAcclaimed: {
    imdbTop250Movies: true,
    adultContent: false,
    moodPreset: 'CriticallyAcclaimed',
  },
  NewPopular: {
    moodIncludeGenres: ['Action', 'Comedy', 'Drama', 'Thriller', 'Romance'],
    releaseAfterMonths: 24,
    adultContent: false,
    moodPreset: 'NewPopular',
  },
};

// Fetch movies from TMDB discover endpoint with rating filter
async function fetchTMDBDiscoverPage(page: number, params: {
  language?: string;
  with_original_language?: string;
  sort_by?: string;
  include_adult?: boolean;
  'primary_release_date.gte'?: string;
  'primary_release_date.lte'?: string;
  with_genres?: string;
  without_genres?: string;
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
    ...(params.without_genres && { without_genres: params.without_genres }),
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

// Fetch additional movies from TMDB to fill gaps
async function fetchAdditionalMovies(
  mood: MoodPreset,
  existingMovieIds: Set<string>,
  targetCount: number,
  currentCount: number
): Promise<Movie[]> {
  const config = MOOD_CONFIGS[mood];
  const preferences: UserPreferences = {
    genres: [],
    ottPlatforms: [],
    languages: config.languages || [],
    adultContent: config.adultContent || false,
    releaseYear: config.releaseYear || null,
    highRatedOnly: config.highRatedOnly || false,
    imdbTop250Movies: config.imdbTop250Movies || false,
    releaseAfterMonths: config.releaseAfterMonths || null,
    moodPreset: mood,
    moodIncludeGenres: config.moodIncludeGenres || [],
    moodExcludeGenres: config.moodExcludeGenres || [],
  };
  
  const needed = targetCount - currentCount;
  if (needed <= 0) {
    return [];
  }
  
  console.log(`   🔍 Fetching ${needed} additional movies from TMDB (rating >= 7)...`);
  
  let movies: any[] = [];
  
  if (mood === 'CriticallyAcclaimed') {
    // For CriticallyAcclaimed, fetch top rated movies (they're already high rated)
    const pagesToFetch = Math.ceil(needed / 20) + 2; // Fetch extra pages to account for filtering
    
    for (let page = 1; page <= pagesToFetch && movies.length < needed * 2; page++) {
      try {
        const data = await fetchTMDBTopRated(page, 'en-US');
        const converted = (data.results || [])
          .map((m: any) => convertTMDBMovie(m))
          .filter((m: Movie) => 
            m.rating >= 7 && 
            !existingMovieIds.has(m.id)
          );
        movies.push(...converted);
        if (page < pagesToFetch) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      } catch (error: any) {
        console.warn(`   ⚠️ Error fetching page ${page}: ${error.message}`);
      }
    }
  } else if (preferences.languages && preferences.languages.length > 0) {
    // For language-specific moods (like Bollywood)
    const languageCodes: Record<string, string> = { 
      English: 'en', Hindi: 'hi', Tamil: 'ta', Telugu: 'te', 
      Malayalam: 'ml', Bengali: 'bn' 
    };
    
    const code = languageCodes[preferences.languages[0] as string];
    if (code) {
      const pagesToFetch = Math.ceil(needed / 20) + 5;
      
      for (let page = 1; page <= pagesToFetch && movies.length < needed * 2; page++) {
        try {
          const data = await fetchTMDBDiscoverPage(page, {
            with_original_language: code,
            language: 'en-US',
            sort_by: 'popularity.desc',
            include_adult: !!preferences.adultContent,
            'vote_average.gte': '7.0', // Only fetch movies with rating >= 7
          });
          const converted = (data.results || [])
            .map((m: any) => convertTMDBMovie(m))
            .filter((m: Movie) => 
              m.rating >= 7 && 
              !existingMovieIds.has(m.id)
            );
          movies.push(...converted);
          if (page < pagesToFetch) {
            await new Promise(resolve => setTimeout(resolve, 250));
          }
        } catch (error: any) {
          console.warn(`   ⚠️ Error fetching page ${page}: ${error.message}`);
        }
      }
    }
  } else {
    // For other moods (like LightFun), fetch from discover endpoint
    // For LightFun, be more aggressive in fetching
    const isLightFun = mood === 'LightFun';
    const basePages = isLightFun ? Math.ceil(needed / 20) + 15 : Math.ceil(needed / 20) + 5;
    const pagesToFetch = basePages;
    
    let dateGte: string | undefined;
    if (preferences.releaseAfterMonths) {
      const date = new Date();
      date.setMonth(date.getMonth() - preferences.releaseAfterMonths);
      dateGte = date.toISOString().split('T')[0];
    }
    
    // Strategy 1: Fetch with genre filters (for LightFun: Comedy, Romance, Drama, Family, Animation)
    for (let page = 1; page <= pagesToFetch && movies.length < needed * 3; page++) {
      try {
        const data = await fetchTMDBDiscoverPage(page, {
          language: 'en-US',
          sort_by: 'popularity.desc',
          include_adult: !!preferences.adultContent,
          'vote_average.gte': '7.0', // Only fetch movies with rating >= 7
          ...(dateGte && { 'primary_release_date.gte': dateGte }),
        });
        const converted = (data.results || [])
          .map((m: any) => convertTMDBMovie(m))
          .filter((m: Movie) => 
            m.rating >= 7 && 
            !existingMovieIds.has(m.id)
          );
        movies.push(...converted);
        if (page < pagesToFetch) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      } catch (error: any) {
        console.warn(`   ⚠️ Error fetching page ${page}: ${error.message}`);
      }
    }
    
    // Strategy 2: For LightFun, if we still don't have enough, try fetching popular movies without genre restrictions
    // and filter client-side (more lenient)
    if (isLightFun && movies.length < needed) {
      console.log(`   🔄 LightFun: Only got ${movies.length} movies, trying broader fetch...`);
      const additionalPages = 20; // Fetch 20 more pages
      const allMoviesBeforeFilter = [...movies];
      
      for (let page = pagesToFetch + 1; page <= pagesToFetch + additionalPages && movies.length < needed * 2; page++) {
        try {
          const data = await fetchTMDBDiscoverPage(page, {
            language: 'en-US',
            sort_by: 'popularity.desc',
            include_adult: false,
            'vote_average.gte': '7.0',
          });
          const converted = (data.results || [])
            .map((m: any) => convertTMDBMovie(m))
            .filter((m: Movie) => 
              m.rating >= 7 && 
              !existingMovieIds.has(m.id)
            );
          movies.push(...converted);
          if (page < pagesToFetch + additionalPages) {
            await new Promise(resolve => setTimeout(resolve, 250));
          }
        } catch (error: any) {
          console.warn(`   ⚠️ Error fetching additional page ${page}: ${error.message}`);
        }
      }
      
      console.log(`   📊 LightFun: Fetched ${movies.length - allMoviesBeforeFilter.length} additional movies from broader search`);
    }
  }
  
  // Apply mood-specific filters
  if (movies.length > 0) {
    const beforeFilter = movies.length;
    const filteredMovies = filterMovies(movies as Movie[], {
      genres: preferences.genres,
      ottPlatforms: preferences.ottPlatforms,
      languages: preferences.languages,
      adultContent: preferences.adultContent,
      releaseYear: preferences.releaseYear,
      highRatedOnly: preferences.highRatedOnly,
      releaseAfterMonths: preferences.releaseAfterMonths,
      moodIncludeGenres: preferences.moodIncludeGenres,
      moodExcludeGenres: preferences.moodExcludeGenres,
      moodPreset: preferences.moodPreset,
    });
    
    // For LightFun, if filtering removed too many, try a more lenient filter
    if (mood === 'LightFun' && filteredMovies.length < needed && filteredMovies.length < beforeFilter * 0.5) {
      console.log(`   🔄 LightFun: Filter too strict (${beforeFilter} -> ${filteredMovies.length}), trying lenient filter...`);
      
      // Try with only exclude genres (no include genres requirement) on original movies
      const lenientMovies = filterMovies(movies as Movie[], {
        genres: [],
        ottPlatforms: [],
        languages: [],
        adultContent: false,
        releaseYear: null,
        highRatedOnly: false,
        releaseAfterMonths: null,
        moodIncludeGenres: [], // Don't require specific genres
        moodExcludeGenres: preferences.moodExcludeGenres, // Still exclude Horror, Thriller, War, Crime
        moodPreset: preferences.moodPreset,
      });
      
      if (lenientMovies.length > filteredMovies.length) {
        console.log(`   ✅ LightFun: Lenient filter gave ${lenientMovies.length} movies (vs ${filteredMovies.length} strict)`);
        movies = lenientMovies;
      } else {
        movies = filteredMovies;
      }
    } else {
      movies = filteredMovies;
    }
  }
  
  // Remove duplicates
  const uniqueMovies = movies.filter((movie, index, self) => 
    index === self.findIndex(m => m.id === movie.id)
  );
  
  return uniqueMovies;
}

// Filter movies by rating (>= 7) in a mood card and fetch replacements
async function filterMoviesByRating(mood: MoodPreset): Promise<void> {
  console.log(`\n🎬 Filtering ${mood} card to rating >= 7...`);
  
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
    
    const originalCount = movies.length;
    console.log(`   📊 Original movie count: ${originalCount}`);
    
    // Filter movies to only keep those with rating >= 7
    // Double-check: ensure rating is a number and >= 7
    const filteredMovies = movies.filter(m => {
      const rating = typeof m.rating === 'number' ? m.rating : 0;
      return rating >= 7;
    });
    const filteredCount = filteredMovies.length;
    const removedCount = originalCount - filteredCount;
    
    // Log any movies that were incorrectly included
    const lowRated = movies.filter(m => {
      const rating = typeof m.rating === 'number' ? m.rating : 0;
      return rating < 7;
    });
    if (lowRated.length > 0) {
      console.log(`   ⚠️ Found ${lowRated.length} movies with rating < 7:`);
      lowRated.slice(0, 5).forEach(m => {
        console.log(`      - ${m.title} (${m.year}): ${m.rating}/10`);
      });
    }
    
    console.log(`   📊 Movies with rating >= 7: ${filteredCount}`);
    console.log(`   📊 Movies removed (rating < 7): ${removedCount}`);
    
    // Create set of existing movie IDs to avoid duplicates
    const existingMovieIds = new Set(filteredMovies.map(m => m.id));
    
    // Target is 100 movies (or original count if less)
    const targetCount = Math.max(100, originalCount);
    const needed = targetCount - filteredCount;
    
    let finalMovies = [...filteredMovies];
    
    // If we need more movies, fetch them from TMDB
    if (needed > 0) {
      console.log(`   🔄 Need ${needed} more movies to reach target of ${targetCount}`);
      const additionalMovies = await fetchAdditionalMovies(mood, existingMovieIds, targetCount, filteredCount);
      
      if (additionalMovies.length > 0) {
        console.log(`   ✅ Fetched ${additionalMovies.length} additional movies from TMDB`);
        finalMovies = [...filteredMovies, ...additionalMovies];
        
        // Remove duplicates again (just to be safe)
        finalMovies = finalMovies.filter((movie, index, self) => 
          index === self.findIndex(m => m.id === movie.id)
        );
        
        // Take up to target count
        finalMovies = finalMovies.slice(0, targetCount);
      } else {
        console.warn(`   ⚠️ Could not fetch additional movies. Using ${filteredCount} movies.`);
      }
    }
    
    // Final safety check: ensure ALL movies have rating >= 7
    const finalFiltered = finalMovies.filter(m => {
      const rating = typeof m.rating === 'number' ? m.rating : 0;
      return rating >= 7;
    });
    
    if (finalFiltered.length !== finalMovies.length) {
      const removed = finalMovies.length - finalFiltered.length;
      console.warn(`   ⚠️ Safety check: Removed ${removed} movies that still had rating < 7`);
      finalMovies = finalFiltered;
    }
    
    if (filteredCount === originalCount && finalMovies.length === originalCount && removedCount === 0) {
      console.log(`   ✅ All movies already have rating >= 7. No changes needed.`);
      return;
    }
    
    // Update the card in Supabase
    console.log(`   💾 Updating ${mood} card in Supabase...`);
    await movieCardService.upsertMovieCard(
      mood,
      card.card_type || 'mood_preset',
      card.card_config || {},
      finalMovies
    );
    
    console.log(`   ✅ Successfully updated ${mood} card`);
    
    // Summary
    console.log(`\n   📋 Summary for ${mood}:`);
    console.log(`      - Original movies: ${originalCount}`);
    console.log(`      - Movies with rating >= 7 (existing): ${filteredCount}`);
    console.log(`      - Movies removed: ${removedCount}`);
    console.log(`      - New movies fetched: ${finalMovies.length - filteredCount}`);
    console.log(`      - Final movie count: ${finalMovies.length}`);
    
  } catch (error: any) {
    console.error(`   ❌ Error filtering ${mood}:`, error.message);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const moodArg = args.find(arg => arg.startsWith('--mood='));
  const specificMood = moodArg ? moodArg.split('=')[1] as MoodPreset : null;
  
  const moodsToFilter: MoodPreset[] = specificMood 
    ? [specificMood]
    : MOODS;
  
  console.log('🎬 Starting movie card rating filter...');
  console.log(`   Cards to filter: ${moodsToFilter.join(', ')}`);
  console.log(`   This will remove all movies with rating < 7 from each card`);
  console.log(`   ⚠️ NOTE: After running this script, users may need to refresh their browser`);
  console.log(`      to clear the mood card cache (cache expires after 1 hour)\n`);
  
  for (const mood of moodsToFilter) {
    try {
      await filterMoviesByRating(mood);
    } catch (error: any) {
      console.error(`❌ Failed to filter ${mood}:`, error.message);
      // Continue with other moods
    }
  }
  
  console.log('\n✅ Movie card rating filter complete!');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { filterMoviesByRating };

