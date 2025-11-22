// TMDB API integration for movie data
// All outbound calls go through our server proxy at /api/movies to
// keep credentials out of the client and centralize error handling.
const API_BASE_URL = '/api/movies';

// Fetch with timeout helper — keeps UI responsive on slow networks
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

// Genre mapping for better user experience (TMDB id -> friendly name)
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

// Language mapping for TMDB API
export const LANGUAGE_MAP: Record<string, string> = {
  'English': 'en-US',
  'Hindi': 'hi-IN',
  'Spanish': 'es-ES',
  'French': 'fr-FR',
  'German': 'de-DE',
  'Italian': 'it-IT',
  'Portuguese': 'pt-PT',
  'Russian': 'ru-RU',
  'Chinese': 'zh-CN',
  'Japanese': 'ja-JP',
  'Korean': 'ko-KR',
  'Arabic': 'ar-SA',
  'Turkish': 'tr-TR',
  'Dutch': 'nl-NL',
  'Swedish': 'sv-SE',
  'Norwegian': 'no-NO',
  'Danish': 'da-DK',
  'Finnish': 'fi-FI',
  'Polish': 'pl-PL',
  'Czech': 'cs-CZ',
  'Hungarian': 'hu-HU',
  'Romanian': 'ro-RO',
  'Bulgarian': 'bg-BG',
  'Croatian': 'hr-HR',
  'Serbian': 'sr-RS',
  'Slovak': 'sk-SK',
  'Slovenian': 'sl-SI',
  'Greek': 'el-GR',
  'Hebrew': 'he-IL',
  'Thai': 'th-TH',
  'Vietnamese': 'vi-VN',
  'Indonesian': 'id-ID',
  'Malay': 'ms-MY',
  'Filipino': 'tl-PH',
  'Bengali': 'bn-BD',
  'Tamil': 'ta-IN',
  'Telugu': 'te-IN',
  'Marathi': 'mr-IN',
  'Gujarati': 'gu-IN',
  'Punjabi': 'pa-IN',
  'Urdu': 'ur-PK'
};

// Convert Language array to TMDB language codes
export function convertLanguagesToTMDB(languages: string[]): string[] {
  // Handle undefined/null languages array
  if (!languages || !Array.isArray(languages) || languages.length === 0) {
    return ['en-US']; // Default to English if no languages selected
  }
  
  const tmdbLanguages = languages.map(lang => LANGUAGE_MAP[lang] || 'en-US');
  // Remove duplicates and ensure we have at least English as fallback
  const uniqueLanguages = [...new Set(tmdbLanguages)];
  return uniqueLanguages.length > 0 ? uniqueLanguages : ['en-US'];
}

// Convert TMDB language codes back to our Language types
export function convertTMDBToLanguages(tmdbLanguage: string): string {
  const reverseMap: Record<string, string> = {};
  Object.entries(LANGUAGE_MAP).forEach(([lang, code]) => {
    reverseMap[code] = lang;
  });
  
  // Handle common TMDB language codes that might not be in our map
  const commonMappings: Record<string, string> = {
    'hi': 'Hindi',
    'en': 'English', 
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ar': 'Arabic',
    'tr': 'Turkish',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'no': 'Norwegian',
    'da': 'Danish',
    'fi': 'Finnish',
    'pl': 'Polish',
    'cs': 'Czech',
    'hu': 'Hungarian',
    'ro': 'Romanian',
    'bg': 'Bulgarian',
    'hr': 'Croatian',
    'sr': 'Serbian',
    'sk': 'Slovak',
    'sl': 'Slovenian',
    'el': 'Greek',
    'he': 'Hebrew',
    'th': 'Thai',
    'vi': 'Vietnamese',
    'id': 'Indonesian',
    'ms': 'Malay',
    'tl': 'Filipino',
    'bn': 'Bengali',
    'ta': 'Tamil',
    'te': 'Telugu',
    'mr': 'Marathi',
    'gu': 'Gujarati',
    'pa': 'Punjabi',
    'ur': 'Urdu',
    'kn': 'Kannada',
    'ml': 'Malayalam'
  };
  
  // Try exact match first, then try common mappings
  return reverseMap[tmdbLanguage] || commonMappings[tmdbLanguage] || 'English';
}

// Map TMDB provider IDs to our OTTPlatform types
const TMDB_PROVIDER_MAP: Record<number, string> = {
  8: 'Netflix',
  9: 'Prime Video',
  337: 'Disney+',
  384: 'HBO Max',
  15: 'Hulu',
  350: 'Apple TV+',
  531: 'Paramount+',
  386: 'Peacock',
};

// Fetch watch providers for a movie (batch-friendly)
async function fetchWatchProviders(movieId: number): Promise<string[]> {
  try {
    const endpoint = encodeURIComponent(`/movie/${movieId}/watch/providers`);
    const response = await fetchWithTimeout(`${API_BASE_URL}?endpoint=${endpoint}`, 5000);
    if (!response.ok) return [];
    const data = await response.json();
    const flatrate = data.results?.US?.flatrate || data.results?.IN?.flatrate || [];
    return flatrate
      .map((p: { provider_id: number }) => TMDB_PROVIDER_MAP[p.provider_id])
      .filter(Boolean);
  } catch {
    return [];
  }
}

// Assign realistic OTT platforms based on movie characteristics
// Improved heuristic with better Hindi/Netflix coverage
// Handles both list view (genre_ids) and detail view (genres array) responses
function assignOTTPlatforms(movie: any): string[] {
  const platforms: string[] = [];
  const popularity = movie.popularity || 0;
  const year = new Date(movie.release_date).getFullYear();
  // Handle both genre formats
  const genreIds = movie.genre_ids || (movie.genres ? movie.genres.map((g: any) => g.id) : []);
  const genres = genreIds.map((id: number) => GENRE_MAP[id]).filter(Boolean);
  const isHindi = movie.original_language === 'hi';
  
  // Netflix - Popular movies, recent releases, and Hindi content (Netflix has strong Hindi library)
  // Lower threshold for Hindi to show more Netflix content
  if (popularity > 25 || year >= 2020 || (isHindi && popularity > 5)) {
    platforms.push('Netflix');
  }
  
  // Prime Video - Broader selection, especially older movies and Hindi
  // Hindi content is very common on Prime Video
  if (popularity > 10 || year < 2020 || isHindi) {
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
  
  // For Hindi movies, keep Netflix and Prime Video more often
  if (isHindi && platforms.length >= 2) {
    // Don't randomly remove if we have Netflix or Prime Video
    if (platforms.includes('Netflix') || platforms.includes('Prime Video')) {
      return platforms;
    }
  }
  
  // Randomly remove some platforms to make it more realistic (but keep at least 1)
  if (platforms.length > 3) {
    const shuffled = platforms.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.floor(Math.random() * 3) + 1);
  }
  
  return platforms;
}

// Fetch individual movie details to get runtime
// (Used by the slower path; the fast path estimates runtime.)
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
// Handles both list view (genre_ids) and detail view (genres array) responses
export function convertTMDBMovie(tmdbMovie: any): any {
  // Handle both genre formats: genre_ids (array of numbers) or genres (array of objects)
  let genreIds: number[] = [];
  if (tmdbMovie.genre_ids && Array.isArray(tmdbMovie.genre_ids)) {
    genreIds = tmdbMovie.genre_ids;
  } else if (tmdbMovie.genres && Array.isArray(tmdbMovie.genres)) {
    genreIds = tmdbMovie.genres.map((g: any) => g.id).filter(Boolean);
  }
  
  // Estimate runtime based on genre and year for faster loading
  const estimatedRuntime = estimateRuntime({
    ...tmdbMovie,
    genre_ids: genreIds,
    release_date: tmdbMovie.release_date || '2000-01-01'
  });
  
  // Extract genre names
  const genreNames = genreIds.map(id => GENRE_MAP[id] || 'Drama').filter(genre => genre !== 'Unknown');
  // If we have genres objects, use those names directly (more accurate)
  const finalGenres = tmdbMovie.genres && Array.isArray(tmdbMovie.genres) && tmdbMovie.genres.length > 0
    ? tmdbMovie.genres.map((g: any) => g.name).filter(Boolean)
    : genreNames;
  
  return {
    id: tmdbMovie.id.toString(),
    title: tmdbMovie.title,
    year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : 2000,
    runtime: tmdbMovie.runtime || estimatedRuntime,
    rating: tmdbMovie.vote_average ? parseFloat(tmdbMovie.vote_average.toFixed(1)) : 0,
    genres: finalGenres.length > 0 ? finalGenres : ['Drama'],
    ott: assignOTTPlatforms({
      ...tmdbMovie,
      genre_ids: genreIds
    }),
    poster_url: tmdbMovie.poster_path 
      ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
      : 'https://via.placeholder.com/500x750?text=No+Image',
    synopsis: tmdbMovie.overview || 'No description available',
    adult: tmdbMovie.adult || false,
    original_language: tmdbMovie.original_language || 'en'
  };
}

// Estimate runtime based on genre and year (much faster than API calls)
function estimateRuntime(tmdbMovie: { genre_ids?: number[]; release_date?: string }): number {
  if (!tmdbMovie.release_date) return 105; // Default runtime
  const year = new Date(tmdbMovie.release_date).getFullYear();
  const genreIds = tmdbMovie.genre_ids || [];
  const genres = genreIds.map(id => GENRE_MAP[id]).filter(Boolean);
  
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

// Fetch Hindi movies specifically using discover endpoint
export async function fetchHindiMovies(): Promise<any[]> {
  try {
    console.log('Fetching Hindi movies using discover endpoint...');
    
    const endpoints: string[] = [];
    
    // Discover Hindi movies by different criteria
    const discoverQueries = [
      'primary_release_date.gte=2020-01-01&primary_release_date.lte=2024-12-31', // Recent
      'primary_release_date.gte=2015-01-01&primary_release_date.lte=2019-12-31', // Mid-2010s
      'primary_release_date.gte=2010-01-01&primary_release_date.lte=2014-12-31', // Early 2010s
      'primary_release_date.gte=2005-01-01&primary_release_date.lte=2009-12-31', // Late 2000s
      'vote_count.gte=100&sort_by=vote_average.desc', // Highly rated
      'sort_by=popularity.desc', // Most popular
    ];
    
    discoverQueries.forEach(query => {
      endpoints.push(...Array.from({length: 3}, (_, i) => {
        const endpoint = encodeURIComponent(`/discover/movie?page=${i+1}&language=hi-IN&${query}`);
        return `${API_BASE_URL}?endpoint=${endpoint}`;
      }));
    });
    
    console.log(`Fetching Hindi movies from ${endpoints.length} discover endpoints...`);
    
    const batchSize = 2;
    const allMovies = [];
    
    for (let i = 0; i < endpoints.length; i += batchSize) {
      const batch = endpoints.slice(i, i + batchSize);
      console.log(`Fetching Hindi batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(endpoints.length/batchSize)}`);
      
      try {
        const promises = batch.map(async (url) => {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              console.warn(`Hindi endpoint failed with status ${response.status}: ${url}`);
              return []; // Return empty array instead of throwing
            }
            const data = await response.json();
            return data.results || [];
          } catch (error) {
            console.warn(`Hindi endpoint network error: ${url}`, error);
            return []; // Return empty array instead of throwing
          }
        });
        
        const batchResults = await Promise.all(promises);
        const batchMovies = batchResults.flat();
        allMovies.push(...batchMovies);
        
        console.log(`Hindi batch ${Math.floor(i/batchSize) + 1} completed: ${batchMovies.length} movies`);
        
        // Delay between batches
        if (i + batchSize < endpoints.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error in Hindi batch ${Math.floor(i/batchSize) + 1}:`, error);
        // Continue with next batch
      }
    }
    
    console.log(`Total Hindi movies fetched: ${allMovies.length}`);
    return allMovies;
  } catch (error) {
    console.error('Error fetching Hindi movies:', error);
    return [];
  }
}

// Fetch movies from multiple sources for maximum variety
// We combine multiple TMDB endpoints via the proxy and then
// de-duplicate and convert them to our Movie shape.
export async function fetchMaximumMovies(languages: string[] = ['en-US']): Promise<any[]> {
  try {
    console.log('Fetching maximum movies from multiple sources for languages:', languages);
    
    // Use multiple endpoints with many pages to get 1000+ movies
    // Reduced endpoints for better mobile network performance
    const endpoints = [];
    
    // Create endpoints for each language, but limit to avoid too many requests
    for (const language of languages.slice(0, 3)) { // Limit to first 3 languages to avoid too many requests
      // Popular movies (3 pages = 60 movies per language)
      endpoints.push(...Array.from({length: 3}, (_, i) => {
        const endpoint = encodeURIComponent(`/movie/popular?page=${i+1}&language=${language}`);
        return `${API_BASE_URL}?endpoint=${endpoint}`;
      }));
      // Top rated movies (2 pages = 40 movies per language)
      endpoints.push(...Array.from({length: 2}, (_, i) => {
        const endpoint = encodeURIComponent(`/movie/top_rated?page=${i+1}&language=${language}`);
        return `${API_BASE_URL}?endpoint=${endpoint}`;
      }));
      
      // Now playing movies (2 pages = 40 movies per language) - more diverse content
      endpoints.push(...Array.from({length: 2}, (_, i) => {
        const endpoint = encodeURIComponent(`/movie/now_playing?page=${i+1}&language=${language}`);
        return `${API_BASE_URL}?endpoint=${endpoint}`;
      }));
      
      // Upcoming movies (2 pages = 40 movies per language) - includes regional releases
      endpoints.push(...Array.from({length: 2}, (_, i) => {
        const endpoint = encodeURIComponent(`/movie/upcoming?page=${i+1}&language=${language}`);
        return `${API_BASE_URL}?endpoint=${endpoint}`;
      }));
    }
    
    // Special handling for Hindi movies - use discover endpoint for better coverage
    if (languages.includes('hi-IN')) {
      console.log('Adding Hindi-specific discover endpoints for better coverage...');
      // Discover Hindi movies by year ranges to get more variety
      const hindiYears = [
        { start: 2020, end: 2024 }, // Recent Hindi movies
        { start: 2015, end: 2019 }, // Mid-2010s Hindi movies  
        { start: 2010, end: 2014 }, // Early 2010s Hindi movies
        { start: 2005, end: 2009 }, // Late 2000s Hindi movies
      ];
      
      hindiYears.forEach(yearRange => {
        endpoints.push(...Array.from({length: 2}, (_, i) => {
          const endpoint = encodeURIComponent(`/discover/movie?page=${i+1}&language=hi-IN&primary_release_date.gte=${yearRange.start}-01-01&primary_release_date.lte=${yearRange.end}-12-31&sort_by=popularity.desc`);
          return `${API_BASE_URL}?endpoint=${endpoint}`;
        }));
      });
    }
    
    console.log(`Fetching from ${endpoints.length} endpoints (reduced for mobile performance)...`);
    
    // Smaller batch size for mobile networks
    const batchSize = 2; // Reduced batch size for better reliability
    const allMovies = [];
    
    for (let i = 0; i < endpoints.length; i += batchSize) {
      const batch = endpoints.slice(i, i + batchSize);
      console.log(`Fetching batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(endpoints.length/batchSize)}`);
      
      try {
        // Track page order to ensure deterministic results
        const promises = batch.map((url, urlIndex) => 
          fetchWithTimeout(url, 20000).then(response => ({ response, urlIndex }))
        );
        const responses = await Promise.all(promises);
        
        // Sort responses back to URL order
        responses.sort((a, b) => a.urlIndex - b.urlIndex);
        
        const dataPromises = responses.map(({ response }) => response.json().catch(() => ({ results: [] })));
        const batchData = await Promise.all(dataPromises);
        
        const batchMovies = batchData.flatMap(data => data.results || []);
        allMovies.push(...batchMovies);
        
        console.log(`Batch ${Math.floor(i/batchSize) + 1} fetched ${batchMovies.length} movies`);
        
        // Longer delay between batches to avoid rate limiting
        if (i + batchSize < endpoints.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
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
export async function fetchPopularMovies(page: number = 1, languages: string[] = ['en-US']): Promise<any[]> {
  try {
    // Fetch more pages to get 1000+ movies
    // Fetch fewer pages for better performance (especially on mobile)
    // Reduced from 50 to 10 pages for faster loading
    const pages = Array.from({length: 10}, (_, i) => i + 1); // Fetch first 10 pages (200 movies)
    const allMovies = [];
    
    // Fetch pages for each language
    for (const language of languages) {
      for (const pageNum of pages) {
        try {
          const endpoint = encodeURIComponent(`/movie/popular?page=${pageNum}&language=${language}`);
          const url = `${API_BASE_URL}?endpoint=${endpoint}`;
          console.log(`Fetching page ${pageNum} for language ${language}...`);
          
          const response = await fetchWithTimeout(url, 15000);
          
          if (!response.ok) {
            console.warn(`Page ${pageNum} failed with status: ${response.status}`);
            continue;
          }
          
          const data = await response.json();
          const movies = data.results || [];
          allMovies.push(...movies);
          
          console.log(`Page ${pageNum} (${language}) fetched ${movies.length} movies`);
          
          // Small delay between requests to avoid rate limiting
          if (pageNum < pages.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error) {
          console.warn(`Page ${pageNum} (${language}) failed:`, error);
          // Continue with next page
        }
      }
    }
    
    console.log('TMDB response:', allMovies.length, 'movies from', pages.length, 'pages');
    return allMovies.map(convertTMDBMovie);
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    return [];
  }
}

// Fetch top-rated movies (critically acclaimed)
export async function fetchTopRatedMovies(pages: number = 5, languages: string[] = ['en-US']): Promise<any[]> {
  try {
    const collected: any[] = [];

    for (const language of languages) {
      for (let page = 1; page <= pages; page++) {
        const endpoint = encodeURIComponent(`/movie/top_rated?page=${page}&language=${language}`);
        const url = `${API_BASE_URL}?endpoint=${endpoint}`;

        try {
          const response = await fetchWithTimeout(url, 15000);
          if (!response.ok) {
            console.warn(`Top rated page ${page} failed for language ${language}: ${response.status}`);
            continue;
          }

          const data = await response.json();
          const results = data.results || [];
          collected.push(...results);
        } catch (error) {
          console.warn(`Top rated fetch error for language ${language} page ${page}:`, error);
        }
      }
    }

    if (collected.length === 0) {
      console.warn('Top rated fetch returned no movies');
      return [];
    }

    const unique = collected.filter((movie, index, self) => index === self.findIndex((m) => m.id === movie.id));
    return unique.map(convertTMDBMovie);
  } catch (error) {
    console.error('Error fetching top rated movies:', error);
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
    const dataPromises = successfulResponses.map(({ response }) => (response as Response).json());
    const allData = await Promise.all(dataPromises);
    
    const allMovies = allData.flatMap(data => data.results || []);
    console.log(`Genre ${genreId} movies fetched: ${allMovies.length} movies`);
    return allMovies.map(convertTMDBMovie);
  } catch (error) {
    console.error('Error fetching movies by genre:', error);
    return [];
  }
}

// Fetch movies that match ALL provided genres using TMDB discover with multi-genre
// Fetches several pages to improve recall for strict AND queries
export async function fetchMoviesByGenresAND(genreIds: number[], pages: number = 5, language: string = 'en-US'): Promise<any[]> {
  try {
    if (!genreIds.length) return [];
    const pagesArr = Array.from({ length: pages }, (_, i) => i + 1);
    const promises = pagesArr.map((p, index) => {
      const genreParam = genreIds.join(',');
      const endpoint = encodeURIComponent(`/discover/movie?with_genres=${genreParam}&page=${p}&language=${language}&sort_by=popularity.desc`);
      const url = `${API_BASE_URL}?endpoint=${endpoint}`;
      return fetchWithTimeout(url, 12000).then(
        response => ({ response, pageIndex: index }),
        () => ({ response: null as any, pageIndex: index })
      );
    });
    const responses = await Promise.all(promises);
    const successful = responses.filter(r => r.response && r.response.ok);
    if (!successful.length) return [];
    const dataPromises = successful.map(({ response }) => response.json());
    const allData = await Promise.all(dataPromises);
    const allMovies = allData.flatMap(d => (d.results || []));
    const unique = allMovies.filter((m, i, s) => i === s.findIndex(x => x.id === m.id));
    return unique.map(convertTMDBMovie);
  } catch (e) {
    console.warn('Error fetching AND genres via discover:', e);
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

// Fetch trending movies — errors are treated as empty results to avoid UI noise
export async function fetchTrendingMovies(timeWindow: 'day' | 'week' = 'week', page: number = 1): Promise<any[]> {
  try {
    const endpoint = encodeURIComponent(`/trending/movie/${timeWindow}?page=${page}&language=en-US`);
    const response = await fetchWithTimeout(`${API_BASE_URL}?endpoint=${endpoint}`, 15000);
    
    if (!response.ok) {
      console.warn(`Trending failed with ${response.status}; returning empty list`);
      return [];
    }
    
    const data: TMDBResponse<TMDBMovie> = await response.json();
    return data.results.map(convertTMDBMovie);
  } catch (error) {
    console.warn('Error fetching trending movies:', error);
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
