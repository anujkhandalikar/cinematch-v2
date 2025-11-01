'use client';

import { useState, useEffect } from 'react';
import { useStore, UserPreferences } from '@/lib/store';
import { fetchFilteredMovies } from '@/lib/movies';

export default function LoadingScreen() {
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);
  const session = useStore((state) => state.session);
  const setMovies = useStore((state) => state.setMovies);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing...');

  useEffect(() => {
    const loadMovies = async () => {
      try {
        // Safely narrow to partial preferences and normalize
        const base = (session?.combinedPreferences || session?.creatorPreferences) as Partial<UserPreferences> | undefined;
        const preferences = {
          genres: base?.genres ?? [],
          ottPlatforms: base?.ottPlatforms ?? [],
          languages: base?.languages ?? [],
          adultContent: base?.adultContent ?? false,
          releaseYear: typeof base?.releaseYear === 'number' ? base?.releaseYear : undefined,
          highRatedOnly: base?.highRatedOnly ?? false,
          imdbTop250Movies: base?.imdbTop250Movies ?? false,
        };

        setLoadingText('Loading movies...');
        setProgress(20);

        // Load movies with progress updates
        const movies = await fetchFilteredMovies(preferences, (movies, isComplete) => {
          const progressValue = isComplete ? 100 : Math.min(90, 20 + (movies.length / 50) * 70);
          setProgress(progressValue);
          
          if (isComplete) {
            setLoadingText('Ready to swipe!');
          } else {
            setLoadingText(`Loaded ${movies.length} movies...`);
          }
        });

        setProgress(100);
        setLoadingText('Complete!');
        
        // Small delay to show completion
        setTimeout(() => {
          setCurrentScreen('swipe');
        }, 500);

      } catch (error) {
        console.error('Error loading movies:', error);
        setLoadingText('Error loading movies');
        // Still proceed to swipe screen
        setTimeout(() => {
          setCurrentScreen('swipe');
        }, 1000);
      }
    };

    loadMovies();
  }, [session, setMovies, setCurrentScreen]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold text-white mb-8">Loading Movies...</h1>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
          <div 
            className="bg-red-600 h-3 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Progress Text */}
        <p className="text-gray-300 mb-8">{loadingText}</p>
        
        {/* Loading Animation */}
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
        
        {/* Fun Facts */}
        <div className="mt-8 text-gray-400 text-sm">
          <p>🎬 Finding the perfect movies for you...</p>
          <p>💕 Matching your preferences...</p>
          <p>🚀 Almost ready to swipe!</p>
        </div>
      </div>
    </div>
  );
}
