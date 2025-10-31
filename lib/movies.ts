import type { Movie, Genre, OTTPlatform, Language } from '@/lib/store';
import { 
  fetchPopularMovies, 
  fetchMoviesByGenre, 
  fetchTrendingMovies,
  fetchMaximumMovies,
  fetchHindiMovies,
  // convertLanguagesToTMDB,
  convertTMDBToLanguages,
  GENRE_MAP
} from './tmdb';
import { loadMoviesProgressively, getCachedMovies } from './movieCache';
import { streamDiscoverAll, streamLanguageAll, fetchLanguageSeed } from './ingestion';

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
  highRatedOnly?: boolean;
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
    // Kick off background ingestion: if user selected languages, seed by language; else global discover
    console.log('Starting progressive ingestion from TMDB discover (background)...');
    try {
      if (preferences.languages && preferences.languages.length > 0) {
        // Fast seed: fetch first pages for each selected language immediately
        try {
          const languageCodes: Record<string,string> = { English: 'en', Hindi: 'hi', Tamil: 'ta', Telugu: 'te', Malayalam: 'ml', Bengali: 'bn' };
          const seeds = await Promise.all(
            preferences.languages
              .map(l => languageCodes[l as any])
              .filter(Boolean)
              .map(code => fetchLanguageSeed(code as string, 6, !!preferences.adultContent))
          );
          const seedMovies = seeds.flat();
          if (seedMovies.length > 0) {
            movies = [...movies, ...seedMovies];
            onProgress?.(movies, false);
          }
        } catch {}
        const languageCodes: Record<string,string> = { English: 'en', Hindi: 'hi', Tamil: 'ta', Telugu: 'te', Malayalam: 'ml', Bengali: 'bn' };
        // Accumulate all language movies and deduplicate
        let allLanguageMovies: Movie[] = [];
        const languagePromises = preferences.languages.map((lang) => {
          const code = languageCodes[lang as any];
          if (!code) return Promise.resolve();
          return streamLanguageAll(code, { adult: !!preferences.adultContent }, (chunk, isComplete) => {
            if (chunk.length) {
              allLanguageMovies = [...allLanguageMovies, ...chunk];
              // Deduplicate
              const unique = allLanguageMovies.filter((movie, index, self) => 
                index === self.findIndex(m => m.id === movie.id)
              );
              onProgress?.(unique, isComplete);
            }
          });
        });
        await Promise.all(languagePromises);
      } else {
        let allDiscoverMovies: Movie[] = [];
        await streamDiscoverAll({ language: 'en-US', adult: !!preferences.adultContent }, (chunk, isComplete) => {
          if (chunk.length) {
            allDiscoverMovies = [...allDiscoverMovies, ...chunk];
            // Deduplicate
            const unique = allDiscoverMovies.filter((movie, index, self) => 
              index === self.findIndex(m => m.id === movie.id)
            );
            onProgress?.(unique, isComplete);
          }
        });
      }
    } catch (e) {
      console.warn('Failed to start background ingestion:', e);
    }

    // Return a fast first batch immediately using trending + popular
    let trending: Movie[] = [];
    let popular: Movie[] = [];
    try { trending = await fetchTrendingMovies('week', 1); } catch {}
    try { popular = await fetchPopularMovies(1, ['en-US']); } catch {}
    movies = [...trending, ...popular].slice(0, 200);
    
    // If user picked specific genres and our fast path didn't yield enough,
    // fetch by those genres directly from TMDB and intersect (AND logic)
    if (preferences.genres && preferences.genres.length > 0) {
      try {
        // Use TMDB discover with multi-genre to improve recall
        const ids = preferences.genres
          .map(g => Object.keys(GENRE_MAP).find(id => GENRE_MAP[parseInt(id)] === g))
          .filter(Boolean)
          .map(x => parseInt(x as string));
        if (ids.length > 0) {
          const { fetchMoviesByGenresAND } = await import('./tmdb');
          const andMovies = await fetchMoviesByGenresAND(ids, 6, 'en-US');
          if (andMovies.length > 0) {
            console.log(`Genre AND discover produced ${andMovies.length} movies`);
            movies = [...movies, ...andMovies];
          }
        }
      } catch (e) {
        console.warn('Genre AND fallback failed:', e);
      }
    }

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
    // High rated only - strict: rating must exist and be >= 8.0
    if (preferences.highRatedOnly) {
      movies = movies.filter(movie => movie.rating && movie.rating >= 8.0);
    }
    
    // Release year filtering (supports preset buckets) - strict
    const matchesRelease = (year: number, filter: number | '2025' | '2000s' | 'older' | null | undefined) => {
      if (filter === null || filter === undefined) return true;
      if (typeof filter === 'number') return year >= filter;
      if (filter === '2025') return year >= 2024; // 2024 or later for "2025" selection
      if (filter === '2000s') return year >= 2000 && year < 2010; // Strictly 2000-2009
      if (filter === 'older') return year < 2000; // Strictly before 2000
      return true;
    };
    if (preferences.releaseYear !== undefined && preferences.releaseYear !== null) {
      movies = movies.filter(movie => matchesRelease(movie.year, preferences.releaseYear as any));
      console.log(`Filtered by release ${preferences.releaseYear}: ${movies.length} movies`);
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
  releaseYear?: number | '2025' | '2000s' | 'older' | null;
  highRatedOnly?: boolean;
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
    
    // High rated only filter - strict: rating must exist and be >= 8.0
    if (preferences.highRatedOnly) {
      if (!movie.rating || movie.rating < 8.0) return false;
    }

    // Release year filter - strict
    const matchesRelease = (year: number, filter: number | '2025' | '2000s' | 'older' | null | undefined) => {
      if (filter === null || filter === undefined) return true;
      if (typeof filter === 'number') return year >= filter;
      if (filter === '2025') return year >= 2024; // 2024 or later for "2025" selection
      if (filter === '2000s') return year >= 2000 && year < 2010; // Strictly 2000-2009
      if (filter === 'older') return year < 2000; // Strictly before 2000
      return true;
    };
    if (!matchesRelease(movie.year, preferences.releaseYear)) return false;

    // Language filter (OR across selected languages)
    if (preferences.languages && preferences.languages.length > 0) {
      const movieLanguage = convertTMDBToLanguages(movie.original_language || 'en');
      const hasMatchingLanguage = preferences.languages.includes(movieLanguage as Language);
      if (!hasMatchingLanguage) return false;
    }
    
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
