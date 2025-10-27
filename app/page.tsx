'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { fetchFilteredMovies, filterMovies } from '@/lib/movies';
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

  // Debug logging
  console.log('Current screen:', currentScreen);
  console.log('Movies state:', movies?.length || 0);
  console.log('Session:', session);

  // Load movies when session starts (simplified to prevent infinite loops)
  useEffect(() => {
    if (currentScreen === 'swipe' && movies.length === 0 && !isLoadingMovies) {
      console.log('=== LOADING MOVIES FOR SWIPE SCREEN ===');
      console.log('Session mode:', session?.mode);
      console.log('Combined preferences:', session?.combinedPreferences);
      console.log('Individual preferences:', preferences);
      console.log('Session seed:', session?.seed);
      
      setIsLoadingMovies(true);
      
      const loadMoviesAsync = async () => {
        try {
          // Use combined preferences for dual mode, or individual preferences for single mode
          const prefsToUse = session?.mode === 'dual' && session?.combinedPreferences 
            ? session.combinedPreferences 
            : preferences;
          
          console.log('Prefs to use:', prefsToUse);
          
          // Fetch movies from TMDB with preferences
          const movies = await fetchFilteredMovies(prefsToUse);
          console.log('Fetched movies:', movies.length);
          
          // Use seed for dual mode to ensure same movie sequence, or random for single mode
          const seed = session?.seed || Math.random();
          console.log('Using seed:', seed);
          
          const filtered = filterMovies(movies, prefsToUse, seed);
          console.log('Filtered movies:', filtered.length);
          console.log('First 5 movies:', filtered.slice(0, 5).map(m => m.title));
          
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
  }, [currentScreen, preferences, loadMovies, session, movies.length, isLoadingMovies]);

  // Reset loading state when screen changes
  useEffect(() => {
    if (currentScreen !== 'swipe') {
      setIsLoadingMovies(false);
    }
  }, [currentScreen]);

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
