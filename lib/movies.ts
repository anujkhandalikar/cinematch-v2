import type { Movie, Genre, OTTPlatform, Language } from '@/lib/store';
import { 
  fetchPopularMovies, 
  fetchMoviesByGenre, 
  fetchTrendingMovies,
  fetchMaximumMovies,
  fetchHindiMovies,
  // convertLanguagesToTMDB,
  // convertTMDBToLanguages,
  GENRE_MAP,
  OTT_PLATFORMS 
} from './tmdb';
import { loadMoviesProgressively, getCachedMovies } from './movieCache';

// Seeded random number generator for deterministic shuffling
function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

// Fetch movies from TMDB based on preferences
// 1) Serve an instant local deck (so UI never blocks)
// 2) Fetch a fast set from TMDB (trending + popular)
// 3) Filter and de-duplicate; fall back to instant if empty
export async function fetchFilteredMovies(preferences: {
  genres: Genre[];
  ottPlatforms: OTTPlatform[];
  languages: Language[];
  adultContent: boolean;
  releaseYear?: number;
}, onProgress?: (movies: Movie[], isComplete: boolean) => void): Promise<Movie[]> {
  try {
    console.log('Fetching movies from TMDB with preferences:', preferences);
    // Instant dataset to avoid spinner
    const instant = getCachedMovies({
      genres: preferences.genres,
      ottPlatforms: preferences.ottPlatforms,
      adultContent: preferences.adultContent,
      releaseYear: preferences.releaseYear,
    });
    if (instant.length > 0) {
      onProgress?.(instant, false);
    }
    // Language filtering disabled
    const languagesToUse: Language[] = [];

    let movies: Movie[] = [];
    // Language filters disabled: fetch maximum variety always
    console.log('Fetching a fast batch of movies from TMDB');
    // Faster initial load: trending first, then supplement with a small popular slice
    let trending: Movie[] = [];
    let popular: Movie[] = [];
    try {
      trending = await fetchTrendingMovies('week', 1);
    } catch (e) {
      console.warn('Trending fetch failed, continuing with popular:', e);
    }
    try {
      popular = await fetchPopularMovies(1, ['en-US']);
    } catch (e) {
      console.warn('Popular fetch failed:', e);
    }
    movies = [...trending, ...popular].slice(0, 200);
    console.log('Fast batch movies fetched:', movies.length);
    
    // Fallback: if no movies were fetched, try trending movies
    if (movies.length === 0) {
      console.log('No movies from fast path, trying trending fallback');
      try {
        movies = await fetchTrendingMovies('week', 1);
        console.log('Trending fallback fetched:', movies.length);
      } catch (e) {
        console.warn('Trending fallback failed; proceeding with empty list:', e);
        movies = [];
      }
    }
    
    // Filter out adult content if not allowed
    if (!preferences.adultContent) {
      movies = movies.filter(movie => !movie.adult);
    }
    
    // Apply date filtering
    if (preferences.releaseYear) {
      movies = movies.filter(movie => movie.year >= preferences.releaseYear!);
      console.log(`Filtered by year ${preferences.releaseYear}: ${movies.length} movies`);
    }
    
    // Remove duplicates based on movie ID
    const uniqueMovies = movies.filter((movie, index, self) => 
      index === self.findIndex(m => m.id === movie.id)
    );
    
    console.log(`✅ Final unique movies: ${uniqueMovies.length}`);
    onProgress?.(uniqueMovies, true);
    
    return uniqueMovies.length > 0 ? uniqueMovies : instant;
  } catch (error) {
    console.error('❌ Error fetching movies from TMDB:', error);
    const instant = getCachedMovies({
      genres: preferences.genres,
      ottPlatforms: preferences.ottPlatforms,
      adultContent: preferences.adultContent,
      releaseYear: preferences.releaseYear,
    });
    onProgress?.(instant, true);
    return instant;
  }
}

// Fetch all movies (for general use)
export async function fetchMovies(): Promise<Movie[]> {
  try {
    const movies = await fetchPopularMovies();
    return movies;
  } catch (error) {
    console.error('Error fetching movies:', error);
    return [];
  }
}

// Filter and shuffle movies (client-side filtering and shuffling)
export function filterMovies(movies: Movie[], preferences: {
  genres: Genre[];
  ottPlatforms: OTTPlatform[];
  languages: Language[];
  adultContent: boolean;
}, seed?: number): Movie[] {
  console.log('Filtering movies:', movies.length, 'movies with preferences:', preferences);
  
  let filtered = movies.filter(movie => {
    // Adult content filter (strict)
    if (!preferences.adultContent && movie.adult) {
      return false;
    }
    
    // Genre filter with AND logic - movie must have ALL selected genres
    if (preferences.genres && preferences.genres.length > 0) {
      const hasAllGenres = preferences.genres.every((selectedGenre) => 
        movie.genres.includes(selectedGenre)
      );
      if (!hasAllGenres) return false;
    }
    
    // OTT platform filter with AND logic - movie must be on ALL selected platforms
    if (preferences.ottPlatforms && preferences.ottPlatforms.length > 0) {
      const hasAllPlatforms = preferences.ottPlatforms.every((selectedPlatform) => 
        movie.ott.includes(selectedPlatform)
      );
      console.log(`OTT filter: ${movie.title} has platforms [${movie.ott.join(', ')}], looking for ALL of [${preferences.ottPlatforms.join(', ')}], match: ${hasAllPlatforms}`);
      if (!hasAllPlatforms) return false;
    }
    
    // Language filter removed
    
    // Year filter - commented out since we're not passing releaseYear in simplified preferences
    // if (preferences.releaseYear) {
    //   ...year filtering logic...
    // }
    
    return true;
  });
  
  console.log('Filtered movies:', filtered.length);


  // Shuffle with seed if provided (for dual mode consistency)
  if (seed !== undefined) {
    const rng = seededRandom(seed);
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }
  } else {
    // Random shuffle for single mode
    filtered = [...filtered].sort(() => Math.random() - 0.5);
  }

  console.log('Final movies to return:', filtered.length);
  return filtered;
}

// Get OTT links
export function getOTTLink(movie: Movie): string {
  // In production, this would map to actual OTT platform URLs
  const ottMap: Record<OTTPlatform, string> = {
    'Netflix': 'https://www.netflix.com',
    'Prime Video': 'https://www.amazon.com/prime',
    'Hotstar': 'https://www.hotstar.com',
    'Disney+': 'https://www.disneyplus.com',
    'HBO Max': 'https://www.hbomax.com',
    'Hulu': 'https://www.hulu.com',
    'Apple TV+': 'https://tv.apple.com',
    'Paramount+': 'https://www.paramountplus.com',
    'Peacock': 'https://www.peacocktv.com'
  };
  
  // Check if movie.ott exists and has at least one element
  if (!movie.ott || movie.ott.length === 0) {
    return '#';
  }
  
  return ottMap[movie.ott[0]] || '#';
}
