'use client';

import { useState, useEffect } from 'react';
import { useStore, UserPreferences } from '@/lib/store';
import { fetchFilteredMovies } from '@/lib/movies';

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

export default function LoadingScreen() {
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);
  const session = useStore((state) => state.session);
  const setMovies = useStore((state) => state.setMovies);
  const [progress, setProgress] = useState(0);
  const [selectedQuote] = useState(() => LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)]);

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
          moodIncludeGenres: base?.moodIncludeGenres ?? [],
          moodExcludeGenres: base?.moodExcludeGenres ?? [],
        };

        setProgress(20);

        // Load movies with progress updates
        const movies = await fetchFilteredMovies(preferences, (movies, isComplete) => {
          const progressValue = isComplete ? 100 : Math.min(90, 20 + (movies.length / 50) * 70);
          setProgress(progressValue);
        });

        setProgress(100);
        
        // Small delay to show completion
        setTimeout(() => {
          setCurrentScreen('swipe');
        }, 500);

      } catch (error) {
        console.error('Error loading movies:', error);
        // Still proceed to swipe screen
        setTimeout(() => {
          setCurrentScreen('swipe');
        }, 1000);
      }
    };

    loadMovies();
  }, [session, setMovies, setCurrentScreen]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative">
      {/* Subtle gradient background */}
      <div 
        className="fixed inset-0 pointer-events-none z-0" 
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(239, 68, 68, 0.03) 0%, transparent 50%)',
        }}
      />
      
      <div className="text-center max-w-2xl w-full relative z-10">
        {/* Random Quote - Prominently displayed */}
        <div className="mb-16">
          <p 
            className="text-3xl sm:text-4xl md:text-5xl font-light text-white leading-relaxed px-4"
            style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.1)' }}
          >
            {selectedQuote}
          </p>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full max-w-md mx-auto bg-[#1a1a1a] rounded-full h-2 mb-8 overflow-hidden">
          <div 
            className="bg-red-600 h-2 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(239,68,68,0.4)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Loading Animation */}
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </div>
    </div>
  );
}
