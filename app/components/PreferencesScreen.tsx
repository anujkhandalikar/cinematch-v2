'use client';

import { useState } from 'react';
import { useStore, Genre, OTTPlatform } from '@/lib/store';

const GENRES: Genre[] = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 
  'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'
];

const OTT_PLATFORMS: OTTPlatform[] = [
  'Netflix', 'Prime Video', 'Disney+', 'HBO Max', 'Hulu', 
  'Apple TV+', 'Paramount+', 'Peacock'
];

export default function PreferencesScreen() {
  const preferences = useStore((state) => state.preferences);
  const setPreferences = useStore((state) => state.setPreferences);
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);
  
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>(preferences.genres);
  const [selectedPlatforms, setSelectedPlatforms] = useState<OTTPlatform[]>(preferences.ottPlatforms);
  const [adultContent, setAdultContent] = useState(preferences.adultContent);

  const handleGenreToggle = (genre: Genre) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handlePlatformToggle = (platform: OTTPlatform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleContinue = () => {
    setPreferences({
      genres: selectedGenres,
      ottPlatforms: selectedPlatforms,
      adultContent
    });
    setCurrentScreen('mode');
  };

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Your Preferences
          </h1>
          <p className="text-red-200 text-sm sm:text-base">
            Help us find movies you'll love
          </p>
        </div>

        {/* Genres Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Favorite Genres</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {GENRES.map((genre) => (
              <button
                key={genre}
                onClick={() => handleGenreToggle(genre)}
                className={`p-3 rounded-lg text-sm font-medium transition-all ${
                  selectedGenres.includes(genre)
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* OTT Platforms Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Streaming Platforms</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {OTT_PLATFORMS.map((platform) => (
              <button
                key={platform}
                onClick={() => handlePlatformToggle(platform)}
                className={`p-3 rounded-lg text-sm font-medium transition-all ${
                  selectedPlatforms.includes(platform)
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
        </div>

        {/* Adult Content Toggle */}
        <div className="mb-8">
          <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
            <div>
              <h3 className="text-lg font-semibold text-white">Include Adult Content</h3>
              <p className="text-sm text-gray-400">Show R-rated movies and mature content</p>
            </div>
            <button
              onClick={() => setAdultContent(!adultContent)}
              className={`w-12 h-6 rounded-full transition-all ${
                adultContent ? 'bg-red-600' : 'bg-gray-600'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                adultContent ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <button
            onClick={handleContinue}
            className="bg-red-600 text-white font-bold py-4 px-8 rounded-full text-xl hover:bg-red-700 active:bg-red-800 transition-all touch-manipulation"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
