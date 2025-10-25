'use client';

import { useStore } from '@/lib/store';
import { getOTTLink } from '@/lib/movies';

export default function ShortlistScreen() {
  const likedMovies = useStore((state) => state.likedMovies);
  const session = useStore((state) => state.session);
  const resetState = useStore((state) => state.resetState);

  const handleStartOver = () => {
    resetState();
  };

  // Show mutual likes in dual mode, otherwise show user's likes
  // If mutualLikes exists, show all accumulated mutual matches
  const displayMovies = session?.mode === 'dual' && session?.mutualLikes 
    ? session.mutualLikes
    : likedMovies.slice(0, 3);
  
  const hasMutualLikes = session?.mode === 'dual' && session?.mutualLikes && session.mutualLikes.length > 0;

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            {session?.mode === 'dual' ? 'Your Mutual Match' : 'Your Shortlist'}
          </h1>
          <p className="text-red-200 text-sm sm:text-base">
            {session?.mode === 'dual' 
              ? (hasMutualLikes ? 'Movies you both liked! 🎉' : 'No mutual matches yet — keep swiping!')
              : "Time's up — your shortlist awaits"}
          </p>
        </div>

        {/* Movies List */}
        <div className="space-y-3 mb-6 sm:mb-8">
          {displayMovies.filter(movie => movie && movie.id).map((movie, index) => (
            <div
              key={`${movie.id}-${index}`}
              className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-[#E50914] font-bold text-xl w-8">
                    #{index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white mb-1">{movie.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>{movie.year}</span>
                      <span>•</span>
                      <span className="text-yellow-400">⭐ {movie.rating}</span>
                    </div>
                  </div>
                </div>
                <a
                  href={getOTTLink(movie)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#E50914] text-white px-4 py-2 rounded-lg hover:bg-[#f40612] transition-all text-sm font-semibold whitespace-nowrap"
                >
                  Watch →
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 sm:gap-4 justify-center">
          <button
            onClick={handleStartOver}
            className="bg-white text-red-900 font-semibold px-6 sm:px-8 py-2 sm:py-3 rounded-full hover:bg-red-100 active:bg-red-200 transition-all text-sm sm:text-base touch-manipulation"
          >
            Start Over
          </button>
        </div>

        {/* Fun Message */}
        <div className="text-center mt-6 sm:mt-8">
          <p className="text-red-200 text-base sm:text-lg">🎬 Lights, camera, chill! 🎬</p>
        </div>
      </div>
    </div>
  );
}
