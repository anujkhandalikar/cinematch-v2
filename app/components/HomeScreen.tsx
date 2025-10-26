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

        {/* Debug Button */}
        <button
          onClick={debugMovieData}
          className="mt-4 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg text-sm hover:bg-gray-500 transition-all"
        >
          🔍 Debug Movie Data
        </button>

        {/* Footer */}
        <div className="mt-12 text-sm text-gray-500">
          <p>Powered by TMDB • Thousands of movies and TV shows</p>
        </div>
      </div>
    </div>
  );
}
