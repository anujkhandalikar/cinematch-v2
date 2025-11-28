/**
 * Populate movie cards in Supabase
 * Fetches 100 movies for each mood preset card using direct TMDB API calls
 * 
 * Usage:
 *   npm run populate-cards                    # Populate all 4 mood cards
 *   npm run populate-cards -- --mood=Bollywood  # Populate specific mood card
 * 
 * Requires:
 *   NEXT_PUBLIC_TMDB_API_KEY in environment or .env.local
 */

// Load environment variables from .env.local
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
// Also try .env as fallback
dotenv.config({ path: resolve(process.cwd(), '.env') });

// Load environment variables from .env.local FIRST, before any other imports
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local file (takes precedence)
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
// Also try .env as fallback
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { movieCardService } from '../lib/supabase';
import { filterMovies } from '../lib/movies';
import type { UserPreferences, MoodPreset, Movie } from '../lib/store';
import { convertTMDBMovie, GENRE_MAP } from '../lib/tmdb';

// Direct TMDB API client for scripts (bypasses Next.js API routes)
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.error('❌ TMDB API key is missing!');
  console.error('   Please set NEXT_PUBLIC_TMDB_API_KEY or TMDB_API_KEY in your environment or .env.local');
  console.error('   Current env check:', {
    hasNextPublic: !!process.env.NEXT_PUBLIC_TMDB_API_KEY,
    hasTmdb: !!process.env.TMDB_API_KEY,
    nextPublicValue: process.env.NEXT_PUBLIC_TMDB_API_KEY ? 'Set (hidden)' : 'Not set',
    tmdbValue: process.env.TMDB_API_KEY ? 'Set (hidden)' : 'Not set'
  });
  process.exit(1);
}

console.log('✅ TMDB API key loaded:', TMDB_API_KEY ? `${TMDB_API_KEY.substring(0, 8)}...` : 'MISSING');

// Fetch movies directly from TMDB API
async function fetchTMDBDiscoverPage(page: number, params: {
  language?: string;
  with_original_language?: string;
  sort_by?: string;
  include_adult?: boolean;
  'primary_release_date.gte'?: string;
  'primary_release_date.lte'?: string;
  with_genres?: string;
  without_genres?: string;
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
  });

  const url = `${TMDB_BASE_URL}/discover/movie?${queryParams.toString()}`;
  
  try {
    console.log(`   🔍 Fetching page ${page} from TMDB discover...`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const errorMsg = `TMDB API error: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`;
      console.error(`   ❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    console.log(`   ✅ Fetched page ${page}: ${data.results?.length || 0} movies`);
    return data;
  } catch (error: any) {
    console.error(`   ❌ Error fetching page ${page}:`, error.message);
    if (error.cause) {
      console.error(`   Cause:`, error.cause);
    }
    if (error.code) {
      console.error(`   Error code:`, error.code);
    }
    throw error;
  }
}

// Fetch top rated movies from TMDB
async function fetchTMDBTopRated(page: number, language: string = 'en-US'): Promise<any> {
  const url = `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&page=${page}&language=${language}`;
  
  try {
    console.log(`   🔍 Fetching top rated page ${page} from TMDB...`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const errorMsg = `TMDB API error: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`;
      console.error(`   ❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    console.log(`   ✅ Fetched top rated page ${page}: ${data.results?.length || 0} movies`);
    return data;
  } catch (error: any) {
    console.error(`   ❌ Error fetching top rated page ${page}:`, error.message);
    if (error.cause) {
      console.error(`   Cause:`, error.cause);
    }
    if (error.code) {
      console.error(`   Error code:`, error.code);
    }
    throw error;
  }
}

// Mood preset configurations
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

async function populateMoodCard(mood: MoodPreset): Promise<void> {
  console.log(`\n🎬 Populating ${mood} card...`);
  
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
  
  console.log(`   Config:`, JSON.stringify(config, null, 2));
  
  try {
    // Fetch movies using current logic (this will use TMDB since cards aren't populated yet)
    // We need to temporarily bypass the Supabase check or use a direct TMDB call
    // For now, we'll use a workaround: fetch without mood preset first, then filter
    
    let movies: any[] = [];
    
    if (mood === 'CriticallyAcclaimed') {
      // For CriticallyAcclaimed, fetch top rated movies
      console.log('   Fetching top rated movies from TMDB...');
      const allPages: any[] = [];
      const pagesToFetch = 5; // Fetch 5 pages to get ~100 movies
      
      for (let page = 1; page <= pagesToFetch; page++) {
        const data = await fetchTMDBTopRated(page, 'en-US');
        allPages.push(...(data.results || []));
        // Rate limiting: wait 250ms between requests
        if (page < pagesToFetch) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }
      
      movies = allPages.map(convertTMDBMovie);
      console.log(`   Fetched ${movies.length} top rated movies from TMDB`);
    } else if (preferences.languages && preferences.languages.length > 0) {
      // For language-specific moods (like Bollywood)
      const languageCodes: Record<string, string> = { 
        English: 'en', Hindi: 'hi', Tamil: 'ta', Telugu: 'te', 
        Malayalam: 'ml', Bengali: 'bn' 
      };
      
      const code = languageCodes[preferences.languages[0] as string];
      if (code) {
        console.log(`   Fetching movies for language: ${code}...`);
        const allPages: any[] = [];
        const pagesToFetch = 20; // Fetch 20 pages to get more movies
        
        for (let page = 1; page <= pagesToFetch; page++) {
          const data = await fetchTMDBDiscoverPage(page, {
            with_original_language: code,
            language: 'en-US',
            sort_by: 'popularity.desc',
            include_adult: !!preferences.adultContent,
          });
          allPages.push(...(data.results || []));
          // Rate limiting
          if (page < pagesToFetch) {
            await new Promise(resolve => setTimeout(resolve, 250));
          }
        }
        
        movies = allPages.map(convertTMDBMovie);
        console.log(`   Fetched ${movies.length} movies for language ${preferences.languages[0]} (before filtering)`);
      }
    } else {
      // For other moods, fetch from discover endpoint WITHOUT genre filters first
      // We'll apply genre filters later in filterMovies to get more results
      console.log('   Fetching movies from TMDB discover (fetching more, will filter later)...');
      const allPages: any[] = [];
      const pagesToFetch = 20; // Fetch 20 pages to get ~400 movies, then filter down to 100
      
      // Calculate date range for releaseAfterMonths
      let dateGte: string | undefined;
      if (preferences.releaseAfterMonths) {
        const date = new Date();
        date.setMonth(date.getMonth() - preferences.releaseAfterMonths);
        dateGte = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      
      // Don't use genre filters at TMDB level - too restrictive
      // We'll filter by genres in filterMovies function instead
      
      for (let page = 1; page <= pagesToFetch; page++) {
        const data = await fetchTMDBDiscoverPage(page, {
          language: 'en-US',
          sort_by: 'popularity.desc',
          include_adult: !!preferences.adultContent,
          ...(dateGte && { 'primary_release_date.gte': dateGte }),
          // Don't add genre filters here - fetch broadly, filter later
        });
        allPages.push(...(data.results || []));
        // Rate limiting
        if (page < pagesToFetch) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }
      
      movies = allPages.map(convertTMDBMovie);
      console.log(`   Fetched ${movies.length} movies from discover (before filtering)`);
    }
    
    // Apply filters using the same filterMovies function used in the app
    movies = filterMovies(movies as Movie[], {
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
    
    // Remove duplicates
    const uniqueMovies = movies.filter((movie, index, self) => 
      index === self.findIndex(m => m.id === movie.id)
    );
    
    console.log(`   📊 After filtering: ${uniqueMovies.length} unique movies`);
    
    // If we don't have 100 movies, try to fetch more pages
    if (uniqueMovies.length < 100 && mood !== 'CriticallyAcclaimed') {
      console.log(`   ⚠️ Only got ${uniqueMovies.length} movies, fetching more pages...`);
      
      // Fetch additional pages
      const additionalPages: any[] = [];
      const morePagesToFetch = 30; // Fetch 30 more pages
      
      if (mood === 'Bollywood' && preferences.languages && preferences.languages.length > 0) {
        // For Bollywood, fetch more language-specific pages
        const languageCodes: Record<string, string> = { 
          English: 'en', Hindi: 'hi', Tamil: 'ta', Telugu: 'te', 
          Malayalam: 'ml', Bengali: 'bn' 
        };
        const code = languageCodes[preferences.languages[0] as string];
        
        if (code) {
          for (let page = 21; page <= 20 + morePagesToFetch; page++) {
            const data = await fetchTMDBDiscoverPage(page, {
              with_original_language: code,
              language: 'en-US',
              sort_by: 'popularity.desc',
              include_adult: !!preferences.adultContent,
            });
            additionalPages.push(...(data.results || []));
            if (page < 20 + morePagesToFetch) {
              await new Promise(resolve => setTimeout(resolve, 250));
            }
          }
        }
      } else {
        // For other moods, fetch more discover pages
        let dateGte: string | undefined;
        if (preferences.releaseAfterMonths) {
          const date = new Date();
          date.setMonth(date.getMonth() - preferences.releaseAfterMonths);
          dateGte = date.toISOString().split('T')[0];
        }
        
        for (let page = 21; page <= 20 + morePagesToFetch; page++) {
          const data = await fetchTMDBDiscoverPage(page, {
            language: 'en-US',
            sort_by: 'popularity.desc',
            include_adult: !!preferences.adultContent,
            ...(dateGte && { 'primary_release_date.gte': dateGte }),
          });
          additionalPages.push(...(data.results || []));
          if (page < 20 + morePagesToFetch) {
            await new Promise(resolve => setTimeout(resolve, 250));
          }
        }
      }
      
      const additionalMovies = additionalPages.map(convertTMDBMovie);
      const allMovies = [...uniqueMovies, ...additionalMovies];
      
      // Re-filter with all movies
      const reFiltered = filterMovies(allMovies as Movie[], {
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
      
      const finalUnique = reFiltered.filter((movie, index, self) => 
        index === self.findIndex(m => m.id === movie.id)
      );
      
      movies = finalUnique;
      console.log(`   📊 After fetching more: ${finalUnique.length} unique movies`);
    }
    
    // Take top 100
    const top100 = movies.slice(0, 100);
    
    console.log(`   ✅ Got ${top100.length} unique movies (target: 100)`);
    
    if (top100.length === 0) {
      console.warn(`   ⚠️ No movies found for ${mood} - skipping`);
      return;
    }
    
    // Store in Supabase
    await movieCardService.upsertMovieCard(
      mood,
      'mood_preset',
      config,
      top100
    );
    
    console.log(`   ✅ Successfully stored ${top100.length} movies for ${mood}`);
  } catch (error: any) {
    console.error(`   ❌ Error populating ${mood}:`, error.message);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const moodArg = args.find(arg => arg.startsWith('--mood='));
  const specificMood = moodArg ? moodArg.split('=')[1] as MoodPreset : null;
  
  const moodsToPopulate: MoodPreset[] = specificMood 
    ? [specificMood]
    : ['Bollywood', 'LightFun', 'CriticallyAcclaimed', 'NewPopular'];
  
  console.log('🎬 Starting movie card population...');
  console.log(`   Moods to populate: ${moodsToPopulate.join(', ')}`);
  
  for (const mood of moodsToPopulate) {
    try {
      await populateMoodCard(mood);
    } catch (error: any) {
      console.error(`❌ Failed to populate ${mood}:`, error.message);
      // Continue with other moods
    }
  }
  
  console.log('\n✅ Movie card population complete!');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { populateMoodCard, MOOD_CONFIGS };

