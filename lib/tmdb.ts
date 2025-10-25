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

// Fetch popular movies
export async function fetchPopularMovies(page: number = 1): Promise<any[]> {
  console.log('TMDB_API_KEY:', TMDB_API_KEY ? 'Found' : 'Not found');
  
  if (!TMDB_API_KEY) {
    console.error('TMDB API key not found');
    return [];
  }

  try {
    // Fetch multiple pages to get more movies
    const pages = [1, 2, 3]; // Fetch first 3 pages (60 movies)
    const promises = pages.map(p => {
      const url = `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=${p}&language=en-US`;
      console.log('Fetching from URL:', url);
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
    const pages = [1, 2, 3]; // Fetch first 3 pages
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
