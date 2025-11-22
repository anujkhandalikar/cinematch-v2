/**
 * Populate movie cards in Supabase
 * Fetches 100 movies for each mood preset card using current fetchFilteredMovies logic
 * 
 * Usage:
 *   npm run populate-cards                    # Populate all 4 mood cards
 *   npm run populate-cards -- --mood=Bollywood  # Populate specific mood card
 */

import { movieCardService } from '../lib/supabase';
import { filterMovies } from '../lib/movies';
import type { UserPreferences, MoodPreset, Movie } from '../lib/store';

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
      // For CriticallyAcclaimed, we need to use the imdbTop250Movies path
      // We'll need to import and use the TMDB functions directly
      const { fetchTopRatedMovies, convertLanguagesToTMDB } = await import('../lib/tmdb');
      const tmdbLanguages = preferences.languages && preferences.languages.length > 0
        ? convertLanguagesToTMDB(preferences.languages)
        : ['en-US'];
      
      const topRatedMovies = await fetchTopRatedMovies(20, tmdbLanguages); // Fetch more pages to get 100
      movies = topRatedMovies;
      console.log(`   Fetched ${movies.length} top rated movies from TMDB`);
    } else {
      // For other moods, we'll use the streaming functions
      const { streamDiscoverAll, streamLanguageAll, fetchLanguageSeed } = await import('../lib/ingestion');
      
      if (preferences.languages && preferences.languages.length > 0) {
        const languageCodes: Record<string, string> = { 
          English: 'en', Hindi: 'hi', Tamil: 'ta', Telugu: 'te', 
          Malayalam: 'ml', Bengali: 'bn' 
        };
        
        // Fetch seed movies for the language
        const code = languageCodes[preferences.languages[0] as string];
        if (code) {
          const seedMovies = await fetchLanguageSeed(code, 20, !!preferences.adultContent);
          movies = seedMovies;
          console.log(`   Fetched ${movies.length} movies for language ${preferences.languages[0]}`);
        }
      } else {
        // Fetch from discover endpoint
        const allMovies: any[] = [];
        await streamDiscoverAll(
          { language: 'en-US', adult: !!preferences.adultContent },
          (chunk, isComplete) => {
            allMovies.push(...chunk);
            if (isComplete) {
              movies = allMovies;
            }
          }
        );
        console.log(`   Fetched ${movies.length} movies from discover`);
      }
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
    
    // Take top 100
    const top100 = uniqueMovies.slice(0, 100);
    
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

