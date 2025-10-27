// TMDB API integration for movie data
// Using server-side proxy to hide API key from client
const API_BASE_URL = '/api/movies';

// Fetch with timeout helper - aggressive timeout for mobile networks
function fetchWithTimeout(url: string, timeoutMs: number = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  return Promise.race([
    fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeoutId)),
    new Promise<Response>((_, reject) =>
      setTimeout(() => {
        controller.abort();
        reject(new Error(`Fetch timeout after ${timeoutMs}ms`));
      }, timeoutMs)
    )
  ]) as Promise<Response>;
}

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
  runtime?: number;
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

// Assign realistic OTT platforms based on movie characteristics
function assignOTTPlatforms(movie: TMDBMovie): string[] {
  const platforms: string[] = [];
  
  // Base assignment logic - assign platforms based on movie popularity, genre, and year
  const popularity = movie.popularity || 0;
  const year = new Date(movie.release_date).getFullYear();
  const genres = movie.genre_ids.map(id => GENRE_MAP[id]).filter(Boolean);
  
  // Netflix - Popular movies and recent releases
  if (popularity > 50 || year >= 2020) {
    platforms.push('Netflix');
  }
  
  // Prime Video - Broader selection, especially older movies
  if (popularity > 20 || year < 2020) {
    platforms.push('Prime Video');
  }
  
  // Disney+ - Family-friendly content
  if (genres.includes('Family') || genres.includes('Animation') || 
      movie.title.toLowerCase().includes('disney') ||
      movie.title.toLowerCase().includes('marvel') ||
      movie.title.toLowerCase().includes('star wars')) {
    platforms.push('Disney+');
  }
  
  // HBO Max - Premium content and older classics
  if (popularity > 100 || year < 2010 || genres.includes('Drama')) {
    platforms.push('HBO Max');
  }
  
  // Hulu - TV shows and recent releases
  if (year >= 2015) {
    platforms.push('Hulu');
  }
  
  // Apple TV+ - High-quality, recent content
  if (popularity > 80 && year >= 2018) {
    platforms.push('Apple TV+');
  }
  
  // Paramount+ - Paramount movies and classics
  if (movie.title.toLowerCase().includes('paramount') || year < 2015) {
    platforms.push('Paramount+');
  }
  
  // Peacock - Universal content and older movies (more aggressive for testing)
  if (movie.title.toLowerCase().includes('universal') || 
      genres.includes('Comedy') || year < 2010 || 
      Math.random() < 0.4) { // 40% chance for testing
    platforms.push('Peacock');
  }
  
  // Ensure at least one platform
  if (platforms.length === 0) {
    platforms.push('Prime Video'); // Default fallback
  }
  
  // Randomly remove some platforms to make it more realistic
  if (platforms.length > 3) {
    const shuffled = platforms.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.floor(Math.random() * 3) + 1);
  }
  
  console.log(`OTT assignment for ${movie.title}: [${platforms.join(', ')}]`);
  return platforms;
}

// Fetch individual movie details to get runtime
async function fetchMovieDetails(movieId: number): Promise<number> {
  try {
    const endpoint = encodeURIComponent(`/movie/${movieId}?language=en-US`);
    const response = await fetchWithTimeout(`${API_BASE_URL}?endpoint=${endpoint}`, 10000);
    if (!response.ok) {
      console.warn(`Failed to fetch details for movie ${movieId}: ${response.status}`);
      return 0;
    }
    const data = await response.json();
    return data.runtime || 0;
  } catch (error) {
    console.warn(`Error fetching details for movie ${movieId}:`, error);
    return 0;
  }
}

// Convert TMDB movie to our Movie interface (optimized - no runtime fetching)
export function convertTMDBMovie(tmdbMovie: TMDBMovie): any {
  // Estimate runtime based on genre and year for faster loading
  const estimatedRuntime = estimateRuntime(tmdbMovie);
  
  return {
    id: tmdbMovie.id.toString(),
    title: tmdbMovie.title,
    year: new Date(tmdbMovie.release_date).getFullYear(),
    runtime: estimatedRuntime,
    rating: parseFloat(tmdbMovie.vote_average.toFixed(1)),
    genres: tmdbMovie.genre_ids.map(id => GENRE_MAP[id] || 'Drama').filter(genre => genre !== 'Unknown'),
    ott: assignOTTPlatforms(tmdbMovie),
    poster_url: tmdbMovie.poster_path 
      ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
      : 'https://via.placeholder.com/500x750?text=No+Image',
    synopsis: tmdbMovie.overview || 'No description available',
    adult: tmdbMovie.adult
  };
}

// Estimate runtime based on genre and year (much faster than API calls)
function estimateRuntime(tmdbMovie: TMDBMovie): number {
  const year = new Date(tmdbMovie.release_date).getFullYear();
  const genres = tmdbMovie.genre_ids.map(id => GENRE_MAP[id]).filter(Boolean);
  
  // Base runtime by genre
  const genreRuntimes: Record<string, number> = {
    'Action': 120,
    'Adventure': 115,
    'Animation': 95,
    'Comedy': 100,
    'Crime': 110,
    'Documentary': 90,
    'Drama': 105,
    'Family': 100,
    'Fantasy': 115,
    'History': 130,
    'Horror': 95,
    'Music': 110,
    'Mystery': 105,
    'Romance': 100,
    'Sci-Fi': 115,
    'Thriller': 105,
    'War': 125,
    'Western': 110
  };
  
  // Get average runtime for genres
  const avgRuntime = genres.length > 0 
    ? genres.reduce((sum, genre) => sum + (genreRuntimes[genre] || 105), 0) / genres.length
    : 105;
  
  // Adjust for year (older movies tend to be longer)
  const yearAdjustment = year < 1990 ? 10 : year < 2000 ? 5 : 0;
  
  return Math.round(avgRuntime + yearAdjustment);
}

// Batch fetch runtime for multiple movies
async function batchFetchRuntimes(movieIds: number[]): Promise<Map<number, number>> {
  const runtimeMap = new Map<number, number>();
  const batchSize = 10; // Process 10 movies at a time to avoid rate limiting
  
  for (let i = 0; i < movieIds.length; i += batchSize) {
    const batch = movieIds.slice(i, i + batchSize);
    const promises = batch.map(async (movieId) => {
      const runtime = await fetchMovieDetails(movieId);
      return { movieId, runtime };
    });
    
    const results = await Promise.all(promises);
    results.forEach(({ movieId, runtime }) => {
      runtimeMap.set(movieId, runtime);
    });
    
    // Small delay between batches
    if (i + batchSize < movieIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return runtimeMap;
}

// Convert TMDB movie to our Movie interface with runtime
export async function convertTMDBMovieWithRuntime(tmdbMovie: TMDBMovie): Promise<any> {
  console.log(`Converting ${tmdbMovie.title}: runtime=${tmdbMovie.runtime}, vote_average=${tmdbMovie.vote_average}`);
  
  // Fetch runtime from movie details endpoint
  const runtime = await fetchMovieDetails(tmdbMovie.id);
  
  return {
    id: tmdbMovie.id.toString(),
    title: tmdbMovie.title,
    year: new Date(tmdbMovie.release_date).getFullYear(),
    runtime: runtime, // Use actual runtime from movie details endpoint
    rating: parseFloat(tmdbMovie.vote_average.toFixed(1)), // Format to 1 decimal place
    genres: tmdbMovie.genre_ids.map(id => GENRE_MAP[id] || 'Drama').filter(genre => genre !== 'Unknown'),
    ott: assignOTTPlatforms(tmdbMovie), // Assign realistic OTT platforms
    poster_url: tmdbMovie.poster_path 
      ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
      : 'https://via.placeholder.com/500x750?text=No+Image',
    synopsis: tmdbMovie.overview || 'No description available',
    adult: tmdbMovie.adult
  };
}

// Fetch movies from multiple sources for maximum variety
export async function fetchMaximumMovies(): Promise<any[]> {
  try {
    console.log('Fetching maximum movies from multiple sources...');
    
    // Use multiple endpoints with many pages to get 1000+ movies
    // Reduced endpoints for better mobile network performance
    const endpoints = [
      // Popular movies (5 pages = 100 movies)
      ...Array.from({length: 5}, (_, i) => {
        const endpoint = encodeURIComponent(`/movie/popular?page=${i+1}&language=en-US`);
        return `${API_BASE_URL}?endpoint=${endpoint}`;
      }),
      // Top rated movies (3 pages = 60 movies)
      ...Array.from({length: 3}, (_, i) => {
        const endpoint = encodeURIComponent(`/movie/top_rated?page=${i+1}&language=en-US`);
        return `${API_BASE_URL}?endpoint=${endpoint}`;
      })
    ];
    
    console.log(`Fetching from ${endpoints.length} endpoints (reduced for mobile performance)...`);
    
    // Smaller batch size for mobile networks
    const batchSize = 3;
    const allMovies = [];
    
    for (let i = 0; i < endpoints.length; i += batchSize) {
      const batch = endpoints.slice(i, i + batchSize);
      console.log(`Fetching batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(endpoints.length/batchSize)}`);
      
      try {
        // Track page order to ensure deterministic results
        const promises = batch.map((url, urlIndex) => 
          fetchWithTimeout(url, 15000).then(response => ({ response, urlIndex }))
        );
        const responses = await Promise.all(promises);
        
        // Sort responses back to URL order
        responses.sort((a, b) => a.urlIndex - b.urlIndex);
        
        const dataPromises = responses.map(({ response }) => response.json().catch(() => ({ results: [] })));
        const batchData = await Promise.all(dataPromises);
        
        const batchMovies = batchData.flatMap(data => data.results || []);
        allMovies.push(...batchMovies);
        
        console.log(`Batch ${Math.floor(i/batchSize) + 1} fetched ${batchMovies.length} movies`);
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < endpoints.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
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
    
    // Convert movies to optimized format (no runtime fetching)
    const movies = uniqueMovies.map(convertTMDBMovie);
    
    console.log(`Movies converted: ${movies.length}`);
    return movies;
  } catch (error) {
    console.error('Error fetching maximum movies:', error);
    return [];
  }
}

// Fetch popular movies
export async function fetchPopularMovies(page: number = 1): Promise<any[]> {
  try {
    // Fetch more pages to get 1000+ movies
    // Fetch fewer pages for better performance (especially on mobile)
    // Reduced from 50 to 10 pages for faster loading
    const pages = Array.from({length: 10}, (_, i) => i + 1); // Fetch first 10 pages (200 movies)
    const allMovies = [];
    
    // Fetch pages sequentially to avoid rate limiting
    for (const pageNum of pages) {
      try {
        const endpoint = encodeURIComponent(`/movie/popular?page=${pageNum}&language=en-US`);
        const url = `${API_BASE_URL}?endpoint=${endpoint}`;
        console.log(`Fetching page ${pageNum}...`);
        
        const response = await fetchWithTimeout(url, 15000);
        
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
  try {
    // Reduced to 2 pages per genre to avoid 500 errors
    const pages = [1, 2]; // Fetch first 2 pages (40 movies per genre)
    const promises = pages.map((p, index) => {
      const endpoint = encodeURIComponent(`/discover/movie?with_genres=${genreId}&page=${p}&language=en-US&sort_by=popularity.desc`);
      const url = `${API_BASE_URL}?endpoint=${endpoint}`;
      // Return both the fetch promise and the page number to maintain order
      return fetchWithTimeout(url, 10000).then(
        response => ({ response, pageIndex: index }),
        error => {
          console.warn(`Page ${p} failed for genre ${genreId}:`, error);
          return { response: null, pageIndex: index };
        }
      );
    });
    
    const responses = await Promise.all(promises);
    
    // Filter out failed responses
    const successfulResponses = responses.filter(({ response }) => response && response.ok);
    
    if (successfulResponses.length === 0) {
      console.warn(`All pages failed for genre ${genreId}, returning empty array`);
      return [];
    }
    
    console.log(`Successfully fetched ${successfulResponses.length} pages for genre ${genreId}`);
    
    // Process only successful responses
    const dataPromises = successfulResponses.map(({ response }) => response.json());
    const allData = await Promise.all(dataPromises);
    
    const allMovies = allData.flatMap(data => data.results || []);
    console.log(`Genre ${genreId} movies fetched: ${allMovies.length} movies`);
    return allMovies.map(convertTMDBMovie);
  } catch (error) {
    console.error('Error fetching movies by genre:', error);
    return [];
  }
}

// Search movies
export async function searchMovies(query: string, page: number = 1): Promise<any[]> {
  try {
    const endpoint = encodeURIComponent(`/search/movie?query=${encodeURIComponent(query)}&page=${page}&language=en-US`);
    const response = await fetchWithTimeout(`${API_BASE_URL}?endpoint=${endpoint}`, 15000);
    
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
  try {
    const endpoint = encodeURIComponent(`/trending/movie/${timeWindow}?page=${page}&language=en-US`);
    const response = await fetchWithTimeout(`${API_BASE_URL}?endpoint=${endpoint}`, 15000);
    
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
  try {
    const endpoint = encodeURIComponent(`/genre/movie/list?language=en-US`);
    const response = await fetchWithTimeout(`${API_BASE_URL}?endpoint=${endpoint}`, 10000);
    
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
