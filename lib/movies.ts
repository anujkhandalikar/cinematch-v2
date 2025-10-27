import { Movie, Genre, OTTPlatform } from '@/lib/store';
import { 
  fetchPopularMovies, 
  fetchMoviesByGenre, 
  fetchTrendingMovies,
  fetchMaximumMovies,
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
export async function fetchFilteredMovies(preferences: {
  genres: Genre[];
  ottPlatforms: OTTPlatform[];
  adultContent: boolean;
  releaseYear?: number;
}, onProgress?: (movies: Movie[], isComplete: boolean) => void): Promise<Movie[]> {
  try {
    console.log('Fetching movies from TMDB with preferences:', preferences);
    
    let movies: Movie[] = [];
    
    // If specific genres are selected, fetch movies for those genres
    if (preferences.genres && preferences.genres.length > 0) {
      console.log('Fetching movies by genres:', preferences.genres);
      const genrePromises = preferences.genres.map(async (genreName) => {
        // Find genre ID from our mapping
        const genreId = Object.keys(GENRE_MAP).find(
          id => GENRE_MAP[parseInt(id)] === genreName
        );
        
        if (genreId) {
          console.log(`Fetching movies for genre: ${genreName} (ID: ${genreId})`);
          try {
            return await fetchMoviesByGenre(parseInt(genreId));
          } catch (error) {
            console.error(`Failed to fetch movies for genre ${genreName}:`, error);
            return [];
          }
        }
        return [];
      });
      
      const genreResults = await Promise.all(genrePromises);
      movies = genreResults.flat();
      console.log('Genre-based movies fetched:', movies.length);
      
      // If genre fetching failed completely, fallback to popular movies
      if (movies.length === 0) {
        console.log('Genre fetching failed, falling back to popular movies...');
        movies = await fetchMaximumMovies();
        console.log('Fallback: Maximum movies fetched:', movies.length);
      }
    } else {
      // If no specific genres, fetch maximum movies for better variety
      console.log('Fetching maximum movies from TMDB');
      movies = await fetchMaximumMovies();
      console.log('Maximum movies fetched:', movies.length);
    }
    
    // Fallback: if no movies were fetched, try trending movies
    if (movies.length === 0) {
      console.log('No movies from popular, trying trending movies');
      movies = await fetchTrendingMovies();
      console.log('Trending movies fetched:', movies.length);
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
    
    return uniqueMovies;
  } catch (error) {
    console.error('❌ Error fetching movies from TMDB:', error);
    onProgress?.([], true);
    return [];
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
    
    // Year filter - commented out since we're not passing releaseYear in simplified preferences
    // if (preferences.releaseYear) {
    //   ...year filtering logic...
    // }
    
    return true;
  });
  
  console.log('Filtered movies:', filtered.length);

  // If filtering removed all movies, handle intelligently
  if (filtered.length === 0) {
    console.log('⚠️ No movies after strict AND filtering');
    console.log('⚠️ Trying relaxed filtering (OR logic) as fallback...');
    
    // Try with OR logic as fallback - at least some criteria match
    filtered = movies.filter(movie => {
      // Adult content filter still strict
      if (!preferences.adultContent && movie.adult) {
        return false;
      }
      
      // Genre filter: at least ONE selected genre matches
      if (preferences.genres && preferences.genres.length > 0) {
        const hasAnyGenre = movie.genres.some((genre: Genre) => preferences.genres.includes(genre));
        if (!hasAnyGenre) return false;
      }
      
      // Platform filter: at least ONE selected platform matches
      if (preferences.ottPlatforms && preferences.ottPlatforms.length > 0) {
        const hasAnyPlatform = movie.ott.some((platform: OTTPlatform) => preferences.ottPlatforms.includes(platform));
        if (!hasAnyPlatform) return false;
      }
      
      return true;
    });
    
    if (filtered.length === 0) {
      console.log('⚠️ Still no movies, showing all movies regardless of preferences');
      filtered = [...movies];
    } else {
      console.log(`⚠️ Found ${filtered.length} movies with relaxed filtering`);
    }
  }

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
