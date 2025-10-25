'use client';

import { useStore } from '@/lib/store';

export default function HomeScreen() {
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        {/* Logo/Title */}
        <div className="mb-8">
          <h1 className="text-6xl sm:text-8xl font-bold text-white mb-4">
            🎬
          </h1>
          <h2 className="text-4xl sm:text-6xl font-bold text-white mb-4">
            Cinematch
          </h2>
          <p className="text-xl sm:text-2xl text-red-200">
            Find your perfect movie match
          </p>
        </div>

        {/* Description */}
        <div className="mb-12">
          <p className="text-lg sm:text-xl text-gray-300 mb-6">
            Swipe through thousands of movies and discover your next favorite film. 
            Match with friends or go solo - the choice is yours!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-red-500">🎯</span>
              <span>Personalized recommendations</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-500">👥</span>
              <span>Dual mode with friends</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-500">📱</span>
              <span>Mobile-first design</span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => setCurrentScreen('preferences')}
          className="bg-red-600 text-white font-bold py-4 px-8 rounded-full text-xl hover:bg-red-700 active:bg-red-800 transition-all touch-manipulation shadow-2xl"
        >
          Start Matching →
        </button>

        {/* Footer */}
        <div className="mt-12 text-sm text-gray-500">
          <p>Powered by TMDB • Thousands of movies and TV shows</p>
        </div>
      </div>
    </div>
  );
}
