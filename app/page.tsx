'use client';

import { useEffect, useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import { fetchFilteredMovies, filterMovies } from '@/lib/movies';
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
  const preferences = useStore((state) => state.preferences);
  const loadMovies = useStore((state) => state.loadMovies);
  const session = useStore((state) => state.session);
  const movies = useStore((state) => state.movies);
  const [isLoadingMovies, setIsLoadingMovies] = useState(false);
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
    }
  }, [currentScreen]);

  // Load movies when session starts (simplified to prevent infinite loops)
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
            const movies = await fetchFilteredMovies(preferences);
            console.log('📥 Fetched movies:', movies.length);
            
            const filtered = filterMovies(movies, preferences, seed);
            console.log('🎯 Filtered/shuffled movies:', filtered.length);
            console.log('📋 Loading movies into state');
            loadMovies(filtered);
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
          
          // Fetch movies from TMDB with preferences
          console.log('🔍 Fetching movies from TMDB...');
          const movies = await fetchFilteredMovies(prefsToUse);
          console.log('📥 Fetched movies:', movies.length);
          console.log('🎲 Using seed:', seed);
          console.log('🎥 First 5 movies BEFORE shuffle:', movies.slice(0, 5).map(m => m.title));
          console.log('🎥 First 5 movie IDs BEFORE shuffle:', movies.slice(0, 5).map(m => m.id));
          
          const filtered = filterMovies(movies, prefsToUse, seed);
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
          loadMovies(filtered);
        } catch (error) {
          console.error('Error loading movies:', error);
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
      // Show loading screen if movies are loading or empty
      if (isLoadingMovies || movies.length === 0) {
        return (
          <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white text-xl">Loading movies...</p>
              <p className="text-gray-400 text-sm mt-2">This may take a moment...</p>
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
