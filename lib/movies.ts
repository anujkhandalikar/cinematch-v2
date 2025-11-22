import type { Movie, Genre, OTTPlatform, Language, MoodPreset } from '@/lib/store';
import { 
  fetchPopularMovies, 
  fetchMoviesByGenre, 
  fetchTrendingMovies,
  fetchMaximumMovies,
  fetchHindiMovies,
  fetchTopRatedMovies,
  convertLanguagesToTMDB,
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

const INDIAN_LANGUAGE_CODES = new Set(['hi', 'ta', 'te', 'ml', 'bn', 'mr', 'kn', 'gu', 'pa']);

function interleaveIndianAndGlobal(indian: Movie[], global: Movie[]): Movie[] {
  const seen = new Set<string>();
  const take = (list: Movie[], index: number) => {
    const movie = list[index];
    if (!movie) return null;
    if (seen.has(movie.id)) return null;
    seen.add(movie.id);
    return movie;
  };

  const maxLength = Math.max(indian.length, global.length);
  const output: Movie[] = [];

  for (let i = 0; i < maxLength; i++) {
    const indianPick = take(indian, i);
    if (indianPick) output.push(indianPick);

    const globalPick = take(global, i);
    if (globalPick) output.push(globalPick);
  }

  return output;
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
  releaseYear?: number | '2025' | '2000s' | 'older' | null;
  highRatedOnly?: boolean;
  imdbTop250Movies?: boolean;
  releaseAfterMonths?: number | null;
  moodIncludeGenres?: Genre[];
  moodExcludeGenres?: Genre[];
  moodPreset?: MoodPreset | null;
}, onProgress?: (movies: Movie[], isComplete: boolean) => void): Promise<Movie[]> {
  try {
    console.log('Fetching movies from TMDB with preferences:', preferences);
    
    // Check if IMDb Top 250 filter is selected
    if (preferences.imdbTop250Movies) {
      console.log('🎬 Critically acclaimed mode selected — using TMDB top rated feed');

      const tmdbLanguages = preferences.languages && preferences.languages.length > 0
        ? convertLanguagesToTMDB(preferences.languages)
        : ['en-US'];

      const topRatedMovies = await fetchTopRatedMovies(5, tmdbLanguages);
      console.log(`📊 Top rated movies fetched: ${topRatedMovies.length}`);

      if (topRatedMovies.length === 0) {
        console.warn('⚠️ TMDB top rated endpoint returned no movies');
        onProgress?.([], true);
        return [];
      }

      const filteredTopRated = filterMovies(topRatedMovies, {
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

      const finalTopRated = [...(filteredTopRated.length > 0 ? filteredTopRated : topRatedMovies)];
      finalTopRated.sort((a, b) => (b.rating || 0) - (a.rating || 0));

      onProgress?.(finalTopRated, false);
      onProgress?.(finalTopRated, true);
      return finalTopRated;
    }
    
    // CRITICAL: Skip instant cache if ANY filters are selected
    // Only show movies that match ALL selected filters (languages, genres, OTT, etc.)
    const hasAnyFilters = (preferences.languages?.length ?? 0) > 0 ||
                         (preferences.genres?.length ?? 0) > 0 ||
                         (preferences.ottPlatforms?.length ?? 0) > 0 ||
                         (preferences.moodIncludeGenres?.length ?? 0) > 0 ||
                         (preferences.moodExcludeGenres?.length ?? 0) > 0 ||
                         !!preferences.releaseAfterMonths ||
                         preferences.highRatedOnly ||
                         preferences.imdbTop250Movies ||
                         (preferences.releaseYear !== undefined && preferences.releaseYear !== null);
    
    let instant: Movie[] = [];
    if (!hasAnyFilters) {
      // Only load instant cache if NO filters are selected
      instant = getCachedMovies({
        genres: preferences.genres,
        ottPlatforms: preferences.ottPlatforms,
        adultContent: preferences.adultContent,
        releaseYear: preferences.releaseYear,
        highRatedOnly: preferences.highRatedOnly,
        releaseAfterMonths: preferences.releaseAfterMonths,
        moodIncludeGenres: preferences.moodIncludeGenres,
        moodExcludeGenres: preferences.moodExcludeGenres,
      });
      if (instant.length > 0) {
        console.log('⚡ No filters selected - showing instant cache');
        onProgress?.(instant, false);
      }
    } else {
      console.log('⚠️ Filters selected - skipping instant cache in fetchFilteredMovies');
    }
    // Language filtering disabled
    const languagesToUse: Language[] = [];

    let movies: Movie[] = [];
    // Fast initial seed: fetch first 3 pages for instant load (<400ms)
    try {
      if (preferences.languages && preferences.languages.length > 0) {
        const languageCodes: Record<string,string> = { English: 'en', Hindi: 'hi', Tamil: 'ta', Telugu: 'te', Malayalam: 'ml', Bengali: 'bn' };
        const seeds = await Promise.all(
          preferences.languages
            .map(l => languageCodes[l as any])
            .filter(Boolean)
            .map(code => fetchLanguageSeed(code as string, 3, !!preferences.adultContent)) // Just 3 pages for speed
        );
        const seedMovies = seeds.flat();
        if (seedMovies.length > 0) {
          movies = [...movies, ...seedMovies];
          onProgress?.(movies, false); // Show immediately
        }
      }
    } catch (e) {
      console.warn('Fast seed failed:', e);
    }

    // Background streaming (non-blocking) - continues fetching more pages
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => {
      try {
        if (preferences.languages && preferences.languages.length > 0) {
          const languageCodes: Record<string,string> = { English: 'en', Hindi: 'hi', Tamil: 'ta', Telugu: 'te', Malayalam: 'ml', Bengali: 'bn' };
          let allLanguageMovies: Movie[] = [...movies];
          const languagePromises = preferences.languages.map((lang) => {
            const code = languageCodes[lang as any];
            if (!code) return Promise.resolve();
            return streamLanguageAll(code, { adult: !!preferences.adultContent }, (chunk, isComplete) => {
              if (chunk.length) {
                allLanguageMovies = [...allLanguageMovies, ...chunk];
                const unique = allLanguageMovies.filter((movie, index, self) => 
                  index === self.findIndex(m => m.id === movie.id)
                );
                onProgress?.(unique, isComplete);
              }
            });
          });
          await Promise.all(languagePromises);
        } else {
          let allDiscoverMovies: Movie[] = [...movies];
          await streamDiscoverAll({ language: 'en-US', adult: !!preferences.adultContent }, (chunk, isComplete) => {
            if (chunk.length) {
              allDiscoverMovies = [...allDiscoverMovies, ...chunk];
              const unique = allDiscoverMovies.filter((movie, index, self) => 
                index === self.findIndex(m => m.id === movie.id)
              );
              onProgress?.(unique, isComplete);
            }
          });
        }
      } catch (e) {
        console.warn('Background ingestion failed:', e);
      }
    })();

    // Return a fast first batch immediately using trending + popular
    let trending: Movie[] = [];
    let popular: Movie[] = [];
    try { trending = await fetchTrendingMovies('week', 1); } catch {}
    try { popular = await fetchPopularMovies(1, ['en-US']); } catch {}
    movies = [...trending, ...popular].slice(0, 200);

    if (preferences.moodPreset === 'NewPopular') {
      const indianLangs = ['hi', 'ta', 'te', 'ml', 'bn'];
      let indianSeed: Movie[] = [];

      try {
        const indianResponses = await Promise.all(
          indianLangs.map(code => fetchLanguageSeed(code, 3, !!preferences.adultContent))
        );
        indianSeed = indianResponses.flat();
      } catch (error) {
        console.warn('Failed to fetch Indian new/popular seed set:', error);
      }

      const isIndianMovie = (movie: Movie) =>
        INDIAN_LANGUAGE_CODES.has((movie.original_language || '').toLowerCase());

      const existingIndian = movies.filter(isIndianMovie);
      const existingGlobal = movies.filter(movie => !isIndianMovie(movie));

      const combinedIndian = [...indianSeed, ...existingIndian];
      const combinedGlobal = existingGlobal;

      if (combinedIndian.length && combinedGlobal.length) {
        movies = interleaveIndianAndGlobal(combinedIndian, combinedGlobal);
      } else if (combinedIndian.length) {
        movies = interleaveIndianAndGlobal(combinedIndian, []);
      }
    }
    
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

    // Mood-specific include/exclude filters
    if (preferences.moodIncludeGenres && preferences.moodIncludeGenres.length > 0) {
      movies = movies.filter(movie =>
        preferences.moodIncludeGenres!.some((genre) => movie.genres.includes(genre))
      );
      console.log(`Filtered by mood include genres (${preferences.moodIncludeGenres.length}): ${movies.length} movies`);
    }
    if (preferences.moodExcludeGenres && preferences.moodExcludeGenres.length > 0) {
      movies = movies.filter(movie =>
        !preferences.moodExcludeGenres!.some((genre) => movie.genres.includes(genre))
      );
      console.log(`Filtered by mood exclude genres (${preferences.moodExcludeGenres.length}): ${movies.length} movies`);
    }

    if (preferences.moodPreset === 'Bollywood') {
      movies = movies.filter(movie => movie.year >= 2000 && movie.year <= 2025);
      console.log(`Filtered Bollywood mood range (2000-2025): ${movies.length} movies`);
    }

    // High rated only - strict: rating must exist and be >= 8.0
    if (preferences.highRatedOnly) {
      movies = movies.filter(movie => movie.rating && movie.rating >= 8.0);
    }
    
    // Release year filtering (supports preset buckets) - strict
    const matchesRelease = (year: number, filter: number | '2025' | '2000s' | 'older' | null | undefined) => {
      if (filter === null || filter === undefined) return true;
      if (typeof filter === 'number') return year >= filter;
      if (filter === '2025') return year === 2025; // Strictly 2025 only
      if (filter === '2000s') return year >= 2000 && year <= 2024; // 2000 to 2024 inclusive
      if (filter === 'older') return year < 2000; // Strictly before 2000
      return true;
    };
    if (preferences.releaseYear !== undefined && preferences.releaseYear !== null) {
      movies = movies.filter(movie => matchesRelease(movie.year, preferences.releaseYear as any));
      console.log(`Filtered by release ${preferences.releaseYear}: ${movies.length} movies`);
    }

    if (preferences.releaseAfterMonths && preferences.releaseAfterMonths > 0) {
      const beforeRecencyFilter = movies;
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - preferences.releaseAfterMonths);
      const cutoffYear = cutoff.getFullYear();
      const recencyFiltered = movies.filter(movie => movie.year >= cutoffYear);
      if (recencyFiltered.length > 0) {
        movies = recencyFiltered;
        console.log(`Filtered by recency (${preferences.releaseAfterMonths} months): ${movies.length} movies`);
      } else {
        console.warn(`⚠️ Recency filter (${preferences.releaseAfterMonths} months) removed all movies. Keeping pre-recency results.`);
        movies = beforeRecencyFilter;
      }
    }
    
    // Remove duplicates based on movie ID
    const deduped: Movie[] = [];
    const seen = new Set<string>();
    for (const movie of movies) {
      if (!seen.has(movie.id)) {
        seen.add(movie.id);
        deduped.push(movie);
      }
    }

    if (preferences.moodPreset !== 'NewPopular') {
      deduped.sort((a, b) => a.id.localeCompare(b.id));
    }

    console.log(`✅ Final unique movies: ${deduped.length}`);
    onProgress?.(deduped, true);
    
    return deduped.length > 0 ? deduped : instant;
  } catch (error) {
    console.error('❌ Error fetching movies from TMDB:', error);
    const instant = getCachedMovies({
      genres: preferences.genres,
      ottPlatforms: preferences.ottPlatforms,
      adultContent: preferences.adultContent,
      releaseYear: preferences.releaseYear,
      highRatedOnly: preferences.highRatedOnly,
      releaseAfterMonths: preferences.releaseAfterMonths,
      moodIncludeGenres: preferences.moodIncludeGenres,
      moodExcludeGenres: preferences.moodExcludeGenres,
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
  releaseAfterMonths?: number | null;
  moodIncludeGenres?: Genre[];
  moodExcludeGenres?: Genre[];
  moodPreset?: MoodPreset | null;
}, seed?: number): Movie[] {
  console.log('Filtering movies:', movies.length, 'movies with preferences:', preferences);
  
  let filtered = movies.filter(movie => {
    // Adult content filter (strict)
    if (!preferences.adultContent && movie.adult) {
      return false;
    }
    
    if (preferences.moodIncludeGenres && preferences.moodIncludeGenres.length > 0) {
      const hasMoodGenre = preferences.moodIncludeGenres.some((genre) => movie.genres.includes(genre));
      if (!hasMoodGenre) return false;
    }

    if (preferences.moodExcludeGenres && preferences.moodExcludeGenres.length > 0) {
      const hasExcluded = preferences.moodExcludeGenres.some((genre) => movie.genres.includes(genre));
      if (hasExcluded) return false;
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
      if (filter === '2025') return year === 2025; // Strictly 2025 only
      if (filter === '2000s') return year >= 2000 && year <= 2024; // 2000 to 2024 inclusive
      if (filter === 'older') return year < 2000; // Strictly before 2000
      return true;
    };
    if (!matchesRelease(movie.year, preferences.releaseYear)) return false;

    if (preferences.releaseAfterMonths && preferences.releaseAfterMonths > 0) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - preferences.releaseAfterMonths);
      const cutoffYear = cutoff.getFullYear();
      if (movie.year < cutoffYear) return false;
    }

    // Language filter (OR across selected languages)
    // CRITICAL: Always apply language filter to ensure movies match selected languages
    // Even if streaming API filters by language, we should double-check for safety
    if (preferences.languages && preferences.languages.length > 0) {
      const movieLanguage = convertTMDBToLanguages(movie.original_language || 'en');
      const hasMatchingLanguage = preferences.languages.includes(movieLanguage as Language);
      if (!hasMatchingLanguage) {
        console.log(`🚫 Filtered out ${movie.title} - language ${movieLanguage} not in selected languages: ${preferences.languages.join(', ')}`);
        return false;
      }
    }
    
    // Year filter - commented out since we're not passing releaseYear in simplified preferences
    // if (preferences.releaseYear) {
    //   ...year filtering logic...
    // }
    
    return true;
  });
  
  console.log('Filtered movies:', filtered.length);

  // IMPORTANT: Sort by ID first to ensure deterministic input order before shuffling
  // This ensures both users get the same order even if movies arrive in different sequences
  filtered.sort((a, b) => a.id.localeCompare(b.id));

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
