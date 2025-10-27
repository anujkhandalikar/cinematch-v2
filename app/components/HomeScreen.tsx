'use client';

import { useStore } from '@/lib/store';

export default function HomeScreen() {
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md w-full">
        {/* Logo/Icon */}
        <div className="mb-6">
          <div className="text-6xl">🎬</div>
        </div>

        {/* Title */}
        <h1 className="text-5xl sm:text-6xl font-bold text-white mb-2">
          Cinematch
        </h1>

        {/* Tagline */}
        <p className="text-lg sm:text-xl text-white italic mb-8">
          Swipe. Match. Watch.
        </p>

        {/* Description */}
        <p className="text-sm text-white mb-8">
          find your next watch, in minutes
        </p>

        {/* CTA Button */}
        <button
          onClick={() => setCurrentScreen('preferences')}
          className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-red-700 active:bg-red-800 transition-all touch-manipulation mb-6"
        >
          Start
        </button>

        {/* Footer */}
        <div className="text-xs text-gray-400">
          <p>Powered by TMDB — Your gateway to the world's cinema.</p>
        </div>
      </div>
    </div>
  );
}
