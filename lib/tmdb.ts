// TMDB API integration for movie data
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '1e652e44e3d133f83a692081459137a9';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  adult: boolean;
  original_language: string;
  original_title: string;
  popularity: number;
  video: boolean;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

// Genre mapping for better user experience
export const GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
};

// OTT platform mapping (simplified - in production, you'd use a service like JustWatch)
export const OTT_PLATFORMS = [
  'Netflix',
  'Prime Video', 
  'Disney+',
  'HBO Max',
  'Hulu',
  'Apple TV+',
  'Paramount+',
  'Peacock'
];

// Convert TMDB movie to our Movie interface
export function convertTMDBMovie(tmdbMovie: TMDBMovie): any {
  return {
    id: tmdbMovie.id.toString(),
    title: tmdbMovie.title,
    year: new Date(tmdbMovie.release_date).getFullYear(),
    runtime: 0, // TMDB doesn't provide runtime in search results
    rating: tmdbMovie.vote_average,
    genres: tmdbMovie.genre_ids.map(id => GENRE_MAP[id] || 'Drama').filter(genre => genre !== 'Unknown'),
    ott: ['Netflix', 'Prime Video', 'Disney+'], // Default to popular platforms for now
    poster_url: tmdbMovie.poster_path 
      ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
      : 'https://via.placeholder.com/500x750?text=No+Image',
    synopsis: tmdbMovie.overview || 'No description available',
    adult: tmdbMovie.adult
  };
}

// Fetch movies from multiple sources for maximum variety
export async function fetchMaximumMovies(): Promise<any[]> {
  if (!TMDB_API_KEY) {
    console.error('TMDB API key not found');
    return [];
  }

  try {
    console.log('Fetching maximum movies from multiple sources...');
    
    // Use fewer, more reliable endpoints with sequential fetching to avoid rate limits
    const endpoints = [
      // Popular movies (5 pages)
      ...Array.from({length: 5}, (_, i) => `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=${i+1}&language=en-US`),
      // Top rated movies (3 pages)
      ...Array.from({length: 3}, (_, i) => `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&page=${i+1}&language=en-US`),
      // Now playing movies (2 pages)
      ...Array.from({length: 2}, (_, i) => `${TMDB_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&page=${i+1}&language=en-US`)
    ];
    
    console.log(`Fetching from ${endpoints.length} endpoints...`);
    
    // Fetch in smaller batches to avoid rate limiting
    const batchSize = 3;
    const allMovies = [];
    
    for (let i = 0; i < endpoints.length; i += batchSize) {
      const batch = endpoints.slice(i, i + batchSize);
      console.log(`Fetching batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(endpoints.length/batchSize)}`);
      
      try {
        const promises = batch.map(url => fetch(url));
        const responses = await Promise.all(promises);
        
        const dataPromises = responses.map(r => r.json().catch(() => ({ results: [] })));
        const batchData = await Promise.all(dataPromises);
        
        const batchMovies = batchData.flatMap(data => data.results || []);
        allMovies.push(...batchMovies);
        
        console.log(`Batch ${Math.floor(i/batchSize) + 1} fetched ${batchMovies.length} movies`);
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < endpoints.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.warn(`Batch ${Math.floor(i/batchSize) + 1} failed:`, error);
        // Continue with next batch
      }
    }
    
    console.log(`Fetched ${allMovies.length} movies from multiple sources!`);
    
    // Remove duplicates based on movie ID
    const uniqueMovies = allMovies.filter((movie, index, self) => 
      index === self.findIndex(m => m.id === movie.id)
    );
    
    console.log(`After removing duplicates: ${uniqueMovies.length} unique movies`);
    return uniqueMovies.map(convertTMDBMovie);
  } catch (error) {
    console.error('Error fetching maximum movies:', error);
    return [];
  }
}

// Fetch popular movies
export async function fetchPopularMovies(page: number = 1): Promise<any[]> {
  console.log('TMDB_API_KEY:', TMDB_API_KEY ? 'Found' : 'Not found');
  
  if (!TMDB_API_KEY) {
    console.error('TMDB API key not found');
    return [];
  }

  try {
    // Fetch fewer pages to avoid rate limiting
    const pages = [1, 2, 3, 4, 5]; // Fetch first 5 pages (100 movies)
    const allMovies = [];
    
    // Fetch pages sequentially to avoid rate limiting
    for (const pageNum of pages) {
      try {
        const url = `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=${pageNum}&language=en-US`;
        console.log(`Fetching page ${pageNum}...`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          console.warn(`Page ${pageNum} failed with status: ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        const movies = data.results || [];
        allMovies.push(...movies);
        
        console.log(`Page ${pageNum} fetched ${movies.length} movies`);
        
        // Small delay between requests to avoid rate limiting
        if (pageNum < pages.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.warn(`Page ${pageNum} failed:`, error);
        // Continue with next page
      }
    }
    
    console.log('TMDB response:', allMovies.length, 'movies from', pages.length, 'pages');
    return allMovies.map(convertTMDBMovie);
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    return [];
  }
}

// Fetch movies by genre
export async function fetchMoviesByGenre(genreId: number, page: number = 1): Promise<any[]> {
  if (!TMDB_API_KEY) {
    console.error('TMDB API key not found');
    return [];
  }

  try {
    // Fetch multiple pages for genre-based movies too
    const pages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Fetch first 10 pages (200 movies)
    const promises = pages.map(p => {
      const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&page=${p}&language=en-US&sort_by=popularity.desc`;
      console.log('Fetching genre movies from URL:', url);
      return fetch(url);
    });
    
    const responses = await Promise.all(promises);
    
    for (const response of responses) {
      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`);
      }
    }
    
    const dataPromises = responses.map(r => r.json());
    const allData = await Promise.all(dataPromises);
    
    const allMovies = allData.flatMap(data => data.results);
    console.log('Genre movies fetched:', allMovies.length, 'movies');
    return allMovies.map(convertTMDBMovie);
  } catch (error) {
    console.error('Error fetching movies by genre:', error);
    return [];
  }
}

// Search movies
export async function searchMovies(query: string, page: number = 1): Promise<any[]> {
  if (!TMDB_API_KEY) {
    console.error('TMDB API key not found');
    return [];
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}&language=en-US`
    );
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    const data: TMDBResponse<TMDBMovie> = await response.json();
    return data.results.map(convertTMDBMovie);
  } catch (error) {
    console.error('Error searching movies:', error);
    return [];
  }
}

// Fetch trending movies
export async function fetchTrendingMovies(timeWindow: 'day' | 'week' = 'week', page: number = 1): Promise<any[]> {
  if (!TMDB_API_KEY) {
    console.error('TMDB API key not found');
    return [];
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/trending/movie/${timeWindow}?api_key=${TMDB_API_KEY}&page=${page}&language=en-US`
    );
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    const data: TMDBResponse<TMDBMovie> = await response.json();
    return data.results.map(convertTMDBMovie);
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    return [];
  }
}

// Get available genres
export async function fetchGenres(): Promise<TMDBGenre[]> {
  if (!TMDB_API_KEY) {
    console.error('TMDB API key not found');
    return [];
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`
    );
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.genres;
  } catch (error) {
    console.error('Error fetching genres:', error);
    return [];
  }
}
