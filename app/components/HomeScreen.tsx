'use client';

import { useStore } from '@/lib/store';
import { fetchMovies } from '@/lib/movies';
import { fetchMaximumMovies, fetchPopularMovies } from '@/lib/tmdb';

export default function HomeScreen() {
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);

  const debugMovieData = async () => {
    try {
      console.log('🔍 Fetching movie data for debugging...');
      alert('Fetching movie data... Using fast debug mode (no runtime data).');
      
      // Use fetchPopularMovies for faster debugging (no runtime fetching)
      const movies = await fetchPopularMovies();
      
      console.log('=== MOVIE DATASET DEBUG ===');
      console.log('Total movies:', movies.length);
      
      // Show years available
      const years = [...new Set(movies.map(m => m.year))].sort((a, b) => b - a);
      console.log('Available years (newest to oldest):', years.slice(0, 20));
      
      // Show oldest movies
      const oldestMovies = movies
        .sort((a, b) => a.year - b.year)
        .slice(0, 15);
      console.log('Oldest movies in dataset:');
      oldestMovies.forEach(movie => {
        console.log(`- ${movie.title} (${movie.year})`);
      });
      
      // Show newest movies
      const newestMovies = movies
        .sort((a, b) => b.year - a.year)
        .slice(0, 10);
      console.log('Newest movies in dataset:');
      newestMovies.forEach(movie => {
        console.log(`- ${movie.title} (${movie.year})`);
      });
      
      // Count movies by decade
      const decadeCounts = movies.reduce((acc, movie) => {
        const decade = Math.floor(movie.year / 10) * 10;
        acc[decade] = (acc[decade] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      
      console.log('Movies by decade:');
      Object.entries(decadeCounts)
        .sort(([a], [b]) => parseInt(b) - parseInt(a))
        .forEach(([decade, count]) => {
          console.log(`- ${decade}s: ${count} movies`);
        });
      
      console.log('=== END DEBUG ===');
      
      alert(`Debug complete! Check console for details.\n\nTotal movies: ${movies.length}\nOldest movie: ${oldestMovies[0]?.title} (${oldestMovies[0]?.year})\nNewest movie: ${newestMovies[0]?.title} (${newestMovies[0]?.year})`);
    } catch (error) {
      console.error('Error fetching movies for debug:', error);
      alert(`Error fetching movie data: ${error.message}\n\nCheck console for details.`);
    }
  };

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

        {/* CTA Button */}
        <button
          onClick={() => setCurrentScreen('preferences')}
          className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-red-700 active:bg-red-800 transition-all touch-manipulation flex items-center justify-center gap-2 mb-4"
        >
          Start Matching
          <span>→</span>
        </button>

        {/* Match Options */}
        <p className="text-sm text-white mb-8">
          Match solo • Match with friends
        </p>

        {/* Features List */}
        <div className="flex flex-col gap-3 items-start mb-8">
          <div className="flex items-center gap-2 text-white">
            <span>🎯</span>
            <span>Personalized picks</span>
          </div>
          <div className="flex items-center gap-2 text-white">
            <span>🎭</span>
            <span>Curated for every mood</span>
          </div>
          <div className="flex items-center gap-2 text-white">
            <span>📱</span>
            <span>Built for mobile</span>
          </div>
        </div>

        {/* Debug Button */}
        <button
          onClick={debugMovieData}
          className="w-full bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg text-sm hover:bg-gray-600 transition-all mb-12"
        >
          🔍 Debug Movie Data
        </button>

        {/* Footer */}
        <div className="text-xs text-gray-400">
          <p>Powered by TMDB — Your gateway to the world's cinema.</p>
        </div>
      </div>
    </div>
  );
}
