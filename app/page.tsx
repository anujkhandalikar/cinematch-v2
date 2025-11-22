'use client';

import { useEffect, useState, useRef } from 'react';
import { useStore, Movie, UserPreferences } from '@/lib/store';
import { fetchFilteredMovies, filterMovies } from '@/lib/movies';
import { fetchLanguageSeed } from '@/lib/ingestion';
import { convertTMDBToLanguages } from '@/lib/tmdb';
import { getCachedMovies } from '@/lib/movieCache';
import { sessionService } from '@/lib/supabase';
import HomeScreen from './components/HomeScreen';
import PreferencesScreen from './components/PreferencesScreen';
import ModeSelectionScreen from './components/ModeSelectionScreen';
import SessionScreen from './components/SessionScreen';
import ReadyScreen from './components/ReadyScreen';
import LoadingScreen from './components/LoadingScreen';
import SwipeDeck from './components/SwipeDeck';
import ShortlistScreen from './components/ShortlistScreen';

export default function Home() {
  const currentScreen = useStore((state) => state.currentScreen);
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);
  const preferences = useStore((state) => state.preferences);
  const loadMovies = useStore((state) => state.loadMovies);
  const session = useStore((state) => state.session);
  const movies = useStore((state) => state.movies);
  const currentMovieIndex = useStore((state) => state.currentMovieIndex);
  const [isLoadingMovies, setIsLoadingMovies] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingElapsed, setLoadingElapsed] = useState(0); // Force re-render to check elapsed time
  const lastSavedDeckRef = useRef<string>(''); // Track last saved deck to prevent duplicate saves
  const [loadingQuote] = useState(() => {
    const LOADING_QUOTES = [
      "Every great story begins with… buffering.",
      "In a world… where your taste is questionable.",
      "The reel spins. The world waits.",
      "Sometimes, you have to load the movies before the movies load you.",
      "Patience — the first act of every masterpiece.",
      "Somewhere, a screenwriter is crying over your algorithm.",
      "Roll camera. Load chaos.",
      "Spinning the reel of possibilities.",
      "Collecting movies you'll totally watch. Eventually.",
      "Fetching films. Bracing for opinions.",
      "Curating your next scroll marathon.",
      "Somewhere, a server's having an existential crisis.",
    ];
    return LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)];
  });
  
  const [secondaryCommentaryIndex, setSecondaryCommentaryIndex] = useState(0);
  const secondaryCommentaries = [
    "Rolling credits on bad choices…",
    "Consulting Rotten Tomatoes…",
    "Arguing with IMDb users…",
    "Decoding your questionable taste…",
    "Negotiating with streaming services…",
    "Filtering out the obvious misses…",
  ];
  
  // Rotate secondary commentary every 3 seconds when loading
  useEffect(() => {
    if (currentScreen === 'swipe' && (isLoadingMovies || minimumLoadingStartTime.current)) {
      const interval = setInterval(() => {
        setSecondaryCommentaryIndex((prev) => (prev + 1) % secondaryCommentaries.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentScreen, isLoadingMovies, secondaryCommentaries.length]);
  const hasLoadedMovies = useRef(false);
  const loadingStartTime = useRef<number | null>(null);
  const minimumLoadingStartTime = useRef<number | null>(null);

  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Current screen:', currentScreen);
    console.log('Movies state:', movies?.length || 0);
    console.log('Session:', session);
  }

  // Reset flag when screen changes away from swipe
  useEffect(() => {
    if (currentScreen !== 'swipe') {
      hasLoadedMovies.current = false;
      setIsLoadingMovies(false);
      setLoadError(null);
      loadingStartTime.current = null;
      minimumLoadingStartTime.current = null;
      setLoadingElapsed(0);
      lastSavedDeckRef.current = ''; // Reset saved deck hash when leaving swipe screen
    }
  }, [currentScreen]);

  // Auto-save movie deck to Supabase when movies are loaded in dual mode (creator)
  // This works for all loading paths: language streaming, fetchFilteredMovies, etc.
  useEffect(() => {
    // Only save deck if:
    // 1. We're in dual mode
    // 2. User is the creator
    // 3. We have a Supabase session
    // 4. Movies are loaded (more than 0)
    // 5. Combined preferences are ready
    // 6. We haven't already saved this exact deck
    if (session?.mode === 'dual' && 
        session?.isCreator && 
        session?.supabaseSession && 
        movies.length > 0 &&
        session.combinedPreferences &&
        session.creatorPreferences &&
        session.joinerPreferences) {
      
      // Create a hash of the current deck to detect changes
      const deckHash = movies.map(m => m.id).sort().join(',');
      
      // Only save if this is a different deck than what we last saved
      if (deckHash !== lastSavedDeckRef.current) {
        // Validate movies array before saving
        if (!Array.isArray(movies) || movies.length === 0) {
          console.warn('⚠️ CREATOR: Cannot save deck - invalid movies array:', {
            isArray: Array.isArray(movies),
            length: movies?.length,
            type: typeof movies
          });
          return;
        }
        
        // Validate session ID
        if (!session.supabaseSession?.id) {
          console.warn('⚠️ CREATOR: Cannot save deck - missing session ID');
          return;
        }
        
        const sessionId = session.supabaseSession.id;

        console.log('💾 CREATOR: Auto-saving movie deck to Supabase...');
        console.log('   Combined languages:', session.combinedPreferences.languages);
        console.log('   Deck size:', movies.length);
        console.log('   Session ID:', sessionId);
        
        sessionService.updateSession(sessionId, {
          movie_deck: movies
        }).then(() => {
          lastSavedDeckRef.current = deckHash;
          console.log('✅ CREATOR: Movie deck auto-saved to Supabase:', {
            movieCount: movies.length,
            firstFive: movies.slice(0, 5).map(m => ({ title: m.title, id: m.id }))
          });
        }).catch((err: any) => {
          console.error('❌ CREATOR: Error auto-saving movie deck');
          console.error('   Error type:', typeof err);
          console.error('   Error constructor:', err?.constructor?.name);
          console.error('   Error message:', err?.message || 'No message');
          console.error('   Error code:', err?.code || 'No code');
          console.error('   Error details:', err?.details || 'No details');
          console.error('   Error hint:', err?.hint || 'No hint');
          console.error('   Error toString:', err?.toString?.());
          console.error('   Session ID:', sessionId);
          console.error('   Movies count:', movies.length);
          console.error('   First movie sample:', movies[0] ? {
            id: movies[0].id,
            title: movies[0].title,
            hasPoster: !!movies[0].poster_url
          } : 'No movies');
          
          // Try to stringify error with error handling
          try {
            console.error('   Error JSON:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
          } catch (stringifyErr) {
            console.error('   Could not stringify error:', stringifyErr);
          }
        });
      }
    }
  }, [movies, session?.mode, session?.isCreator, session?.supabaseSession?.id, session?.combinedPreferences]);

  // Load movies when the swipe screen becomes active
  // We gate the effect to run once per visit to the swipe screen to
  // avoid duplicate fetches or race conditions.
  useEffect(() => {
    // Only load if: on swipe screen, not already loading, haven't loaded yet, and no movies exist
    const shouldLoad = currentScreen === 'swipe' && !isLoadingMovies && !hasLoadedMovies.current && movies.length === 0;
    
    if (shouldLoad) {
      hasLoadedMovies.current = true; // Prevent re-runs
      loadingStartTime.current = Date.now(); // Track when loading started
      minimumLoadingStartTime.current = Date.now(); // Track when minimum loading period started
        console.log('=== LOADING MOVIES FOR SWIPE SCREEN ===');
          console.log('Session mode:', session?.mode || 'single (no session)');
          console.log('Combined preferences:', session?.combinedPreferences);
          console.log('Individual preferences:', preferences);
          console.log('Session seed:', session?.seed);
          console.log('Current movies count:', movies.length);
        
        setIsLoadingMovies(true);
      
      const loadMoviesAsync = async () => {
        try {
          // For single mode (no session), handle differently
          if (!session) {
            console.log('🎬 SINGLE MODE: No session, using direct preferences');
            console.log('Prefs:', preferences);
            
            const seed = Math.random();
            console.log('🔍 Fetching movies from TMDB for single mode...');
            
            // CRITICAL: Skip instant cache if ANY filters are selected
            // Only show movies that match ALL selected filters (languages, genres, OTT, etc.)
            const hasAnyFilters = (preferences.languages?.length ?? 0) > 0 ||
                                 (preferences.genres?.length ?? 0) > 0 ||
                                 (preferences.ottPlatforms?.length ?? 0) > 0 ||
                                 (preferences.moodIncludeGenres?.length ?? 0) > 0 ||
                                 (preferences.moodExcludeGenres?.length ?? 0) > 0 ||
                                 !!preferences.releaseAfterMonths ||
                                 !!preferences.moodPreset ||
                                 preferences.highRatedOnly ||
                                 preferences.imdbTop250Movies ||
                                 preferences.releaseYear !== null;
            
            if (hasAnyFilters) {
              console.log('⚠️ Filters selected - skipping instant cache. Will only show movies matching all filters.');
            } else {
              // Only load instant cache if NO filters are selected
              const instant = getCachedMovies({
                genres: preferences.genres,
                ottPlatforms: preferences.ottPlatforms,
                adultContent: preferences.adultContent,
                releaseYear: preferences.releaseYear as any,
                highRatedOnly: preferences.highRatedOnly,
                releaseAfterMonths: preferences.releaseAfterMonths,
                moodIncludeGenres: preferences.moodIncludeGenres,
                moodExcludeGenres: preferences.moodExcludeGenres,
              });
              if (instant.length > 0 && movies.length === 0) {
                console.log('⚡ No filters selected - showing instant local deck');
                let instantFiltered = filterMovies(instant, preferences, seed);
                if (instantFiltered.length === 0) {
                  const relaxedPrefs = { ...preferences, genres: [], ottPlatforms: [] } as any;
                  instantFiltered = filterMovies(instant, relaxedPrefs, seed).slice(0, 60);
                  console.log('⚡ Using relaxed instant deck for perceived speed');
                }
                loadMovies(instantFiltered);
              }
            }
            const prefsToUse = preferences;
            const isDualMode = false;
            
            console.log('🎬 Using preferences:', {
              mode: 'single',
              hasCombinedPrefs: false,
              languages: prefsToUse.languages,
              genres: prefsToUse.genres,
              ottPlatforms: prefsToUse.ottPlatforms
            });
            
            // If only language is selected (no genres/platforms), use streaming to fetch ALL pages
            // IMPORTANT: Use prefsToUse (combined preferences) instead of preferences
            if ((prefsToUse.languages?.length ?? 0) > 0 &&
                (prefsToUse.genres?.length ?? 0) === 0 &&
                (prefsToUse.ottPlatforms?.length ?? 0) === 0) {
              const { streamLanguageAll } = await import('@/lib/ingestion');
              const languageCodes: Record<string,string> = { English: 'en', Hindi: 'hi', Tamil: 'ta', Telugu: 'te', Malayalam: 'ml', Bengali: 'bn' };
              
              // CRITICAL: Clear any existing movies before starting language streaming
              // This ensures we don't show cached/old movies that don't match the current filter
              console.log('🗑️ Clearing existing movies before language streaming (single mode)');
              loadMovies([]);
              setIsLoadingMovies(false);
              // Stream all pages for each language (fetches up to 500 pages each, all in background)
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              (async () => {
                let allLanguageMovies: Movie[] = [];
                const seenIds = new Set<string>(); // Deduplication Set
                const languagePromises = prefsToUse.languages.map((lang) => {
                  const code = languageCodes[lang as any];
                  if (!code) return Promise.resolve();
                  return streamLanguageAll(code, { adult: !!prefsToUse.adultContent }, (chunk, isComplete) => {
                    if (chunk.length) {
                      // Deduplicate using Set for O(1) lookup
                      const newMovies = chunk.filter(m => {
                        if (seenIds.has(m.id)) return false;
                        seenIds.add(m.id);
                        return true;
                      });
                      allLanguageMovies = [...allLanguageMovies, ...newMovies];
                      const filtered = filterMovies(allLanguageMovies, prefsToUse, seed);
                      const appendMoviesFn = useStore.getState().appendMovies;
                      const currentMovies = useStore.getState().movies;
                      if (currentMovies.length === 0 && filtered.length > 0) {
                        useStore.getState().loadMovies(filtered);
                      } else if (filtered.length > currentMovies.length) {
                        const currentIds = new Set(currentMovies.map(m => m.id));
                        const newMovies = filtered.filter(m => !currentIds.has(m.id));
                        if (newMovies.length > 0) appendMoviesFn(newMovies);
                      }
                      // Final completion: refresh deck
                      if (isComplete) {
                        const finalFiltered = filterMovies(allLanguageMovies, prefsToUse, seed);
                        useStore.getState().loadMovies(finalFiltered);
                      }
                    }
                  });
                });
                await Promise.all(languagePromises);
              })();
              return;
            }
            // CRITICAL: Clear any existing movies before fetching filtered movies
            // This ensures we don't show cached/old movies that don't match the current filter
            console.log('🗑️ Clearing existing movies before fetchFilteredMovies (single mode)');
            loadMovies([]);
            
            // Convert preferences to match fetchFilteredMovies signature
            let accumulatedMovies: Movie[] = [];
            const seenIds = new Set<string>(); // Use Set for O(1) lookup instead of O(n) array search
            const onProgress = (m: any[], isComplete: boolean) => {
              // Only process if we have new movies
              if (m.length === 0 && !isComplete) return;
              
              // Accumulate and deduplicate in one pass using Set
              const newMovies = m.filter(movie => {
                if (seenIds.has(movie.id)) return false;
                seenIds.add(movie.id);
                return true;
              });
              if (newMovies.length > 0) {
                accumulatedMovies = [...accumulatedMovies, ...newMovies];
              }
              
              // For dual mode, only update on final completion to ensure consistent ordering
              // For single mode, update incrementally for perceived speed
              if (isDualMode && !isComplete) {
                // Skip incremental updates in dual mode - wait for final result
                return;
              }
              
              // Apply filters - only relax genres/OTT if user didn't select them
              // IMPORTANT: Use prefsToUse (combined preferences) instead of preferences
              const langRelaxed = (prefsToUse.languages && prefsToUse.languages.length > 0 &&
                                   (prefsToUse.genres?.length ?? 0) === 0 &&
                                   (prefsToUse.ottPlatforms?.length ?? 0) === 0)
                ? { ...prefsToUse, genres: [], ottPlatforms: [] } as any
                : prefsToUse;
              const filtered = filterMovies(accumulatedMovies, langRelaxed, seed);
              
              // Update deck incrementally: load initial, append after
              const currentMovies = useStore.getState().movies;
              const currentIds = new Set(currentMovies.map(m => m.id));
              
              if (currentMovies.length === 0 && filtered.length > 0) {
                // Initial load
                useStore.getState().loadMovies(filtered);
              } else if (filtered.length > currentMovies.length) {
                // Append only truly new movies using Set for O(1) lookup
                const newMovies = filtered.filter(m => !currentIds.has(m.id));
                if (newMovies.length > 0) {
                  useStore.getState().appendMovies(newMovies);
                }
              }
              
              // On final completion, do a full refresh to ensure all filters are applied correctly
              if (isComplete) {
                const finalFiltered = filterMovies(accumulatedMovies, langRelaxed, seed);
                useStore.getState().loadMovies(finalFiltered);
              }
            };
            let fetchedMovies: Movie[] = [];
            try {
              fetchedMovies = await fetchFilteredMovies({
                genres: prefsToUse.genres,
                ottPlatforms: prefsToUse.ottPlatforms,
                adultContent: prefsToUse.adultContent,
                languages: prefsToUse.languages,
                highRatedOnly: prefsToUse.highRatedOnly,
                releaseYear: prefsToUse.releaseYear as any,
                imdbTop250Movies: prefsToUse.imdbTop250Movies,
                moodIncludeGenres: prefsToUse.moodIncludeGenres,
                moodExcludeGenres: prefsToUse.moodExcludeGenres,
              }, onProgress);
            } catch (error: any) {
              // Don't show error for IMDb Top 250 - it will fall back to regular movies
              // Just log it and continue
              if (error?.message === 'IMDB_TOP250_EMPTY') {
                console.warn('⚠️ IMDb Top 250 query returned empty, using fallback movies');
                // Don't set error or return - let it fall through to regular fetching
              } else {
                // Re-throw other errors to be caught by outer catch
                throw error;
              }
            }
            console.log('📥 Fetched movies:', fetchedMovies?.length || 0);
            
            // Ensure fetchedMovies is an array
            if (!Array.isArray(fetchedMovies)) {
              console.error('❌ fetchedMovies is not an array:', typeof fetchedMovies, fetchedMovies);
              fetchedMovies = [];
            }
            
            // If IMDb Top 250 is selected and we got 0 movies, show helpful error
            if (preferences.imdbTop250Movies && fetchedMovies.length === 0) {
              console.warn('⚠️ IMDb Top 250 returned 0 movies from Supabase');
              setLoadError('🎞 IMDb Top 250 database is not available. The Supabase table needs to be populated. Check the console for details. See SETUP_IMDB_TABLE.md for setup instructions.');
              loadMovies([]);
              setIsLoadingMovies(false);
              return;
            }
            
            let filtered = filterMovies(fetchedMovies, prefsToUse, seed);
            // Hard fallback: if only language is selected and results are tiny,
            // keep language-only list to maximize deck size.
            // But still apply release year and highRatedOnly filters!
            // IMPORTANT: Use prefsToUse (combined preferences) instead of preferences
            if (prefsToUse.languages?.length > 0 &&
                (prefsToUse.genres?.length ?? 0) === 0 &&
                (prefsToUse.ottPlatforms?.length ?? 0) === 0 &&
                filtered.length < 20) {
              filtered = filterMovies(fetchedMovies, {
                ...prefsToUse,
                genres: [],
                ottPlatforms: []
              }, seed);
            }
            // Only relax genres/OTT if user didn't select them AND we have very few results
            if (prefsToUse.languages && prefsToUse.languages.length > 0 && 
                filtered.length < 20 &&
                (prefsToUse.genres?.length ?? 0) === 0 &&
                (prefsToUse.ottPlatforms?.length ?? 0) === 0) {
              const relaxed = { ...prefsToUse, genres: [], ottPlatforms: [] } as any;
              filtered = filterMovies(fetchedMovies, relaxed, seed);
            }
            console.log('🎯 Filtered/shuffled movies:', filtered.length);
            console.log('📋 Loading movies into state');
            if (filtered.length === 0) {
              console.warn('No movies available after fetch/filter. Showing error.');
              setLoadError('No movies available right now. Please try again in a moment.');
              loadMovies([]);
            } else {
              loadMovies(filtered);
            }
            setIsLoadingMovies(false);
            return;
          }
          
          // Use seed for dual mode to ensure same movie sequence, or random for single mode
          const seed = session?.seed || Math.random();
          
          // For dual mode, check if movie deck already exists in Supabase
          // CRITICAL: Only load existing deck if combinedPreferences are ready
          // This ensures the deck was created with the correct combined preferences
          if (session?.mode === 'dual' && session?.supabaseSession) {
            console.log('🎬 DUAL MODE: Checking for existing movie deck in Supabase...');
            console.log('User is creator:', session.isCreator);
            console.log('Session code:', session.code);
            console.log('Has combinedPreferences:', !!session.combinedPreferences);
            console.log('Combined languages:', session.combinedPreferences?.languages);
            
            // CRITICAL: Only use existing deck if combinedPreferences are ready
            // Otherwise, the deck might have been created with only creator's preferences
            const hasCombinedPrefs = session.combinedPreferences && 
                                    session.creatorPreferences && 
                                    session.joinerPreferences;
            
            if (!hasCombinedPrefs) {
              console.warn('⚠️ DUAL MODE: combinedPreferences not ready yet');
              console.warn('   Creator prefs:', session.creatorPreferences);
              console.warn('   Joiner prefs:', session.joinerPreferences);
              
              // Both creator and joiner need to wait for combinedPreferences
              // Poll the session to see when both preferences are ready
              console.log('⏳ Waiting for both users to set preferences...');
              let prefAttempts = 0;
              const maxPrefAttempts = 60; // 60 seconds max wait for preferences
              
              while (prefAttempts < maxPrefAttempts) {
                const dbSession = await sessionService.getSessionByCode(session.code!);
                const currentCreatorPrefs = dbSession.creator_preferences;
                const currentJoinerPrefs = dbSession.joiner_preferences;
                
                // Check if both preferences are now available
                if (currentCreatorPrefs && currentJoinerPrefs) {
                  console.log('✅ Both preferences are now ready!');
                  // Refresh session state to get updated combinedPreferences
                  const { refreshSessionState } = useStore.getState();
                  await refreshSessionState();
                  
                  // Re-check hasCombinedPrefs after refresh
                  const updatedSession = useStore.getState().session;
                  const updatedHasCombinedPrefs = updatedSession?.combinedPreferences && 
                                                  updatedSession?.creatorPreferences && 
                                                  updatedSession?.joinerPreferences;
                  
                  if (updatedHasCombinedPrefs) {
                    console.log('✅ Combined preferences are ready, proceeding...');
                    // Break out and continue with deck creation/loading
                    break;
                  }
                }
                
                console.log(`⏳ Waiting for preferences (attempt ${prefAttempts + 1}/${maxPrefAttempts})...`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                prefAttempts++;
              }
              
              // Re-check after waiting
              const finalSession = useStore.getState().session;
              const finalHasCombinedPrefs = finalSession?.combinedPreferences && 
                                           finalSession?.creatorPreferences && 
                                           finalSession?.joinerPreferences;
              
              if (!finalHasCombinedPrefs) {
                console.error('❌ Timeout waiting for both users to set preferences');
                setLoadError('🎞 Waiting for both users to set preferences. Please ensure both users have completed their preferences.');
                loadMovies([]);
                setIsLoadingMovies(false);
                return;
              }
              
              console.log('✅ Combined preferences ready, proceeding with deck creation/loading');
            }
            
            // Now that combinedPreferences are ready (or were already ready), proceed with deck logic
            // Refresh session to ensure we have latest state
            const currentSession = useStore.getState().session;
            if (currentSession?.mode === 'dual' && currentSession?.supabaseSession) {
              // Joiners should wait for the creator to create the deck
              if (!currentSession.isCreator) {
                console.log('👤 JOINER: Waiting for creator to create movie deck...');
                
                // First, check if deck already exists (might have been created before we started waiting)
                const initialCheck = await sessionService.getSessionByCode(currentSession.code!);
                if (initialCheck.movie_deck && initialCheck.movie_deck.length > 0) {
                  console.log('✅ JOINER: Deck already exists! Loading immediately');
                  console.log('📊 Deck size:', initialCheck.movie_deck.length, 'movies');
                  loadMovies(initialCheck.movie_deck);
                  setIsLoadingMovies(false);
                  return;
                }
                
                // Set up a check that also listens for real-time updates
                // The real-time subscription in store.ts will handle deck updates
                // But we also poll as a fallback
                let attempts = 0;
                const maxAttempts = 60; // 60 attempts with 1 second delay = 60 seconds max wait
                
                // Check if movies were loaded by real-time subscription
                const checkMoviesLoaded = () => {
                  const currentMovies = useStore.getState().movies;
                  return currentMovies.length > 0;
                };
                
                while (attempts < maxAttempts) {
                  // Check if real-time subscription already loaded movies
                  if (checkMoviesLoaded()) {
                    console.log('✅ JOINER: Movies loaded via real-time subscription!');
                    setIsLoadingMovies(false);
                    return;
                  }
                  
                  // Refresh session state to get latest combinedPreferences
                  const { refreshSessionState } = useStore.getState();
                  await refreshSessionState();
                  
                  const dbSession = await sessionService.getSessionByCode(currentSession.code!);
                  
                  if (dbSession.movie_deck && dbSession.movie_deck.length > 0) {
                    console.log('✅ JOINER: Creator created deck! Loading movie deck from Supabase');
                    console.log('📊 Deck size:', dbSession.movie_deck.length, 'movies');
                    console.log('🎥 First 5 movies:', dbSession.movie_deck.slice(0, 5).map((m: any) => ({ title: m.title, id: m.id })));
                    console.log('🎥 First 5 movie IDs:', dbSession.movie_deck.slice(0, 5).map((m: any) => m.id));
                    
                    // Verify deck has movies from combined languages
                    const sessionState = useStore.getState().session;
                    if (sessionState?.combinedPreferences?.languages && sessionState.combinedPreferences.languages.length > 0) {
                      console.log('✅ Verifying deck matches combined languages:', sessionState.combinedPreferences.languages);
                    }
                    
                    loadMovies(dbSession.movie_deck);
                    setIsLoadingMovies(false);
                    return;
                  }
                  
                  console.log(`⏳ Joiner: Waiting for deck (attempt ${attempts + 1}/${maxAttempts})...`);
                  console.log(`   Creator ready: ${dbSession.creator_ready}, Joiner ready: ${dbSession.joiner_ready}`);
                  console.log(`   Has deck: ${!!dbSession.movie_deck}, Deck length: ${dbSession.movie_deck?.length || 0}`);
                  console.log(`   Current movies in store: ${useStore.getState().movies.length}`);
                  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                  attempts++;
                }
                
                // Final check - maybe real-time subscription loaded movies while we were waiting
                if (checkMoviesLoaded()) {
                  console.log('✅ JOINER: Movies loaded via real-time subscription (final check)!');
                  setIsLoadingMovies(false);
                  return;
                }
                
                console.error('❌ Joiner: Timeout waiting for creator to create deck');
                setLoadError('🎞 Creator is taking longer than expected to create the movie deck. Please try refreshing.');
                loadMovies([]); // Load empty array to show error
                setIsLoadingMovies(false);
                return;
              } else {
                // Creator: Check if deck exists
                // But only use it if it was created with current combinedPreferences
                console.log('👑 CREATOR: Checking for existing deck...');
                const dbSession = await sessionService.getSessionByCode(currentSession.code!);
                
                if (dbSession.movie_deck && dbSession.movie_deck.length > 0) {
                  // Check if deck was created with current combined preferences
                  // We can't perfectly verify this, but we can check if both users are ready
                  const bothReady = dbSession.creator_ready && dbSession.joiner_ready;
                  
                  if (bothReady) {
                    console.log('✅ CREATOR: Deck exists and both users are ready! Loading from Supabase');
                    console.log('📊 Deck size:', dbSession.movie_deck.length, 'movies');
                    console.log('🎥 First 5 movies:', dbSession.movie_deck.slice(0, 5).map((m: any) => ({ title: m.title, id: m.id })));
                    console.log('🎥 First 5 movie IDs:', dbSession.movie_deck.slice(0, 5).map((m: any) => m.id));
                    loadMovies(dbSession.movie_deck);
                    setIsLoadingMovies(false);
                    return;
                  } else {
                    console.warn('⚠️ CREATOR: Deck exists but both users not ready yet. Will recreate with combined prefs.');
                    // Clear the old deck and create a new one
                    await sessionService.updateSession(currentSession.supabaseSession.id, {
                      movie_deck: null
                    });
                    console.log('🗑️ Cleared old deck, will create new one');
                  }
                } else {
                  console.log('👑 CREATOR: No existing deck found, will create new one');
                }
              }
            }
          }
          
          // CRITICAL: For dual mode, we MUST wait for combinedPreferences before proceeding
          // Don't set prefsToUse yet - we'll set it after ensuring combinedPreferences are ready
          let prefsToUse: UserPreferences;
          
          // For dual mode, ensure we have combinedPreferences before setting prefsToUse
          // CRITICAL: If combinedPreferences aren't ready, we MUST NOT proceed with deck creation
          if (session?.mode === 'dual') {
            // Refresh session state to get latest combinedPreferences
            console.log('🔄 DUAL MODE: Refreshing session state to get latest combinedPreferences...');
            const { refreshSessionState } = useStore.getState();
            await refreshSessionState();
            
            // Get refreshed session state
            const refreshedSession = useStore.getState().session;
            console.log('🔄 After refresh:', {
              hasSession: !!refreshedSession,
              hasCombinedPrefs: !!refreshedSession?.combinedPreferences,
              hasCreatorPrefs: !!refreshedSession?.creatorPreferences,
              hasJoinerPrefs: !!refreshedSession?.joinerPreferences,
              creatorLanguages: refreshedSession?.creatorPreferences?.languages,
              joinerLanguages: refreshedSession?.joinerPreferences?.languages,
              combinedLanguages: refreshedSession?.combinedPreferences?.languages
            });
            
            // Check if combinedPreferences are ready after refresh
            // Languages are optional - allow empty languages array
            if (refreshedSession?.combinedPreferences && 
                refreshedSession?.creatorPreferences && 
                refreshedSession?.joinerPreferences) {
              // Ensure languages array exists (can be empty)
              if (!refreshedSession.combinedPreferences.languages) {
                refreshedSession.combinedPreferences.languages = [];
              }
              prefsToUse = refreshedSession.combinedPreferences;
              console.log('✅ DUAL MODE: Using combinedPreferences after refresh:', {
                languages: prefsToUse.languages,
                genres: prefsToUse.genres,
                ottPlatforms: prefsToUse.ottPlatforms,
                creatorLanguages: refreshedSession.creatorPreferences.languages,
                joinerLanguages: refreshedSession.joinerPreferences.languages
              });
            } else if (refreshedSession?.creatorPreferences && refreshedSession?.joinerPreferences) {
              // Try to combine manually if both are available
              console.log('🔧 Manually combining preferences after refresh...');
              const { combinePreferences } = useStore.getState();
              const manuallyCombined = combinePreferences(
                refreshedSession.creatorPreferences,
                refreshedSession.joinerPreferences
              );
              
              // Languages are optional - ensure languages array exists (can be empty)
              if (!manuallyCombined.languages) {
                manuallyCombined.languages = [];
              }
              
              console.log('✅ Manually combined prefs (languages optional):', {
                languages: manuallyCombined.languages,
                genres: manuallyCombined.genres,
                ottPlatforms: manuallyCombined.ottPlatforms
              });
              
              // Update session with combined preferences
              useStore.setState((state) => ({
                session: state.session ? {
                  ...state.session,
                  combinedPreferences: manuallyCombined
                } : null
              }));
              
              prefsToUse = manuallyCombined;
              console.log('✅ Using manually combined preferences for movie fetching');
            } else {
              // CRITICAL: If combinedPreferences aren't ready, we MUST NOT create the deck
              // This prevents showing wrong movies (e.g., all movies instead of filtered)
              console.error('❌ DUAL MODE: Cannot proceed - combinedPreferences not ready');
              console.error('   Creator prefs:', refreshedSession?.creatorPreferences);
              console.error('   Joiner prefs:', refreshedSession?.joinerPreferences);
              console.error('   Combined prefs:', refreshedSession?.combinedPreferences);
              setLoadError('🎞 Waiting for both users to set preferences. Please ensure both users have completed their preferences.');
              loadMovies([]);
              setIsLoadingMovies(false);
              return;
            }
          } else {
            // Single mode: use individual preferences
            prefsToUse = preferences;
          }
          
          // Languages are optional - ensure languages array exists (can be empty)
          if (!prefsToUse.languages) {
            prefsToUse.languages = [];
          }
          
          console.log('🎬 Final prefs to use for movie fetching:', {
            mode: session?.mode,
            languages: prefsToUse.languages,
            languagesLength: prefsToUse.languages?.length || 0,
            genres: prefsToUse.genres,
            ottPlatforms: prefsToUse.ottPlatforms,
            creatorLanguages: session?.creatorPreferences?.languages,
            joinerLanguages: session?.joinerPreferences?.languages
          });
          
          // Languages are optional - proceed with or without language filter
          console.log('✅ Languages are optional - proceeding with movie fetching');
          
          // CRITICAL: Skip instant deck if ANY filters are selected OR if dual mode prefs aren't ready
          // Only show movies that match ALL selected filters (languages, genres, OTT, etc.)
          const hasAnyFilters = (prefsToUse.languages?.length ?? 0) > 0 ||
                               (prefsToUse.genres?.length ?? 0) > 0 ||
                               (prefsToUse.ottPlatforms?.length ?? 0) > 0 ||
                               (prefsToUse.moodIncludeGenres?.length ?? 0) > 0 ||
                               (prefsToUse.moodExcludeGenres?.length ?? 0) > 0 ||
                               !!prefsToUse.releaseAfterMonths ||
                               !!prefsToUse.moodPreset ||
                               prefsToUse.highRatedOnly ||
                               prefsToUse.imdbTop250Movies ||
                               prefsToUse.releaseYear !== null;
          
          const shouldSkipInstantDeck = hasAnyFilters || 
                                        (session?.mode === 'dual' && 
                                         (!session?.combinedPreferences || 
                                          !session?.creatorPreferences || 
                                          !session?.joinerPreferences));
          
          if (shouldSkipInstantDeck) {
            if (hasAnyFilters) {
              console.log('⚠️ Filters selected - skipping instant cache. Will only show movies matching all filters.');
              console.log('   Selected filters:', {
                languages: prefsToUse.languages,
                genres: prefsToUse.genres,
                ottPlatforms: prefsToUse.ottPlatforms,
                highRatedOnly: prefsToUse.highRatedOnly,
                imdbTop250Movies: prefsToUse.imdbTop250Movies,
                releaseYear: prefsToUse.releaseYear,
                moodPreset: prefsToUse.moodPreset,
                moodIncludeGenres: prefsToUse.moodIncludeGenres,
                releaseAfterMonths: prefsToUse.releaseAfterMonths,
              });
            } else {
              console.warn('⚠️ DUAL MODE: Skipping instant deck - combinedPreferences not ready');
            }
          } else {
            // Only load instant cache if NO filters are selected
            const instant = getCachedMovies({
              genres: prefsToUse.genres,
              ottPlatforms: prefsToUse.ottPlatforms,
              adultContent: prefsToUse.adultContent,
              releaseYear: prefsToUse.releaseYear as any,
              highRatedOnly: prefsToUse.highRatedOnly,
              releaseAfterMonths: prefsToUse.releaseAfterMonths,
              moodIncludeGenres: prefsToUse.moodIncludeGenres,
              moodExcludeGenres: prefsToUse.moodExcludeGenres,
            });
            if (instant.length > 0 && movies.length === 0) {
              console.log('⚡ No filters selected - showing instant local deck (unified path)');
              let instantFiltered = filterMovies(instant, prefsToUse, seed);
              if (instantFiltered.length === 0) {
                const relaxedPrefs = { ...prefsToUse, genres: [], ottPlatforms: [] } as any;
                instantFiltered = filterMovies(instant, relaxedPrefs, seed).slice(0, 60);
                console.log('⚡ Using relaxed instant deck (unified) for perceived speed');
              }
              loadMovies(instantFiltered);
            }
          }
          
          // Hard language-only path for dual/unified - stream ALL pages
          // IMPORTANT: This handles the OR logic for multiple languages (Hindi + Tamil)
          // CRITICAL: Validate that prefsToUse has languages before streaming
          if ((prefsToUse.languages?.length ?? 0) > 0 &&
              (prefsToUse.genres?.length ?? 0) === 0 &&
              (prefsToUse.ottPlatforms?.length ?? 0) === 0) {
            // Double-check for dual mode that we have valid combinedPreferences
            if (session?.mode === 'dual') {
              const combinedPrefs = session?.combinedPreferences;
              const creatorPrefs = session?.creatorPreferences;
              const joinerPrefs = session?.joinerPreferences;
              const hasValidCombinedPrefs = !!(combinedPrefs && 
                                            creatorPrefs && 
                                            joinerPrefs &&
                                            combinedPrefs.languages.length > 0);
              if (!hasValidCombinedPrefs) {
                console.error('❌ DUAL MODE: Cannot stream languages - combinedPreferences not valid');
                console.error('   prefsToUse.languages:', prefsToUse.languages);
                console.error('   session.combinedPreferences:', combinedPrefs);
                console.error('   session.creatorPreferences:', creatorPrefs);
                console.error('   session.joinerPreferences:', joinerPrefs);
                setLoadError('🎞 Waiting for both users to set preferences. Please ensure both users have completed their preferences.');
                loadMovies([]);
                setIsLoadingMovies(false);
                return;
              }
              console.log('✅ DUAL MODE: Validated combinedPreferences before language streaming');
              console.log('   Combined languages:', combinedPrefs.languages);
            }
            
            const { streamLanguageAll } = await import('@/lib/ingestion');
            const languageCodes: Record<string,string> = { English: 'en', Hindi: 'hi', Tamil: 'ta', Telugu: 'te', Malayalam: 'ml', Bengali: 'bn' };
            console.log('🌍 LANGUAGE-ONLY MODE (DUAL): Streaming movies for languages:', prefsToUse.languages);
            console.log('🌍 Language codes:', prefsToUse.languages.map(l => ({ lang: l, code: languageCodes[l as any] })));
            
            // CRITICAL: Clear any existing movies before starting language streaming
            // This ensures we don't show cached/old movies that don't match the current filter
            console.log('🗑️ Clearing existing movies before language streaming (dual mode)');
            loadMovies([]);
            setIsLoadingMovies(false);
            // Stream all pages for each language (fetches up to 500 pages each, all in background)
            // This handles OR logic - fetches movies from ALL selected languages (Hindi + Tamil)
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            (async () => {
              try {
                let allLanguageMovies: Movie[] = [];
                const seenIds = new Set<string>();
                console.log(`🌍 Starting language streaming for ${prefsToUse.languages.length} language(s):`, prefsToUse.languages);
                console.log(`🌍 Combined languages:`, prefsToUse.languages);
                
                const languagePromises = prefsToUse.languages.map((lang) => {
                  const code = languageCodes[lang as any];
                  if (!code) {
                    console.error(`❌ No code found for language: ${lang}`);
                    console.error(`   Available languages:`, Object.keys(languageCodes));
                    console.error(`   prefsToUse.languages:`, prefsToUse.languages);
                    return Promise.resolve();
                  }
                  console.log(`📥 Starting stream for language: ${lang} (code: ${code})`);
                  console.log(`   This will filter by with_original_language=${code}`);
                  console.log(`   API response language will be en-US (for metadata)`);
                  return streamLanguageAll(code, { adult: !!prefsToUse.adultContent }, (chunk, isComplete) => {
                    if (chunk.length) {
                      console.log(`📥 Received ${chunk.length} movies for ${lang} (total so far: ${allLanguageMovies.length + chunk.length})`);
                      // Deduplicate using Set for O(1) performance
                      const newMovies = chunk.filter(m => {
                        if (seenIds.has(m.id)) return false;
                        seenIds.add(m.id);
                        return true;
                      });
                      allLanguageMovies = [...allLanguageMovies, ...newMovies];
                      console.log(`📊 Total unique movies after ${lang}: ${allLanguageMovies.length}`);
                      
                      const filtered = filterMovies(allLanguageMovies, prefsToUse, seed);
                      console.log(`🎯 Filtered movies after ${lang}: ${filtered.length} (from ${allLanguageMovies.length} total)`);
                      
                      const currentMovies = useStore.getState().movies;
                      const currentIds = new Set(currentMovies.map(m => m.id));
                      if (currentMovies.length === 0 && filtered.length > 0) {
                        console.log(`✅ Loading initial ${filtered.length} movies`);
                        useStore.getState().loadMovies(filtered);
                      } else if (filtered.length > currentMovies.length) {
                        const newFiltered = filtered.filter(m => !currentIds.has(m.id));
                        if (newFiltered.length > 0) {
                          console.log(`✅ Appending ${newFiltered.length} new movies`);
                          useStore.getState().appendMovies(newFiltered);
                        }
                      }
                      // Final completion: refresh deck
                      if (isComplete) {
                        console.log(`✅ Final completion for ${lang}. Total movies: ${allLanguageMovies.length}`);
                        const finalFiltered = filterMovies(allLanguageMovies, prefsToUse, seed);
                        console.log(`🎯 Final filtered count for ${lang}: ${finalFiltered.length} (from ${allLanguageMovies.length} total)`);
                        if (finalFiltered.length > 0) {
                          useStore.getState().loadMovies(finalFiltered);
                        } else {
                          console.warn(`⚠️ After filtering ${allLanguageMovies.length} movies from ${lang}, 0 remain`);
                        }
                      }
                    } else if (isComplete) {
                      console.warn(`⚠️ Language ${lang} stream completed with 0 movies`);
                    }
                  }).catch((error) => {
                    console.error(`❌ Error streaming language ${lang}:`, error);
                    return Promise.resolve(); // Continue with other languages
                  });
                });
                
                await Promise.all(languagePromises);
                console.log(`✅✅✅ ALL LANGUAGES COMPLETE! Total movies fetched: ${allLanguageMovies.length}`);
                
                // Final check - ensure movies are loaded
                const finalMovies = useStore.getState().movies;
                if (finalMovies.length === 0) {
                  if (allLanguageMovies.length > 0) {
                    console.warn(`⚠️ Movies were fetched (${allLanguageMovies.length}) but not loaded. Attempting final load...`);
                    const finalFiltered = filterMovies(allLanguageMovies, prefsToUse, seed);
                    console.log(`🎯 Final filtered count: ${finalFiltered.length} (from ${allLanguageMovies.length} total)`);
                    if (finalFiltered.length > 0) {
                      useStore.getState().loadMovies(finalFiltered);
                      console.log(`✅ Successfully loaded ${finalFiltered.length} movies`);
                    } else {
                      console.error(`❌ ERROR: After filtering ${allLanguageMovies.length} movies, 0 remain!`);
                      console.error(`   Preferences used:`, prefsToUse);
                      console.error(`   This suggests filterMovies is too strict`);
                      setLoadError(`🎞 No movies found matching your preferences. Try selecting different filters.`);
                    }
                  } else {
                    console.error(`❌ No movies fetched from any language stream`);
                    setLoadError(`🎞 Could not fetch movies. Please try again or select different languages.`);
                  }
                } else {
                  console.log(`✅ Movies successfully loaded: ${finalMovies.length}`);
                }
              } catch (error) {
                console.error('❌ Error in language streaming:', error);
                setLoadError(`🎞 Error loading movies: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            })();
            return;
          }

          // CRITICAL: Clear any existing movies before fetching filtered movies
          // This ensures we don't show cached/old movies that don't match the current filter
          console.log('🗑️ Clearing existing movies before fetchFilteredMovies (dual/unified mode)');
          loadMovies([]);
          
          // Fetch movies from TMDB with preferences
          // Convert preferences to match fetchFilteredMovies signature
          let accumulatedMovies: Movie[] = [];
          const seenIdsForStream = new Set<string>();
          const onProgress = (m: any[], isComplete: boolean) => {
            // Only process if we have new movies
            if (m.length === 0 && !isComplete) return;
            
            // Accumulate and deduplicate in one pass using Set
            const newMovies = m.filter(movie => {
              if (seenIdsForStream.has(movie.id)) return false;
              seenIdsForStream.add(movie.id);
              return true;
            });
            if (newMovies.length > 0) {
              accumulatedMovies = [...accumulatedMovies, ...newMovies];
            }
            
            // Apply filters - only relax genres/OTT if user didn't select them
            const langRelaxed = (prefsToUse.languages && prefsToUse.languages.length > 0 &&
                                 (prefsToUse.genres?.length ?? 0) === 0 &&
                                 (prefsToUse.ottPlatforms?.length ?? 0) === 0)
              ? { ...prefsToUse, genres: [], ottPlatforms: [] } as any
              : prefsToUse;
            const filtered = filterMovies(accumulatedMovies, langRelaxed, seed);
            
            // Update deck incrementally - use Set for O(1) lookups
            const currentMovies = useStore.getState().movies;
            const currentIds = new Set(currentMovies.map(m => m.id));
            
            if (currentMovies.length === 0 && filtered.length > 0) {
              useStore.getState().loadMovies(filtered);
            } else if (filtered.length > currentMovies.length) {
              const newMovies = filtered.filter(m => !currentIds.has(m.id));
              if (newMovies.length > 0) {
                useStore.getState().appendMovies(newMovies);
              }
            }
            
            // On final completion, do full refresh
            if (isComplete) {
              const finalFiltered = filterMovies(accumulatedMovies, langRelaxed, seed);
              useStore.getState().loadMovies(finalFiltered);
            }
          };
          let fetchedMovies: Movie[] = [];
          try {
            fetchedMovies = await fetchFilteredMovies({
              genres: prefsToUse.genres,
              ottPlatforms: prefsToUse.ottPlatforms,
              languages: prefsToUse.languages,
              adultContent: prefsToUse.adultContent,
              highRatedOnly: prefsToUse.highRatedOnly,
              releaseYear: prefsToUse.releaseYear as any,
              imdbTop250Movies: prefsToUse.imdbTop250Movies,
              moodIncludeGenres: prefsToUse.moodIncludeGenres,
              moodExcludeGenres: prefsToUse.moodExcludeGenres,
            }, onProgress);
          } catch (error: any) {
            // Don't show error for IMDb Top 250 - it will fall back to regular movies
            // Just log it and continue
            if (error?.message === 'IMDB_TOP250_EMPTY') {
              console.warn('⚠️ IMDb Top 250 query returned empty, using fallback movies');
              // Don't set error or return - let it fall through to regular fetching
            } else {
              // Re-throw other errors to be caught by outer catch
              throw error;
            }
          }
          console.log('📥 Fetched movies:', fetchedMovies?.length || 0);
          
          // Ensure fetchedMovies is an array
          if (!Array.isArray(fetchedMovies)) {
            console.error('❌ fetchedMovies is not an array:', typeof fetchedMovies, fetchedMovies);
            fetchedMovies = [];
          }
          
          // If IMDb Top 250 is selected and we got 0 movies, show helpful error
          if (prefsToUse.imdbTop250Movies && fetchedMovies.length === 0) {
            console.warn('⚠️ IMDb Top 250 returned 0 movies from Supabase');
            setLoadError('🎞 IMDb Top 250 database is not available. The Supabase table needs to be populated. Check the console for details. See SETUP_IMDB_TABLE.md for setup instructions.');
            loadMovies([]);
            setIsLoadingMovies(false);
            return;
          }
          
          console.log('🎲 Using seed:', seed);
          console.log('🎥 First 5 movies BEFORE shuffle:', fetchedMovies.slice(0, 5).map(m => m.title));
          console.log('🎥 First 5 movie IDs BEFORE shuffle:', fetchedMovies.slice(0, 5).map(m => m.id));
          
          // Only relax genres/OTT if user didn't select them
          const relaxedFinal = (prefsToUse.languages && prefsToUse.languages.length > 0 &&
                                (prefsToUse.genres?.length ?? 0) === 0 &&
                                (prefsToUse.ottPlatforms?.length ?? 0) === 0)
            ? { ...prefsToUse, genres: [], ottPlatforms: [] } as any
            : prefsToUse;
          let filtered = filterMovies(fetchedMovies, relaxedFinal, seed);
          if (prefsToUse.languages?.length > 0 &&
              (prefsToUse.genres?.length ?? 0) === 0 &&
              (prefsToUse.ottPlatforms?.length ?? 0) === 0 &&
              filtered.length < 20) {
            filtered = filterMovies(fetchedMovies, {
              ...prefsToUse,
              genres: [],
              ottPlatforms: []
            }, seed);
          }
          console.log('🎯 Filtered/shuffled movies:', filtered.length);
          console.log('🎥 First 5 movies AFTER shuffle:', filtered.slice(0, 5).map(m => m.title));
          console.log('🎥 First 5 movie IDs AFTER shuffle:', filtered.slice(0, 5).map(m => m.id));
          
          // Note: Deck saving is now handled automatically by the useEffect hook above
          // This ensures the deck is saved regardless of which loading path was used
          
          // CRITICAL: For dual mode, only load movies if combinedPreferences are ready
          // Otherwise, we'd show the wrong movies (e.g., all movies instead of filtered by language)
          if (session?.mode === 'dual') {
            const hasCombinedPrefs = session.combinedPreferences && 
                                    session.creatorPreferences && 
                                    session.joinerPreferences;
            
            if (!hasCombinedPrefs) {
              console.warn('⚠️ DUAL MODE: Not loading movies yet - combinedPreferences not ready');
              console.warn('   This prevents showing wrong movies (e.g., all movies instead of filtered)');
              console.warn('   Creator prefs:', session.creatorPreferences);
              console.warn('   Joiner prefs:', session.joinerPreferences);
              setLoadError('🎞 Waiting for both users to set preferences. Please ensure both users have completed their preferences.');
              loadMovies([]);
              setIsLoadingMovies(false);
              return;
            }
          }
          
          console.log('📋 Loading movies into state - Final movie list:');
          console.log('   Total:', filtered.length);
          console.log('   First 5 titles:', filtered.slice(0, 5).map(m => m.title));
          console.log('   First 5 IDs:', filtered.slice(0, 5).map(m => m.id));
          if (filtered.length === 0) {
            console.warn('No movies available after fetch/filter (dual/single unified). Showing error.');
            setLoadError('No movies available right now. Please try again in a moment.');
            loadMovies([]);
          } else {
            loadMovies(filtered);
          }
        } catch (error) {
          console.error('❌ Error loading movies:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to load movies. Please check your connection and try again.';
          setLoadError(errorMessage);
          loadMovies([]);
        } finally {
          setIsLoadingMovies(false);
        }
      };
      
      loadMoviesAsync();
    }
  }, [currentScreen, preferences, loadMovies, session, isLoadingMovies, movies.length]);

  // Update elapsed time periodically when loading to trigger re-render and check 10-second condition
  useEffect(() => {
    if (currentScreen === 'swipe' && loadingStartTime.current) {
      const interval = setInterval(() => {
        // Check current movies length from store (fresh value)
        const currentMoviesCount = useStore.getState().movies.length;
        if (currentMoviesCount >= 7) {
          clearInterval(interval);
          return;
        }
        const elapsed = loadingStartTime.current ? Date.now() - loadingStartTime.current : 0;
        setLoadingElapsed(elapsed);
      }, 100); // Check every 100ms for responsive updates
      return () => clearInterval(interval);
    }
    // Always return cleanup function (even if condition is false)
    return () => {};
  }, [currentScreen, movies.length]); // Include movies.length for consistency

  // Render current screen
  switch (currentScreen) {
    case 'home':
      return <HomeScreen />;
    case 'preferences':
      return <PreferencesScreen />;
    case 'mode':
      return <ModeSelectionScreen />;
    case 'session':
      return <SessionScreen />;
    case 'ready':
      return <ReadyScreen />;
    case 'loading':
      return <LoadingScreen />;
    case 'swipe':
      // Show error screen if loading failed
      if (loadError && !isLoadingMovies && movies.length === 0) {
        return (
          <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-6">🎞</div>
              <p className="text-white text-2xl font-light mb-3">404: Plot not found.</p>
              <p className="text-gray-400 text-base mb-8 font-light">Our servers took a coffee break.</p>
              <button
                onClick={() => {
                  setLoadError(null);
                  hasLoadedMovies.current = false;
                  setIsLoadingMovies(true);
                }}
                className="bg-red-600 text-white font-light py-3 px-8 rounded-full hover:bg-red-700 transition-all text-base"
              >
                Try Again
              </button>
              <button
                onClick={() => setCurrentScreen('mode')}
                className="mt-4 text-gray-400 hover:text-white transition-colors text-sm font-light"
              >
                ← Back to Home
              </button>
            </div>
          </div>
        );
      }
      
      // Show loading screen for minimum 5 seconds, or until we have at least 7 movies OR 10 seconds have passed
      const timeSinceStart = loadingStartTime.current ? Date.now() - loadingStartTime.current : 0;
      const timeSinceMinimumStart = minimumLoadingStartTime.current ? Date.now() - minimumLoadingStartTime.current : 0;
      const hasEnoughMovies = movies.length >= 7;
      const hasWaitedLongEnough = timeSinceStart >= 10000; // 10 seconds max wait
      const hasMetMinimumTime = timeSinceMinimumStart >= 5000; // 5 seconds minimum
      const shouldShowLoading = !hasMetMinimumTime || isLoadingMovies || (!hasEnoughMovies && !hasWaitedLongEnough);
      
      // Log condition for debugging (dev only)
      if (process.env.NODE_ENV === 'development' && !shouldShowLoading && movies.length < 7) {
        console.log(`Deck loaded: ${movies.length} movies after ${Math.round(timeSinceStart / 1000)}s`);
      }
      
      if (shouldShowLoading) {
        return (
          <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden film-grain">
            {/* Deep black background with soft radial red glow */}
            <div 
              className="fixed inset-0 pointer-events-none z-0" 
              style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.08) 0%, rgba(10, 10, 10, 0.95) 40%, #000000 100%)',
              }}
            />
            
            {/* Gentle red pulse emanating from behind spinner */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-red-pulse pointer-events-none z-0"
              style={{
                width: '200px',
                height: '200px',
                background: 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)',
              }}
            />
            
            <div className="text-center max-w-2xl w-full relative z-10 px-4">
              {/* Film Reel Ring Animation - Center */}
              <div className="flex justify-center mb-16">
                <div className="relative">
                  {/* Outer rotating ring - film reel style */}
                  <div 
                    className="animate-film-reel rounded-full border-2"
                    style={{
                      width: '100px',
                      height: '100px',
                      borderColor: '#ef4444',
                      borderTopColor: '#ef4444',
                      borderRightColor: 'rgba(239, 68, 68, 0.4)',
                      borderBottomColor: 'rgba(239, 68, 68, 0.2)',
                      borderLeftColor: 'rgba(239, 68, 68, 0.4)',
                    }}
                  />
                  {/* Inner glow ring */}
                  <div 
                    className="absolute inset-0 rounded-full animate-inner-glow pointer-events-none"
                    style={{
                      width: '100px',
                      height: '100px',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                  />
                  {/* Heartbeat pulse effect */}
                  <div 
                    className="absolute inset-0 rounded-full animate-heartbeat pointer-events-none"
                    style={{
                      width: '100px',
                      height: '100px',
                      background: 'radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 70%)',
                    }}
                  />
                </div>
              </div>
              
              {/* Main Quote - with shimmer effect */}
              <div className="mb-6">
                <p 
                  className="text-2xl sm:text-3xl md:text-4xl font-light text-white leading-relaxed animate-text-shimmer"
                  style={{ 
                    textShadow: '0 0 20px rgba(255, 255, 255, 0.1), 0 2px 8px rgba(0, 0, 0, 0.8)',
                    letterSpacing: '0.05em',
                    fontWeight: 300,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                >
                  {loadingQuote}
                </p>
              </div>
              
              {/* Secondary Commentary - rotating with fade */}
              <div className="h-8 flex items-center justify-center">
                <p 
                  key={secondaryCommentaryIndex}
                  className="text-sm sm:text-base text-gray-400 italic animate-text-fade"
                  style={{
                    letterSpacing: '0.03em',
                    fontWeight: 300,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                >
                  {secondaryCommentaries[secondaryCommentaryIndex]}
                </p>
              </div>
            </div>
          </div>
        );
      }
      return <SwipeDeck />;
    case 'shortlist':
      return <ShortlistScreen />;
    default:
      return <HomeScreen />;
  }
}
