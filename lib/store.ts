import { create } from 'zustand';

export type Genre = 'Action' | 'Adventure' | 'Animation' | 'Comedy' | 'Crime' | 'Documentary' | 'Drama' | 'Family' | 'Fantasy' | 'History' | 'Horror' | 'Music' | 'Mystery' | 'Romance' | 'Sci-Fi' | 'Thriller' | 'War' | 'Western';
export type OTTPlatform = 'Netflix' | 'Prime Video' | 'Hotstar' | 'Disney+' | 'HBO Max' | 'Hulu' | 'Apple TV+' | 'Paramount+' | 'Peacock';

export interface Movie {
  id: string;
  title: string;
  year: number;
  runtime: number;
  rating: number;
  genres: Genre[];
  ott: OTTPlatform[];
  poster_url: string;
  synopsis: string;
  adult?: boolean;
}

export interface UserPreferences {
  genres: Genre[];
  ottPlatforms: OTTPlatform[];
  adultContent: boolean;
}

interface Session {
  id: string;
  mode: 'single' | 'dual';
  code?: string;
  expiresAt: Date;
  seed?: number; // Seed for deterministic movie order
  isCreator?: boolean; // Whether this user created the session
  partnerReady?: boolean; // Whether partner is ready
  isReady?: boolean; // Whether this user is ready
  mutualLikes?: Movie[]; // Movies liked by both users
  creatorPreferences?: UserPreferences; // Creator's preferences
  joinerPreferences?: UserPreferences; // Joiner's preferences
  combinedPreferences?: UserPreferences; // Combined preferences for both users
  creatorLikes?: Movie[]; // Creator's liked movies
  joinerLikes?: Movie[]; // Joiner's liked movies
  creatorLikesCount?: number; // Creator's like count
  joinerLikesCount?: number; // Joiner's like count
}

interface AppState {
  // User preferences
  preferences: UserPreferences;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  
  // Session management
  session: Session | null;
  setSession: (session: Session | null) => void;
  
  // Movie deck
  movies: Movie[];
  currentMovieIndex: number;
  likedMovies: Movie[];
  setMovies: (movies: Movie[]) => void;
  loadMovies: (movies: Movie[]) => void; // For initial loading (resets index)
  addLikedMovie: (movie: Movie) => void;
  nextMovie: () => void;
  
  // Dual mode state
  setDualModeState: (state: { partnerReady?: boolean; isReady?: boolean; mutualLikes?: Movie[] }) => void;
  
  // Combine preferences for dual mode
  combinePreferences: (creatorPrefs: UserPreferences, joinerPrefs: UserPreferences) => UserPreferences;
  
  // Timer
  timerStart: Date | null;
  timerEnd: Date | null;
  setTimer: (start: Date, end: Date) => void;
  
  // App flow
  currentScreen: 'home' | 'preferences' | 'mode' | 'session' | 'ready' | 'swipe' | 'shortlist';
  setCurrentScreen: (screen: AppState['currentScreen']) => void;
  
  // Reset state
  resetState: () => void;
}

const initialPreferences: UserPreferences = {
  genres: [],
  ottPlatforms: [],
  adultContent: false,
};

export const useStore = create<AppState>((set) => ({
  preferences: initialPreferences,
  setPreferences: (prefs) => set((state) => ({ 
    preferences: { ...state.preferences, ...prefs } 
  })),
  
  session: null,
  setSession: (session) => set({ session }),
  
  movies: [],
  currentMovieIndex: 0,
  likedMovies: [],
  setMovies: (movies) => set({ movies }),
  loadMovies: (movies) => set({ movies, currentMovieIndex: 0 }),
  addLikedMovie: (movie) => set((state) => ({ 
    likedMovies: [...state.likedMovies, movie] 
  })),
  nextMovie: () => set((state) => ({ 
    currentMovieIndex: state.currentMovieIndex + 1 
  })),
  
  setDualModeState: (state) => set((current) => ({
    session: current.session ? { ...current.session, ...state } : null
  })),
  
  combinePreferences: (creatorPrefs, joinerPrefs) => ({
    genres: [...new Set([...creatorPrefs.genres, ...joinerPrefs.genres])],
    ottPlatforms: [...new Set([...creatorPrefs.ottPlatforms, ...joinerPrefs.ottPlatforms])],
    adultContent: creatorPrefs.adultContent || joinerPrefs.adultContent
  }),
  
  timerStart: null,
  timerEnd: null,
  setTimer: (start, end) => set({ timerStart: start, timerEnd: end }),
  
  currentScreen: 'home',
  setCurrentScreen: (screen) => set({ currentScreen: screen }),
  
  resetState: () => set({
    preferences: initialPreferences,
    session: null,
    movies: [],
    currentMovieIndex: 0,
    likedMovies: [],
    timerStart: null,
    timerEnd: null,
    currentScreen: 'home',
  }),
}));
