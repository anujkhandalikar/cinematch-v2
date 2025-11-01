'use client';

import { useState, useEffect } from 'react';
import { useStore, Genre, OTTPlatform, Language } from '@/lib/store';

const GENRES: Genre[] = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 
  'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'
];

const OTT_PLATFORMS: OTTPlatform[] = [
  'Netflix', 'Prime Video', 'Disney+', 'HBO Max', 'Hulu', 
  'Apple TV+', 'Paramount+', 'Peacock'
];

// Language filters removed

export default function PreferencesScreen() {
  const preferences = useStore((state) => state.preferences);
  const setPreferences = useStore((state) => state.setPreferences);
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);
  
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>(preferences.genres);
  const [selectedPlatforms, setSelectedPlatforms] = useState<OTTPlatform[]>(preferences.ottPlatforms);
  const [adultContent, setAdultContent] = useState(preferences.adultContent);
  const [highRatedOnly, setHighRatedOnly] = useState(preferences.highRatedOnly || false);
  const [selectedLanguages, setSelectedLanguages] = useState<Language[]>(preferences.languages || []);
  const [releaseYear, setReleaseYear] = useState<'2025' | '2000s' | 'older' | null>(preferences.releaseYear);
  const [imdbTop250Movies, setImdbTop250Movies] = useState(preferences.imdbTop250Movies || false);
  
  // When IMDb Top 250 Movies is enabled, disable other filters
  const filtersDisabled = imdbTop250Movies;
  
  // When any other filter is selected, disable and turn off IMDb filter
  const hasOtherFilters = selectedGenres.length > 0 || 
                          selectedPlatforms.length > 0 || 
                          selectedLanguages.length > 0 || 
                          releaseYear !== null || 
                          highRatedOnly || 
                          adultContent;
  
  // If other filters are selected, turn off IMDb filter
  useEffect(() => {
    if (hasOtherFilters && imdbTop250Movies) {
      setImdbTop250Movies(false);
    }
  }, [hasOtherFilters, imdbTop250Movies]);

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

  // No-op: languages removed

  const handleContinue = () => {
    // When IMDb Top 250 Movies is enabled, ignore other filters
    const newPreferences = {
      genres: imdbTop250Movies ? [] : selectedGenres,
      ottPlatforms: imdbTop250Movies ? [] : selectedPlatforms,
      languages: imdbTop250Movies ? [] : selectedLanguages,
      adultContent: imdbTop250Movies ? false : adultContent,
      releaseYear: imdbTop250Movies ? null : releaseYear,
      highRatedOnly: imdbTop250Movies ? false : highRatedOnly,
      imdbTop250Movies
    };
    console.log('=== SAVING PREFERENCES ===');
    console.log('Selected release year:', releaseYear);
    console.log('Full preferences being saved:', newPreferences);
    setPreferences(newPreferences);
    const mode = (useStore.getState() as any).selectedMode;
    if (mode === 'single') {
      setCurrentScreen('swipe');
    } else if (mode === 'dual') {
      setCurrentScreen('session');
    } else {
      setCurrentScreen('mode');
    }
  };

  return (
    <>
      {/* Scrollable content */}
      <div className="min-h-screen bg-black pb-32">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          {/* Header */}
          <div className="text-center mb-8 pt-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Your Preferences
            </h1>
            <p className="text-red-200 text-sm sm:text-base">
              Help us find movies you'll love
            </p>
          </div>

          {/* IMDb Top 250 Filter - Moved to top */}
          <div className="mb-8">
            <div className={`flex items-center justify-between p-4 rounded-lg ${
              hasOtherFilters ? 'bg-gray-800 opacity-50' : 'bg-gray-900'
            }`}>
              <div>
                <h3 className={`text-lg font-semibold ${hasOtherFilters ? 'text-gray-500' : 'text-white'}`}>
                  IMDb Top 250 Movies
                </h3>
                <p className={`text-sm ${hasOtherFilters ? 'text-gray-600' : 'text-gray-400'}`}>
                  Show only IMDb Top 250 movies
                </p>
              </div>
              <button
                onClick={() => !hasOtherFilters && setImdbTop250Movies(!imdbTop250Movies)}
                disabled={hasOtherFilters}
                className={`w-12 h-6 rounded-full transition-all ${
                  hasOtherFilters 
                    ? 'bg-gray-700 cursor-not-allowed' 
                    : imdbTop250Movies 
                    ? 'bg-red-600' 
                    : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  imdbTop250Movies ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>

          {/* High Rated Only Toggle */}
          <div className="mb-8">
            <div className={`flex items-center justify-between p-4 rounded-lg ${
              filtersDisabled ? 'bg-gray-800 opacity-50' : 'bg-gray-900'
            }`}>
              <div>
                <h3 className={`text-lg font-semibold ${filtersDisabled ? 'text-gray-500' : 'text-white'}`}>
                  Show only 8+ Rated
                </h3>
                <p className={`text-sm ${filtersDisabled ? 'text-gray-600' : 'text-gray-400'}`}>
                  Surface only highly rated movies (≥ 8.0)
                </p>
              </div>
              <button
                onClick={() => !filtersDisabled && setHighRatedOnly(!highRatedOnly)}
                disabled={filtersDisabled}
                className={`w-12 h-6 rounded-full transition-all ${
                  filtersDisabled ? 'bg-gray-700 cursor-not-allowed' : highRatedOnly ? 'bg-red-600' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  highRatedOnly ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>


          {/* OTT Platforms Section */}
          <div className={`mb-8 ${filtersDisabled ? 'opacity-50' : ''}`}>
            <h2 className={`text-xl font-semibold mb-4 ${filtersDisabled ? 'text-gray-500' : 'text-white'}`}>
              Streaming Platforms
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {OTT_PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  onClick={() => !filtersDisabled && handlePlatformToggle(platform)}
                  disabled={filtersDisabled}
                  className={`p-3 rounded-lg text-sm font-medium transition-all ${
                    filtersDisabled
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : selectedPlatforms.includes(platform)
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>

          {/* Language Section */}
          <div className={`mb-8 ${filtersDisabled ? 'opacity-50' : ''}`}>
            <h2 className={`text-xl font-semibold mb-4 ${filtersDisabled ? 'text-gray-500' : 'text-white'}`}>
              Language
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(['English','Hindi','Tamil','Telugu','Malayalam','Bengali'] as Language[]).map((language) => (
                <button
                  key={language}
                  onClick={() => !filtersDisabled && setSelectedLanguages(prev => prev.includes(language) ? prev.filter(l => l !== language) : [...prev, language])}
                  disabled={filtersDisabled}
                  className={`p-3 rounded-lg text-sm font-medium transition-all ${
                    filtersDisabled
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : selectedLanguages.includes(language)
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {language}
                </button>
              ))}
            </div>
          </div>

          {/* Genres Section */}
          <div className={`mb-8 ${filtersDisabled ? 'opacity-50' : ''}`}>
            <h2 className={`text-xl font-semibold mb-4 ${filtersDisabled ? 'text-gray-500' : 'text-white'}`}>
              Favorite Genres
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  onClick={() => !filtersDisabled && handleGenreToggle(genre)}
                  disabled={filtersDisabled}
                  className={`p-3 rounded-lg text-sm font-medium transition-all ${
                    filtersDisabled
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : selectedGenres.includes(genre)
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Release Year Section */}
          <div className={`mb-8 ${filtersDisabled ? 'opacity-50' : ''}`}>
            <h2 className={`text-xl font-semibold mb-4 ${filtersDisabled ? 'text-gray-500' : 'text-white'}`}>
              Release Year
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: '2025', label: '2025' },
                { value: '2000s', label: '2000s' },
                { value: 'older', label: 'Older' }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => !filtersDisabled && setReleaseYear(releaseYear === value ? null : value as '2025' | '2000s' | 'older')}
                  disabled={filtersDisabled}
                  className={`p-3 rounded-lg text-sm font-medium transition-all ${
                    filtersDisabled
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : releaseYear === value
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Adult Content Toggle */}
          <div className="mb-8">
            <div className={`flex items-center justify-between p-4 rounded-lg ${
              filtersDisabled ? 'bg-gray-800 opacity-50' : 'bg-gray-900'
            }`}>
              <div>
                <h3 className={`text-lg font-semibold ${filtersDisabled ? 'text-gray-500' : 'text-white'}`}>
                  Include Adult Content
                </h3>
                <p className={`text-sm ${filtersDisabled ? 'text-gray-600' : 'text-gray-400'}`}>
                  Show R-rated movies and mature content
                </p>
              </div>
              <button
                onClick={() => !filtersDisabled && setAdultContent(!adultContent)}
                disabled={filtersDisabled}
                className={`w-12 h-6 rounded-full transition-all ${
                  filtersDisabled ? 'bg-gray-700 cursor-not-allowed' : adultContent ? 'bg-red-600' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  adultContent ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Persistent Floating Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/90 backdrop-blur-sm border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleContinue}
            className="w-full bg-red-600 text-white font-bold py-4 px-8 rounded-full text-xl hover:bg-red-700 active:bg-red-800 transition-all touch-manipulation"
          >
            Continue →
          </button>
        </div>
      </div>
    </>
  );
}
