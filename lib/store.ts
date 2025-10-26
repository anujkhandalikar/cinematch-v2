import { create } from 'zustand';
import { sessionService, likesService, matchesService, Session as SupabaseSession, MovieLike, MutualMatch } from './supabase';

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
  releaseYear: '2025' | '2000s' | 'older' | null;
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
  // Supabase integration fields
  supabaseSession?: SupabaseSession;
  userId?: string; // Unique user ID for this session
  realtimeSubscriptions?: any[]; // Store subscription references
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
  
  // Session flow state
  sessionStartTime: number | null;
  newLikesSinceNudge: number;
  newMutualSinceNudge: number; // New mutual likes since last nudge
  isSessionRunning: boolean;
  setSessionStartTime: (time: number | null) => void;
  setNewLikesSinceNudge: (count: number) => void;
  setNewMutualSinceNudge: (count: number) => void;
  setIsSessionRunning: (running: boolean) => void;
  incrementNewLikesSinceNudge: () => void;
  incrementNewMutualSinceNudge: () => void;
  resetNewLikesSinceNudge: () => void;
  resetNewMutualSinceNudge: () => void;
  
  // Dual mode state
  setDualModeState: (state: { partnerReady?: boolean; isReady?: boolean; mutualLikes?: Movie[] }) => void;
  
  // Combine preferences for dual mode
  combinePreferences: (creatorPrefs: UserPreferences, joinerPrefs: UserPreferences) => UserPreferences;
  
  // Timer
  timerStart: Date | null;
  timerEnd: Date | null;
  setTimer: (start: Date, end: Date) => void;
  
  // App flow
  currentScreen: 'home' | 'preferences' | 'mode' | 'session' | 'ready' | 'loading' | 'swipe' | 'shortlist';
  setCurrentScreen: (screen: AppState['currentScreen']) => void;
  
  // Supabase integration methods
  createSupabaseSession: (mode: 'single' | 'dual', preferences: UserPreferences) => Promise<void>;
  joinSupabaseSession: (code: string, preferences: UserPreferences) => Promise<void>;
  updateSessionReady: (isReady: boolean) => Promise<void>;
  addMovieLike: (movie: Movie) => Promise<void>;
  subscribeToRealtimeUpdates: () => void;
  unsubscribeFromRealtimeUpdates: () => void;
  
  // Reset state
  resetState: () => void;
}

const initialPreferences: UserPreferences = {
  genres: [],
  ottPlatforms: [],
  adultContent: false,
  releaseYear: null,
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
  
  // Session flow state
  sessionStartTime: null,
  newLikesSinceNudge: 0,
  newMutualSinceNudge: 0,
  isSessionRunning: false,
  setSessionStartTime: (time) => set({ sessionStartTime: time }),
  setNewLikesSinceNudge: (count) => set({ newLikesSinceNudge: count }),
  setNewMutualSinceNudge: (count) => set({ newMutualSinceNudge: count }),
  setIsSessionRunning: (running) => set({ isSessionRunning: running }),
  incrementNewLikesSinceNudge: () => set((state) => ({ 
    newLikesSinceNudge: state.newLikesSinceNudge + 1 
  })),
  incrementNewMutualSinceNudge: () => set((state) => ({ 
    newMutualSinceNudge: state.newMutualSinceNudge + 1 
  })),
  resetNewLikesSinceNudge: () => set({ newLikesSinceNudge: 0 }),
  resetNewMutualSinceNudge: () => set({ newMutualSinceNudge: 0 }),
  
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
  
  // Fallback session creation (without Supabase)
  createFallbackSession: (mode: 'single' | 'dual', preferences: UserPreferences) => {
    const sessionId = Math.floor(100000 + Math.random() * 900000).toString();
    const sharedSeed = 0.5;
    const session = {
      id: sessionId,
      mode,
      code: sessionId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      seed: sharedSeed,
      isCreator: true,
      isReady: false,
      partnerReady: false,
      mutualLikes: [],
      creatorPreferences: preferences,
      userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      realtimeSubscriptions: [],
    };
    set({ session });
    console.log('Fallback session created:', session);
  },

  // Fallback session joining (without Supabase)
  joinFallbackSession: (code: string, preferences: UserPreferences) => {
    const session = {
      id: code,
      mode: 'dual' as const,
      code: code,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      seed: 0.5, // Same seed as creator for same movie sequence
      isCreator: false,
      isReady: false,
      partnerReady: false,
      mutualLikes: [],
      joinerPreferences: preferences,
      userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      realtimeSubscriptions: [],
    };
    set({ session });
    console.log('Fallback session joined:', session);
  },

  // Manual session refresh method
  refreshSessionState: async () => {
    const state = useStore.getState();
    if (!state.session?.supabaseSession) return;
    
    try {
      console.log('Manually refreshing session state');
      const updatedSession = await sessionService.getSessionByCode(state.session.code!);
      console.log('Refreshed session data:', updatedSession);
      
      set((state) => ({
        session: state.session ? {
          ...state.session,
          partnerReady: state.session.isCreator ? updatedSession.joiner_ready : updatedSession.creator_ready,
          supabaseSession: updatedSession,
        } : null
      }));
    } catch (error) {
      console.error('Error refreshing session state:', error);
    }
  },

  // Supabase integration methods
  createSupabaseSession: async (mode, preferences) => {
    try {
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const sessionCode = Math.floor(100000 + Math.random() * 900000).toString();
      const sharedSeed = 0.5;
      
      const supabaseSessionData = {
        code: sessionCode,
        mode,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        seed: sharedSeed,
        creator_id: userId,
        creator_ready: false,
        joiner_ready: false,
        creator_preferences: preferences,
      };
      
      console.log('Creating Supabase session with data:', supabaseSessionData);
      const supabaseSession = await sessionService.createSession(supabaseSessionData);
      console.log('Supabase session created:', supabaseSession);
      
      const session: Session = {
        id: supabaseSession.id,
        mode,
        code: sessionCode,
        expiresAt: new Date(supabaseSession.expires_at),
        seed: sharedSeed,
        isCreator: true,
        isReady: false,
        partnerReady: false,
        mutualLikes: [],
        creatorPreferences: preferences,
        supabaseSession,
        userId,
        realtimeSubscriptions: [],
      };
      
      set({ session });
      console.log('Local session state updated');
    } catch (error) {
      console.error('Error creating Supabase session:', error);
      throw error;
    }
  },

  joinSupabaseSession: async (code, preferences) => {
    try {
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('Joining Supabase session with code:', code);
      const supabaseSession = await sessionService.getSessionByCode(code);
      console.log('Found session:', supabaseSession);
      
      if (!supabaseSession) {
        throw new Error('Session not found');
      }
      
      if (supabaseSession.joiner_id) {
        throw new Error('Session is full');
      }
      
      // Update session with joiner info
      console.log('Updating session with joiner info');
      const updatedSession = await sessionService.updateSession(supabaseSession.id, {
        joiner_id: userId,
        joiner_preferences: preferences,
      });
      console.log('Session updated:', updatedSession);
      
      const session: Session = {
        id: updatedSession.id,
        mode: updatedSession.mode as 'single' | 'dual',
        code: updatedSession.code,
        expiresAt: new Date(updatedSession.expires_at),
        seed: updatedSession.seed,
        isCreator: false,
        isReady: false,
        partnerReady: updatedSession.creator_ready,
        mutualLikes: [],
        creatorPreferences: updatedSession.creator_preferences,
        joinerPreferences: preferences,
        supabaseSession: updatedSession,
        userId,
        realtimeSubscriptions: [],
      };
      
      set({ session });
      console.log('Local session state updated for joiner');
    } catch (error) {
      console.error('Error joining Supabase session:', error);
      throw error;
    }
  },

  updateSessionReady: async (isReady) => {
    const state = useStore.getState();
    if (!state.session?.supabaseSession) return;
    
    try {
      const updates = state.session.isCreator 
        ? { creator_ready: isReady }
        : { joiner_ready: isReady };
      
      const updatedSession = await sessionService.updateSession(
        state.session.supabaseSession.id,
        updates
      );
      
      set((state) => ({
        session: state.session ? {
          ...state.session,
          isReady,
          supabaseSession: updatedSession,
        } : null
      }));
    } catch (error) {
      console.error('Error updating session ready state:', error);
    }
  },

  addMovieLike: async (movie) => {
    const state = useStore.getState();
    if (!state.session?.supabaseSession || !state.session.userId) return;
    
    try {
      await likesService.addLike(
        state.session.supabaseSession.id,
        state.session.userId,
        movie.id,
        movie
      );
      
      // Update local state
      set((state) => ({
        likedMovies: [...state.likedMovies, movie]
      }));
    } catch (error) {
      console.error('Error adding movie like:', error);
    }
  },

  subscribeToRealtimeUpdates: () => {
    const state = useStore.getState();
    if (!state.session?.supabaseSession) {
      console.log('No session found, cannot subscribe to updates');
      return;
    }
    
    console.log('Setting up real-time subscriptions for session:', state.session.supabaseSession.id);
    const subscriptions: any[] = [];
    
    // Subscribe to session changes
    const sessionSubscription = sessionService.subscribeToSession(
      state.session.supabaseSession.id,
      (payload) => {
        console.log('Session update received:', payload);
        // Handle different event types
        if ((payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') && payload.new) {
          const newSession = payload.new;
          console.log('Processing session update:', {
            isCreator: state.session.isCreator,
            creatorReady: newSession.creator_ready,
            joinerReady: newSession.joiner_ready,
            partnerReady: state.session.isCreator ? newSession.joiner_ready : newSession.creator_ready
          });
          set((state) => ({
            session: state.session ? {
              ...state.session,
              partnerReady: state.session.isCreator ? newSession.joiner_ready : newSession.creator_ready,
              supabaseSession: newSession,
            } : null
          }));
        }
      }
    );
    subscriptions.push(sessionSubscription);
    
    // Subscribe to likes changes
    const likesSubscription = likesService.subscribeToLikes(
      state.session.supabaseSession.id,
      (payload) => {
        console.log('Likes update received:', payload);
        // Handle likes updates if needed for real-time sync
      }
    );
    subscriptions.push(likesSubscription);
    
    // Subscribe to matches changes
    const matchesSubscription = matchesService.subscribeToMatches(
      state.session.supabaseSession.id,
      (payload) => {
        console.log('Matches update received:', payload);
        if (payload.eventType === 'INSERT' && payload.new) {
          set((state) => ({
            session: state.session ? {
              ...state.session,
              mutualLikes: [...(state.session.mutualLikes || []), payload.new.movie_data]
            } : null
          }));
        }
      }
    );
    subscriptions.push(matchesSubscription);
    
    // Store subscriptions
    set((state) => ({
      session: state.session ? {
        ...state.session,
        realtimeSubscriptions: subscriptions
      } : null
    }));
    
    console.log('Real-time subscriptions set up successfully');
  },

  unsubscribeFromRealtimeUpdates: () => {
    const state = useStore.getState();
    if (state.session?.realtimeSubscriptions) {
      state.session.realtimeSubscriptions.forEach(subscription => {
        subscription.unsubscribe();
      });
    }
  },

  resetState: () => {
    // Unsubscribe from realtime updates before resetting
    const state = useStore.getState();
    if (state.session?.realtimeSubscriptions) {
      state.session.realtimeSubscriptions.forEach(subscription => {
        subscription.unsubscribe();
      });
    }
    
    set({
      preferences: initialPreferences,
      session: null,
      movies: [],
      currentMovieIndex: 0,
      likedMovies: [],
      sessionStartTime: null,
      newLikesSinceNudge: 0,
      newMutualSinceNudge: 0,
      isSessionRunning: false,
      timerStart: null,
      timerEnd: null,
      currentScreen: 'home',
    });
  },
}));
