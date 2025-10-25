'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { fetchFilteredMovies, filterMovies } from '@/lib/movies';
import HomeScreen from './components/HomeScreen';
import PreferencesScreen from './components/PreferencesScreen';
import ModeSelectionScreen from './components/ModeSelectionScreen';
import SessionScreen from './components/SessionScreen';
import ReadyScreen from './components/ReadyScreen';
import SwipeDeck from './components/SwipeDeck';
import ShortlistScreen from './components/ShortlistScreen';

export default function Home() {
  const currentScreen = useStore((state) => state.currentScreen);
  const preferences = useStore((state) => state.preferences);
  const loadMovies = useStore((state) => state.loadMovies);
  const session = useStore((state) => state.session);
  const movies = useStore((state) => state.movies);

  // Debug logging
  console.log('Current screen:', currentScreen);
  console.log('Movies state:', movies?.length || 0);
  console.log('Session:', session);

  // Load movies when session starts
  useEffect(() => {
    if (currentScreen === 'swipe') {
      const loadMoviesAsync = async () => {
        try {
          console.log('Loading movies for screen:', currentScreen);
          console.log('Session:', session);
          console.log('Preferences:', preferences);
          
          // Use combined preferences for dual mode, or individual preferences for single mode
          const prefsToUse = session?.mode === 'dual' && session?.combinedPreferences 
            ? session.combinedPreferences 
            : preferences;
          
          console.log('Using preferences:', prefsToUse);
          
          // Fetch movies from TMDB with preferences
          const movies = await fetchFilteredMovies(prefsToUse);
          
          // Use seed for dual mode to ensure same movie sequence, or random for single mode
          const seed = session?.seed || Math.random();
          const filtered = filterMovies(movies, prefsToUse, seed);
          loadMovies(filtered);
        } catch (error) {
          console.error('Error loading movies:', error);
          // Fallback to empty array if fetch fails
          loadMovies([]);
        }
      };
      
      // Add a timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        console.log('Movie loading timeout - setting empty array');
        loadMovies([]);
      }, 10000); // 10 second timeout
      
      loadMoviesAsync().finally(() => {
        clearTimeout(timeout);
      });
    }
  }, [currentScreen, session, preferences, loadMovies]);

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
    case 'swipe':
      // Only render SwipeDeck if movies are loaded
      if (!movies || movies.length === 0) {
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
