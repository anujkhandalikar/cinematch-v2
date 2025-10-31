'use client';

import { useEffect, useState, useRef } from 'react';
import { useStore, Movie } from '@/lib/store';
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
  const hasLoadedMovies = useRef(false);

  // Debug logging
  console.log('Current screen:', currentScreen);
  console.log('Movies state:', movies?.length || 0);
  console.log('Session:', session);

  // Reset flag when screen changes away from swipe
  useEffect(() => {
    if (currentScreen !== 'swipe') {
      hasLoadedMovies.current = false;
      setIsLoadingMovies(false);
      setLoadError(null);
    }
  }, [currentScreen]);

  // Load movies when the swipe screen becomes active
  // We gate the effect to run once per visit to the swipe screen to
  // avoid duplicate fetches or race conditions.
  useEffect(() => {
    // Only load if: on swipe screen, not already loading, haven't loaded yet, and no movies exist
    const shouldLoad = currentScreen === 'swipe' && !isLoadingMovies && !hasLoadedMovies.current && movies.length === 0;
    
    if (shouldLoad) {
      hasLoadedMovies.current = true; // Prevent re-runs
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
            // Instant local deck to avoid spinner while TMDB loads
            const instant = getCachedMovies({
              genres: preferences.genres,
              ottPlatforms: preferences.ottPlatforms,
              adultContent: preferences.adultContent,
              releaseYear: preferences.releaseYear as any,
            });
            if (instant.length > 0 && movies.length === 0) {
              console.log('⚡ Showing instant local deck');
              let instantFiltered = filterMovies(instant, preferences, seed);
              // If filters are too strict (e.g., rare genre AND), show unfiltered instant deck first
              if (instantFiltered.length === 0) {
                const relaxedPrefs = { ...preferences, genres: [], ottPlatforms: [] } as any;
                instantFiltered = filterMovies(instant, relaxedPrefs, seed).slice(0, 60);
                console.log('⚡ Using relaxed instant deck for perceived speed');
              }
              loadMovies(instantFiltered);
            }
            // If only language is selected (no genres/platforms), fetch fast seed (3 pages) for instant load
            if ((preferences.languages?.length ?? 0) > 0 &&
                (preferences.genres?.length ?? 0) === 0 &&
                (preferences.ottPlatforms?.length ?? 0) === 0) {
              const languageCodes: Record<string,string> = { English: 'en', Hindi: 'hi', Tamil: 'ta', Telugu: 'te', Malayalam: 'ml', Bengali: 'bn' };
              // Fast seed: just 3 pages for instant load (<400ms)
              const seeds = await Promise.all(
                preferences.languages
                  .map(l => languageCodes[l as any])
                  .filter(Boolean)
                  .map(code => fetchLanguageSeed(code as string, 3, !!preferences.adultContent))
              );
              const seedMovies = seeds.flat();
              const filteredSeed = filterMovies(seedMovies, { ...preferences, genres: [], ottPlatforms: [], releaseYear: undefined } as any, seed);
              console.log('🎯 Fast language seed size:', filteredSeed.length);
              loadMovies(filteredSeed);
              setIsLoadingMovies(false);
              // Start background streaming for more movies (non-blocking)
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              (async () => {
                const moreSeeds = await Promise.all(
                  preferences.languages
                    .map(l => languageCodes[l as any])
                    .filter(Boolean)
                    .map(code => fetchLanguageSeed(code as string, 47, !!preferences.adultContent)) // Remaining 47 pages
                );
                const moreMovies = moreSeeds.flat();
                const filteredMore = filterMovies(moreMovies, { ...preferences, genres: [], ottPlatforms: [], releaseYear: undefined } as any, seed);
                const appendMoviesFn = useStore.getState().appendMovies;
                const newMovies = filteredMore.filter(m => !filteredSeed.some(existing => existing.id === m.id));
                if (newMovies.length > 0) {
                  appendMoviesFn(newMovies);
                }
              })();
              return;
            }
            // Convert preferences to match fetchFilteredMovies signature
            let accumulatedMovies: Movie[] = [];
            const onProgress = (m: any[], isComplete: boolean) => {
              // Accumulate all movies from stream
              accumulatedMovies = [...accumulatedMovies, ...m];
              // Deduplicate
              const unique = accumulatedMovies.filter((movie, index, self) => 
                index === self.findIndex(m => m.id === movie.id)
              );
              
              // Apply filters
              const langRelaxed = (preferences.languages && preferences.languages.length > 0)
                ? { ...preferences, genres: [], ottPlatforms: [], releaseYear: undefined } as any
                : preferences;
              const filtered = filterMovies(unique, langRelaxed, seed);
              
              // Update deck incrementally: load initial, append after
              const appendMoviesFn = useStore.getState().appendMovies;
              const currentMovies = useStore.getState().movies;
              if (currentMovies.length === 0 && filtered.length > 0) {
                // Initial load
                const loadMoviesFn = useStore.getState().loadMovies;
                loadMoviesFn(filtered);
              } else if (filtered.length > currentMovies.length) {
                // Append new movies
                const newMovies = filtered.filter(m => !currentMovies.some(existing => existing.id === m.id));
                if (newMovies.length > 0) {
                  appendMoviesFn(newMovies);
                }
              }
              
              // On final completion, do a full refresh to ensure all filters are applied correctly
              if (isComplete) {
                const finalFiltered = filterMovies(unique, langRelaxed, seed);
                const loadMoviesFn = useStore.getState().loadMovies;
                loadMoviesFn(finalFiltered);
              }
            };
            const fetchedMovies = await fetchFilteredMovies({
              genres: preferences.genres,
              ottPlatforms: preferences.ottPlatforms,
              adultContent: preferences.adultContent,
              languages: preferences.languages,
              highRatedOnly: preferences.highRatedOnly,
            }, onProgress);
            console.log('📥 Fetched movies:', fetchedMovies.length);
            
            let filtered = filterMovies(fetchedMovies, preferences, seed);
            // Hard fallback: if only language is selected and results are tiny,
            // keep language-only list to maximize deck size.
            if (preferences.languages?.length > 0 &&
                (preferences.genres?.length ?? 0) === 0 &&
                (preferences.ottPlatforms?.length ?? 0) === 0 &&
                filtered.length < 20) {
              filtered = fetchedMovies.filter(m =>
                preferences.languages.includes(
                  convertTMDBToLanguages((m as any).original_language || 'en') as any
                )
              );
            }
            if (preferences.languages && preferences.languages.length > 0 && filtered.length < 20) {
              const relaxed = { ...preferences, genres: [], ottPlatforms: [], releaseYear: undefined } as any;
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
          if (session?.mode === 'dual' && session?.supabaseSession) {
            console.log('🎬 DUAL MODE: Checking for existing movie deck in Supabase...');
            console.log('User is creator:', session.isCreator);
            console.log('Session code:', session.code);
            
            // Joiners should wait for the creator to create the deck
            if (!session.isCreator) {
              console.log('👤 JOINER: Waiting for creator to create movie deck...');
              let attempts = 0;
              const maxAttempts = 30; // 30 attempts with 1 second delay = 30 seconds max wait
              
              while (attempts < maxAttempts) {
                const dbSession = await sessionService.getSessionByCode(session.code!);
                
                if (dbSession.movie_deck && dbSession.movie_deck.length > 0) {
                  console.log('✅ JOINER: Creator created deck! Loading movie deck from Supabase');
                  console.log('📊 Deck size:', dbSession.movie_deck.length, 'movies');
                  console.log('🎥 First 5 movies:', dbSession.movie_deck.slice(0, 5).map((m: any) => ({ title: m.title, id: m.id })));
                  console.log('🎥 First 5 movie IDs:', dbSession.movie_deck.slice(0, 5).map((m: any) => m.id));
                  loadMovies(dbSession.movie_deck);
                  setIsLoadingMovies(false);
                  return;
                }
                
                console.log(`⏳ Joiner: Waiting for deck (attempt ${attempts + 1}/${maxAttempts})...`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                attempts++;
              }
              
              console.error('❌ Joiner: Timeout waiting for creator to create deck');
              loadMovies([]); // Load empty array to show error
              setIsLoadingMovies(false);
              return;
            } else {
              // Creator: Check if deck exists
              console.log('👑 CREATOR: Checking for existing deck...');
              const dbSession = await sessionService.getSessionByCode(session.code!);
              
              if (dbSession.movie_deck && dbSession.movie_deck.length > 0) {
                console.log('✅ CREATOR: Deck already exists! Loading from Supabase');
                console.log('📊 Deck size:', dbSession.movie_deck.length, 'movies');
                console.log('🎥 First 5 movies:', dbSession.movie_deck.slice(0, 5).map((m: any) => ({ title: m.title, id: m.id })));
                console.log('🎥 First 5 movie IDs:', dbSession.movie_deck.slice(0, 5).map((m: any) => m.id));
                loadMovies(dbSession.movie_deck);
                setIsLoadingMovies(false);
                return;
              }
              console.log('👑 CREATOR: No existing deck found, will create new one');
            }
          }
          
          // Use combined preferences for dual mode, or individual preferences for single mode
          const prefsToUse = session?.mode === 'dual' && session?.combinedPreferences 
            ? session.combinedPreferences 
            : preferences;
          
          console.log('Prefs to use:', prefsToUse);
          // Instant local deck for dual/single unified path
          const instant = getCachedMovies({
            genres: prefsToUse.genres,
            ottPlatforms: prefsToUse.ottPlatforms,
            adultContent: prefsToUse.adultContent,
            releaseYear: prefsToUse.releaseYear as any,
          });
          if (instant.length > 0 && movies.length === 0) {
            console.log('⚡ Showing instant local deck (unified path)');
            let instantFiltered = filterMovies(instant, prefsToUse, seed);
            if (instantFiltered.length === 0) {
              const relaxedPrefs = { ...prefsToUse, genres: [], ottPlatforms: [] } as any;
              instantFiltered = filterMovies(instant, relaxedPrefs, seed).slice(0, 60);
              console.log('⚡ Using relaxed instant deck (unified) for perceived speed');
            }
            loadMovies(instantFiltered);
          }
          
          // Hard language-only path for dual/unified - fast seed first
          if ((prefsToUse.languages?.length ?? 0) > 0 &&
              (prefsToUse.genres?.length ?? 0) === 0 &&
              (prefsToUse.ottPlatforms?.length ?? 0) === 0) {
            const languageCodes: Record<string,string> = { English: 'en', Hindi: 'hi', Tamil: 'ta', Telugu: 'te', Malayalam: 'ml', Bengali: 'bn' };
            // Fast seed: 3 pages for instant load
            const seeds = await Promise.all(
              prefsToUse.languages
                .map(l => languageCodes[l as any])
                .filter(Boolean)
                .map(code => fetchLanguageSeed(code as string, 3, !!prefsToUse.adultContent))
            );
            const seedMovies = seeds.flat();
            const filteredSeed = filterMovies(seedMovies, { ...prefsToUse, genres: [], ottPlatforms: [], releaseYear: undefined } as any, seed);
            loadMovies(filteredSeed);
            setIsLoadingMovies(false);
            // Background: fetch remaining pages (non-blocking)
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            (async () => {
              const moreSeeds = await Promise.all(
                prefsToUse.languages
                  .map(l => languageCodes[l as any])
                  .filter(Boolean)
                  .map(code => fetchLanguageSeed(code as string, 47, !!prefsToUse.adultContent))
              );
              const moreMovies = moreSeeds.flat();
              const filteredMore = filterMovies(moreMovies, { ...prefsToUse, genres: [], ottPlatforms: [], releaseYear: undefined } as any, seed);
              const appendMoviesFn = useStore.getState().appendMovies;
              const newMovies = filteredMore.filter(m => !filteredSeed.some(existing => existing.id === m.id));
              if (newMovies.length > 0) {
                appendMoviesFn(newMovies);
              }
            })();
            return;
          }

          // Fetch movies from TMDB with preferences
          console.log('🔍 Fetching movies from TMDB...');
          // Convert preferences to match fetchFilteredMovies signature
          let accumulatedMovies: Movie[] = [];
          const onProgress = (m: any[], isComplete: boolean) => {
            // Accumulate all movies from stream
            accumulatedMovies = [...accumulatedMovies, ...m];
            // Deduplicate
            const unique = accumulatedMovies.filter((movie, index, self) => 
              index === self.findIndex(m => m.id === movie.id)
            );
            
            // Apply filters
            const langRelaxed = (prefsToUse.languages && prefsToUse.languages.length > 0)
              ? { ...prefsToUse, genres: [], ottPlatforms: [], releaseYear: undefined } as any
              : prefsToUse;
            const filtered = filterMovies(unique, langRelaxed, seed);
            
            // Update deck incrementally
            const appendMoviesFn = useStore.getState().appendMovies;
            const currentMovies = useStore.getState().movies;
            if (currentMovies.length === 0 && filtered.length > 0) {
              const loadMoviesFn = useStore.getState().loadMovies;
              loadMoviesFn(filtered);
            } else if (filtered.length > currentMovies.length) {
              const newMovies = filtered.filter(m => !currentMovies.some(existing => existing.id === m.id));
              if (newMovies.length > 0) {
                appendMoviesFn(newMovies);
              }
            }
            
            // On final completion, do full refresh
            if (isComplete) {
              const finalFiltered = filterMovies(unique, langRelaxed, seed);
              const loadMoviesFn = useStore.getState().loadMovies;
              loadMoviesFn(finalFiltered);
            }
          };
          const fetchedMovies = await fetchFilteredMovies({
            genres: prefsToUse.genres,
            ottPlatforms: prefsToUse.ottPlatforms,
            languages: prefsToUse.languages,
            adultContent: prefsToUse.adultContent,
            highRatedOnly: prefsToUse.highRatedOnly,
          }, onProgress);
          console.log('📥 Fetched movies:', fetchedMovies.length);
          console.log('🎲 Using seed:', seed);
          console.log('🎥 First 5 movies BEFORE shuffle:', fetchedMovies.slice(0, 5).map(m => m.title));
          console.log('🎥 First 5 movie IDs BEFORE shuffle:', fetchedMovies.slice(0, 5).map(m => m.id));
          
          const relaxedFinal = (prefsToUse.languages && prefsToUse.languages.length > 0)
            ? { ...prefsToUse, genres: [], ottPlatforms: [], releaseYear: undefined } as any
            : prefsToUse;
          let filtered = filterMovies(fetchedMovies, relaxedFinal, seed);
          if (prefsToUse.languages?.length > 0 &&
              (prefsToUse.genres?.length ?? 0) === 0 &&
              (prefsToUse.ottPlatforms?.length ?? 0) === 0 &&
              filtered.length < 20) {
            filtered = fetchedMovies.filter(m =>
              prefsToUse.languages.includes(
                convertTMDBToLanguages((m as any).original_language || 'en') as any
              )
            );
          }
          console.log('🎯 Filtered/shuffled movies:', filtered.length);
          console.log('🎥 First 5 movies AFTER shuffle:', filtered.slice(0, 5).map(m => m.title));
          console.log('🎥 First 5 movie IDs AFTER shuffle:', filtered.slice(0, 5).map(m => m.id));
          
          // Save movie deck to Supabase for dual mode (only if creator)
          if (session?.mode === 'dual' && session?.supabaseSession && session?.isCreator) {
            try {
              console.log('💾 CREATOR: Saving movie deck to Supabase...');
              await sessionService.updateSession(session.supabaseSession.id, {
                movie_deck: filtered
              });
              console.log('✅ CREATOR: Movie deck saved to Supabase:', {
                movieCount: filtered.length,
                firstFive: filtered.slice(0, 5).map(m => ({ title: m.title, id: m.id }))
              });
            } catch (err) {
              console.error('❌ CREATOR: Error saving movie deck:', err);
            }
          } else if (session?.mode === 'dual' && session?.supabaseSession && !session?.isCreator) {
            console.log('👤 JOiner: Not saving movie deck, creator will do it');
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
          <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-white text-xl mb-2">Failed to Load Movies</p>
              <p className="text-gray-400 text-sm mb-6">{loadError}</p>
              <button
                onClick={() => {
                  setLoadError(null);
                  hasLoadedMovies.current = false;
                  setIsLoadingMovies(true);
                }}
                className="bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition-all"
              >
                Try Again
              </button>
              <button
                onClick={() => setCurrentScreen('mode')}
                className="mt-4 text-gray-400 hover:text-white transition-colors text-sm"
              >
                ← Back to Home
              </button>
            </div>
          </div>
        );
      }
      
      // Show loading screen if movies are loading or empty
      if (isLoadingMovies || movies.length === 0) {
        return (
          <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white text-xl">Loading movies...</p>
              <p className="text-gray-400 text-sm mt-2">This may take a moment...</p>
              {loadError && <p className="text-red-400 text-xs mt-4">{loadError}</p>}
            </div>
          </div>
        );
      }
      return (
        <div className="relative">
          <div className="fixed top-2 left-2 z-50 bg-black/70 text-white text-xs px-2 py-1 rounded">
            Deck: {movies.length} • Index: {currentMovieIndex}
          </div>
          <SwipeDeck />
        </div>
      );
    case 'shortlist':
      return <ShortlistScreen />;
    default:
      return <HomeScreen />;
  }
}
