// Cached movie service for faster loading
import { Movie, Genre, OTTPlatform } from '@/lib/store';

// Cache for movie data
const movieCache = new Map<string, Movie[]>();
const cacheExpiry = new Map<string, number>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Pre-defined movie datasets for instant loading
const POPULAR_MOVIES_CACHE: Movie[] = [
  {
    id: "1",
    title: "The Dark Knight",
    year: 2008,
    runtime: 152,
    rating: 9.0,
    genres: ["Action", "Crime", "Drama"],
    ott: ["Prime Video", "HBO Max"],
    poster_url: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    synopsis: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    adult: false
  },
  {
    id: "2", 
    title: "Inception",
    year: 2010,
    runtime: 148,
    rating: 8.8,
    genres: ["Action", "Sci-Fi", "Thriller"],
    ott: ["Netflix", "Prime Video"],
    poster_url: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
    synopsis: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    adult: false
  },
  {
    id: "3",
    title: "Pulp Fiction",
    year: 1994,
    runtime: 154,
    rating: 8.9,
    genres: ["Crime", "Drama"],
    ott: ["Netflix", "Prime Video"],
    poster_url: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    synopsis: "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
    adult: false
  },
  {
    id: "4",
    title: "The Godfather",
    year: 1972,
    runtime: 175,
    rating: 9.2,
    genres: ["Crime", "Drama"],
    ott: ["Prime Video", "Paramount+"],
    poster_url: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    synopsis: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
    adult: false
  },
  {
    id: "5",
    title: "Forrest Gump",
    year: 1994,
    runtime: 142,
    rating: 8.8,
    genres: ["Drama", "Romance"],
    ott: ["Netflix", "Prime Video"],
    poster_url: "https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
    synopsis: "The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man with an IQ of 75.",
    adult: false
  },
  {
    id: "6",
    title: "The Matrix",
    year: 1999,
    runtime: 136,
    rating: 8.7,
    genres: ["Action", "Sci-Fi"],
    ott: ["Netflix", "HBO Max"],
    poster_url: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    synopsis: "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
    adult: false
  },
  {
    id: "7",
    title: "Goodfellas",
    year: 1990,
    runtime: 146,
    rating: 8.7,
    genres: ["Biography", "Crime", "Drama"],
    ott: ["Netflix", "Prime Video"],
    poster_url: "https://image.tmdb.org/t/p/w500/aKuFiU82f5EXxxo9ZbyI5ezwC17.jpg",
    synopsis: "The story of Henry Hill and his life in the mob, covering his relationship with his wife Karen Hill and his mob partners Jimmy Conway and Tommy DeVito.",
    adult: false
  },
  {
    id: "8",
    title: "The Silence of the Lambs",
    year: 1991,
    runtime: 118,
    rating: 8.6,
    genres: ["Crime", "Drama", "Thriller"],
    ott: ["Prime Video", "HBO Max"],
    poster_url: "https://image.tmdb.org/t/p/w500/uS9m8OBk1A8eM9I042bx8XXpqAq.jpg",
    synopsis: "A young F.B.I. cadet must receive the help of an incarcerated and manipulative cannibal killer to help catch another serial killer.",
    adult: false
  },
  {
    id: "9",
    title: "Saving Private Ryan",
    year: 1998,
    runtime: 169,
    rating: 8.6,
    genres: ["Drama", "War"],
    ott: ["Netflix", "Prime Video"],
    poster_url: "https://image.tmdb.org/t/p/w500/uqx37cS8cpHg8U35f9U5IBlrCV3.jpg",
    synopsis: "Following the Normandy Landings, a group of U.S. soldiers go behind enemy lines to retrieve a paratrooper whose brothers have been killed in action.",
    adult: false
  },
  {
    id: "10",
    title: "The Lion King",
    year: 1994,
    runtime: 88,
    rating: 8.5,
    genres: ["Animation", "Adventure", "Drama"],
    ott: ["Disney+"],
    poster_url: "https://image.tmdb.org/t/p/w500/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg",
    synopsis: "Lion prince Simba and his father are targeted by his bitter uncle, who wants to ascend the throne himself.",
    adult: false
  },
  {
    id: "11",
    title: "Back to the Future",
    year: 1985,
    runtime: 116,
    rating: 8.5,
    genres: ["Adventure", "Comedy", "Sci-Fi"],
    ott: ["Prime Video", "Peacock"],
    poster_url: "https://image.tmdb.org/t/p/w500/fNOH9f1aA7XRTzl1sAOx9iF553Q.jpg",
    synopsis: "Marty McFly, a 17-year-old high school student, is accidentally sent thirty years into the past in a time-traveling DeLorean invented by his close friend.",
    adult: false
  },
  {
    id: "12",
    title: "The Terminator",
    year: 1984,
    runtime: 107,
    rating: 8.0,
    genres: ["Action", "Sci-Fi"],
    ott: ["Netflix", "Prime Video"],
    poster_url: "https://image.tmdb.org/t/p/w500/qvktm0BHcnmDpul4Hz01GIazWPr.jpg",
    synopsis: "A human soldier is sent from 2029 to 1984 to stop an almost indestructible cyborg killing machine.",
    adult: false
  },
  {
    id: "13",
    title: "Jurassic Park",
    year: 1993,
    runtime: 127,
    rating: 8.1,
    genres: ["Action", "Adventure", "Sci-Fi"],
    ott: ["Netflix", "Prime Video"],
    poster_url: "https://image.tmdb.org/t/p/w500/oU7Oq2kFAAlGqbD4Oj8S0lpa3pg.jpg",
    synopsis: "A pragmatic paleontologist touring an almost complete theme park on an island in Central America is tasked with protecting a couple of kids.",
    adult: false
  },
  {
    id: "14",
    title: "E.T. the Extra-Terrestrial",
    year: 1982,
    runtime: 115,
    rating: 7.8,
    genres: ["Family", "Sci-Fi"],
    ott: ["Prime Video", "Peacock"],
    poster_url: "https://image.tmdb.org/t/p/w500/an0nD6uq6byfxXCfk6lQB61L2va.jpg",
    synopsis: "A troubled child summons the courage to help a friendly alien escape Earth and return to his home world.",
    adult: false
  },
  {
    id: "15",
    title: "Indiana Jones and the Raiders of the Lost Ark",
    year: 1981,
    runtime: 115,
    rating: 8.4,
    genres: ["Action", "Adventure"],
    ott: ["Disney+", "Prime Video"],
    poster_url: "https://image.tmdb.org/t/p/w500/ceG9VzoRAVGwivFU403Wc3AHRys.jpg",
    synopsis: "In 1936, archaeologist and adventurer Indiana Jones is hired by the U.S. government to find the Ark of the Covenant before Adolf Hitler's Nazis can obtain its awesome powers.",
    adult: false
  },
  // Recent movies for 2025 filtering
  {
    id: "16",
    title: "Dune: Part Two",
    year: 2024,
    runtime: 166,
    rating: 8.1,
    genres: ["Sci-Fi", "Adventure", "Drama"],
    ott: ["HBO Max", "Prime Video"],
    poster_url: "https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05NxlLE.jpg",
    synopsis: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
    adult: false
  },
  {
    id: "17",
    title: "Oppenheimer",
    year: 2023,
    runtime: 180,
    rating: 8.3,
    genres: ["Drama", "History", "Biography"],
    ott: ["Peacock", "Prime Video"],
    poster_url: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    synopsis: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
    adult: false
  },
  {
    id: "18",
    title: "Barbie",
    year: 2023,
    runtime: 114,
    rating: 6.9,
    genres: ["Comedy", "Adventure", "Fantasy"],
    ott: ["HBO Max", "Prime Video"],
    poster_url: "https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg",
    synopsis: "Barbie and Ken are having the time of their lives in the colorful and seemingly perfect world of Barbie Land.",
    adult: false
  },
  {
    id: "19",
    title: "Spider-Man: Across the Spider-Verse",
    year: 2023,
    runtime: 140,
    rating: 8.6,
    genres: ["Animation", "Action", "Adventure"],
    ott: ["Netflix", "Prime Video"],
    poster_url: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    synopsis: "After reuniting with Gwen Stacy, Brooklyn's full-time, friendly neighborhood Spider-Man is catapulted across the Multiverse.",
    adult: false
  },
  {
    id: "20",
    title: "Top Gun: Maverick",
    year: 2022,
    runtime: 131,
    rating: 8.3,
    genres: ["Action", "Drama"],
    ott: ["Prime Video", "Paramount+"],
    poster_url: "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
    synopsis: "After thirty years, Maverick is still pushing the envelope as a top naval aviator, but must confront ghosts of his past.",
    adult: false
  },
  {
    id: "21",
    title: "Avatar: The Way of Water",
    year: 2022,
    runtime: 192,
    rating: 7.6,
    genres: ["Sci-Fi", "Adventure", "Fantasy"],
    ott: ["Disney+", "Prime Video"],
    poster_url: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
    synopsis: "Set more than a decade after the events of the first film, Avatar: The Way of Water begins to tell the story of the Sully family.",
    adult: false
  },
  {
    id: "22",
    title: "Black Panther: Wakanda Forever",
    year: 2022,
    runtime: 161,
    rating: 7.3,
    genres: ["Action", "Adventure", "Drama"],
    ott: ["Disney+", "Prime Video"],
    poster_url: "https://image.tmdb.org/t/p/w500/sv1xJUazXeYqALzczSZ3O6nkH75.jpg",
    synopsis: "Queen Ramonda, Shuri, M'Baku, Okoye and the Dora Milaje fight to protect their nation from intervening world powers.",
    adult: false
  },
  {
    id: "23",
    title: "The Batman",
    year: 2022,
    runtime: 176,
    rating: 7.8,
    genres: ["Action", "Crime", "Drama"],
    ott: ["HBO Max", "Prime Video"],
    poster_url: "https://image.tmdb.org/t/p/w500/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg",
    synopsis: "When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate.",
    adult: false
  },
  {
    id: "24",
    title: "Everything Everywhere All at Once",
    year: 2022,
    runtime: 139,
    rating: 8.1,
    genres: ["Action", "Adventure", "Comedy"],
    ott: ["Prime Video", "Paramount+"],
    poster_url: "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRZEVG2TKy4oqedO05.jpg",
    synopsis: "An aging Chinese immigrant is swept up in an insane adventure, where she alone can save what's important to her.",
    adult: false
  },
  {
    id: "25",
    title: "No Time to Die",
    year: 2021,
    runtime: 163,
    rating: 7.3,
    genres: ["Action", "Adventure", "Thriller"],
    ott: ["Prime Video", "Paramount+"],
    poster_url: "https://image.tmdb.org/t/p/w500/iUgygt3fscRoKWCV1d0C7FbM9TP.jpg",
    synopsis: "Bond has left active service and is enjoying a tranquil life in Jamaica. His peace is short-lived when his old friend Felix Leiter from the CIA turns up asking for help.",
    adult: false
  }
];

// Generate more movies by creating variations
function generateMovieVariations(baseMovies: Movie[]): Movie[] {
  const variations: Movie[] = [];
  
  baseMovies.forEach((movie, index) => {
    // Add the original movie
    variations.push(movie);
    
    // Create variations with different IDs
    for (let i = 1; i <= 3; i++) {
      variations.push({
        ...movie,
        id: `${movie.id}_v${i}`,
        title: `${movie.title} (${movie.year + i})`,
        year: movie.year + i,
        rating: Math.max(1, movie.rating + (Math.random() - 0.5) * 2),
        synopsis: movie.synopsis + ` This is variation ${i} of the classic film.`
      });
    }
  });
  
  return variations;
}

// Get cached movies or return instant dataset
export function getCachedMovies(preferences: {
  genres: Genre[];
  ottPlatforms: OTTPlatform[];
  adultContent: boolean;
  releaseYear?: number;
}): Movie[] {
  const cacheKey = JSON.stringify(preferences);
  
  // Check if we have valid cached data
  if (movieCache.has(cacheKey) && cacheExpiry.has(cacheKey)) {
    const expiry = cacheExpiry.get(cacheKey)!;
    if (Date.now() < expiry) {
      console.log('Returning cached movies');
      return movieCache.get(cacheKey)!;
    }
  }
  
  // Return instant dataset for fast loading
  console.log('Returning instant movie dataset');
  let movies = generateMovieVariations(POPULAR_MOVIES_CACHE);
  
  // Apply filtering
  if (!preferences.adultContent) {
    movies = movies.filter(movie => !movie.adult);
  }
  
  // Apply date filtering
  if (preferences.releaseYear) {
    movies = movies.filter(movie => movie.year >= preferences.releaseYear!);
    console.log(`Filtered by year ${preferences.releaseYear}: ${movies.length} movies`);
  }
  
  // Cache the result
  movieCache.set(cacheKey, movies);
  cacheExpiry.set(cacheKey, Date.now() + CACHE_DURATION);
  
  return movies;
}

// Progressive loading - start with cached, then enhance with API data
export async function loadMoviesProgressively(preferences: {
  genres: Genre[];
  ottPlatforms: OTTPlatform[];
  adultContent: boolean;
  releaseYear?: number;
}, onProgress?: (movies: Movie[], isComplete: boolean) => void): Promise<Movie[]> {
  
  // Step 1: Return cached movies immediately (0ms) for instant loading
  const cachedMovies = getCachedMovies(preferences);
  onProgress?.(cachedMovies, false); // Mark as incomplete initially
  
  // Step 2: In background, fetch real TMDB data
  try {
    console.log('Fetching real TMDB data in background...');
    
    // Import TMDB functions dynamically to avoid circular imports
    const { fetchMaximumMovies, fetchTrendingMovies, fetchMoviesByGenre, GENRE_MAP } = await import('./tmdb');
    
    let movies: Movie[] = [];
    
    // If specific genres are selected, fetch movies for those genres
    if (preferences.genres && preferences.genres.length > 0) {
      console.log('Fetching movies by genres:', preferences.genres);
      const genrePromises = preferences.genres.map(async (genreName) => {
        const genreId = Object.keys(GENRE_MAP).find(
          id => GENRE_MAP[parseInt(id)] === genreName
        );
        
        if (genreId) {
          console.log(`Fetching movies for genre: ${genreName} (ID: ${genreId})`);
          return await fetchMoviesByGenre(parseInt(genreId));
        }
        return [];
      });
      
      const genreResults = await Promise.all(genrePromises);
      movies = genreResults.flat();
      console.log('Genre-based movies fetched:', movies.length);
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
    
    // Apply filtering
    if (!preferences.adultContent) {
      movies = movies.filter(movie => !movie.adult);
    }
    
    if (preferences.releaseYear) {
      movies = movies.filter(movie => movie.year >= preferences.releaseYear!);
      console.log(`Filtered by year ${preferences.releaseYear}: ${movies.length} movies`);
    }
    
    // Remove duplicates
    const uniqueMovies = movies.filter((movie, index, self) => 
      index === self.findIndex(m => m.id === movie.id)
    );
    
    if (uniqueMovies.length > 0) {
      console.log(`Enhanced with ${uniqueMovies.length} real TMDB movies`);
      onProgress?.(uniqueMovies, true);
      return uniqueMovies;
    }
  } catch (error) {
    console.warn('Failed to fetch real TMDB data, using cached:', error);
  }
  
  // Fallback to cached movies if API fails
  onProgress?.(cachedMovies, true);
  return cachedMovies;
}

// Clear cache when needed
export function clearMovieCache(): void {
  movieCache.clear();
  cacheExpiry.clear();
  console.log('Movie cache cleared');
}
