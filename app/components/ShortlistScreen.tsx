'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore, Movie } from '@/lib/store';
import { getOTTLink } from '@/lib/movies';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { trackEvent } from '@/lib/tracking';

// Helper function to generate a reason for watching a movie
function generateWatchReason(movie: Movie): string {
  const reasons: string[] = [];
  
  // High rating reason
  if (movie.rating >= 8.5) {
    reasons.push('Critically acclaimed masterpiece');
  } else if (movie.rating >= 8.0) {
    reasons.push('Highly rated by audiences');
  }
  
  // Genre-based reasons
  if (movie.genres.includes('Action')) {
    reasons.push('Thrilling action sequences');
  }
  if (movie.genres.includes('Drama')) {
    reasons.push('Compelling storytelling');
  }
  if (movie.genres.includes('Comedy')) {
    reasons.push('Laugh-out-loud moments');
  }
  if (movie.genres.includes('Thriller')) {
    reasons.push('Edge-of-your-seat suspense');
  }
  if (movie.genres.includes('Sci-Fi')) {
    reasons.push('Mind-bending sci-fi');
  }
  
  // Year-based reasons
  const currentYear = new Date().getFullYear();
  if (movie.year >= currentYear - 2) {
    reasons.push('Recent release');
  } else if (movie.year < 2000) {
    reasons.push('Classic cinema');
  }
  
  // Runtime-based
  if (movie.runtime > 150) {
    reasons.push('Epic cinematic experience');
  }
  
  // Default fallback
  if (reasons.length === 0) {
    reasons.push('Worth your time');
  }
  
  return reasons[0] || 'Worth your time';
}

const HEADER_COMBINATIONS = [
  {
    header: "Time's up — we picked for you.",
    subhead: "Because left to your own devices, you'd still be scrolling.",
  },
  {
    header: "We did the hard part.",
    subhead: "You know, the thinking.",
  },
  {
    header: "Your taste, on trial.",
    subhead: "And the verdict: disturbingly good.",
  },
  {
    header: "The shortlist chose you.",
    subhead: "You're just living in its cinematic universe now.",
  },
  {
    header: "Meet your chosen ones.",
    subhead: "Every story here has a reason to steal your night.",
  },
  {
    header: "Lights, camera, shortlist.",
    subhead: "We filtered the noise so the magic could shine.",
  },
  {
    header: "Movies worth pressing play for.",
    subhead: "Chosen by taste, not by trend.",
  },
  {
    header: "A shortlist made for your mood.",
    subhead: "Tonight's forecast: high chance of popcorn.",
  },
];

export default function ShortlistScreen() {
  const likedMovies = useStore((state) => state.likedMovies);
  const session = useStore((state) => state.session);
  const resetState = useStore((state) => state.resetState);
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Randomly select header/subhead combination
  const [headerCopy] = useState(() => {
    return HEADER_COMBINATIONS[Math.floor(Math.random() * HEADER_COMBINATIONS.length)];
  });

  // Show mutual likes in dual mode, otherwise show user's likes
  const displayMovies = session?.mode === 'dual' && session?.mutualLikes 
    ? session.mutualLikes
    : likedMovies.filter(movie => movie && movie.id);

  const hasMutualLikes = session?.mode === 'dual' && session?.mutualLikes && session.mutualLikes.length > 0;

  // Track page visit
  useEffect(() => {
    trackEvent({ event: 'Shortlist_Page_Visited' });
  }, []);

  // Track shortlist opened and session completed
  useEffect(() => {
    if (displayMovies.length > 0) {
      trackEvent({ event: 'Shortlist_Opened', title: `Shortlist with ${displayMovies.length} movies` });
      
      // Track session completion for dual mode
      if (session?.mode === 'dual') {
        trackEvent({ event: 'Session_Completed' });
      }
    }
  }, [displayMovies.length, session?.mode]);

  // Track My Pick viewed
  useEffect(() => {
    if (selectedMovie) {
      trackEvent({ 
        event: 'My_Pick_Viewed', 
        title: selectedMovie.title 
      });
    }
  }, [selectedMovie?.id]);

  // Pre-select first movie on load
  useEffect(() => {
    if (displayMovies.length > 0 && !selectedMovie) {
      setSelectedMovie(displayMovies[0]);
      setFocusedIndex(0);
    }
  }, [displayMovies.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (displayMovies.length === 0) return;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % displayMovies.length);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedIndex((prev) => (prev - 1 + displayMovies.length) % displayMovies.length);
          break;
        case 'ArrowDown': {
          e.preventDefault();
          const cols = Math.floor((gridRef.current?.offsetWidth || 0) / 200) || 2;
          const nextIndex = Math.min(focusedIndex + cols, displayMovies.length - 1);
          setFocusedIndex(nextIndex);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const cols = Math.floor((gridRef.current?.offsetWidth || 0) / 200) || 2;
          const nextIndex = Math.max(focusedIndex - cols, 0);
          setFocusedIndex(nextIndex);
          break;
        }
        case 'Enter':
          e.preventDefault();
          if (displayMovies[focusedIndex]) {
            setSelectedMovie(displayMovies[focusedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setSelectedMovie(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayMovies, focusedIndex]);

  // Scroll focused card into view
  useEffect(() => {
    if (cardRefs.current[focusedIndex]) {
      cardRefs.current[focusedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [focusedIndex]);

  const handleStartOver = () => {
    resetState();
  };

  const handleCardClick = (movie: Movie) => {
    setSelectedMovie(movie);
  };

  const toggleDescriptionExpanded = (movieId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(movieId)) {
        newSet.delete(movieId);
      } else {
        newSet.add(movieId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] pb-20 sm:pb-24 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section - Improved Hierarchy */}
        <div className="text-center pt-12 sm:pt-16 md:pt-20 mb-12 sm:mb-16 md:mb-20">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-white mb-4 sm:mb-6 tracking-tight"
            style={{ 
              textShadow: '0 0 20px rgba(255, 255, 255, 0.1)',
            }}
          >
            {headerCopy.header}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-gray-400 text-base sm:text-lg md:text-xl font-light italic max-w-2xl mx-auto leading-relaxed"
            style={{
              letterSpacing: '0.01em',
            }}
          >
            {headerCopy.subhead}
          </motion.p>
        </div>

        {/* Movies Grid - Better Spacing */}
        {displayMovies.length > 0 ? (
          <div 
            ref={gridRef}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 md:gap-8 mb-16 sm:mb-20"
          >
            {displayMovies.map((movie, index) => {
              const isSelected = selectedMovie?.id === movie.id;
              const isFocused = focusedIndex === index;
              
              return (
                <motion.div
                  key={`${movie.id}-${index}`}
                  ref={(el) => { cardRefs.current[index] = el; }}
                  className={`
                    ${isSelected 
                      ? 'col-span-2 sm:col-span-2 md:col-span-2 lg:col-span-2' 
                      : ''
                    }
                    transition-all duration-500 ease-out
                  `}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ 
                    opacity: selectedMovie && !isSelected ? 0.6 : 1, 
                    y: 0,
                    filter: selectedMovie && !isSelected ? 'blur(4px)' : 'blur(0px)',
                  }}
                  transition={{ delay: index * 0.03, duration: 0.5 }}
                >
                  <motion.div
                    onClick={() => handleCardClick(movie)}
                    onFocus={() => setFocusedIndex(index)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    className={`
                      relative group w-full aspect-[2/3] rounded-xl overflow-hidden cursor-pointer
                      ${isSelected 
                        ? 'scale-100 z-10' 
                        : isFocused
                        ? 'scale-[1.02]'
                        : 'scale-100'
                      }
                      focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#0A0A0B] focus:ring-opacity-50
                    `}
                    animate={{
                      scale: isSelected ? 1 : (isFocused ? 1.02 : 1),
                    }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    whileHover={{ scale: isSelected ? 1 : 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCardClick(movie);
                      }
                    }}
                  >
                    {/* Poster Image */}
                    {movie.poster_url ? (
                      <Image
                        src={movie.poster_url}
                        alt={movie.title}
                        fill
                        className="object-cover"
                        sizes={isSelected ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 16vw"}
                      />
                    ) : (
                      <div className="w-full h-full bg-[#121214] flex items-center justify-center">
                        <span className="text-gray-500 text-xs">No poster</span>
                      </div>
                    )}
                    
                    {/* Glow effect for selected card */}
                    {isSelected && (
                      <motion.div
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                          boxShadow: '0 0 40px rgba(239, 68, 68, 0.5), 0 0 80px rgba(220, 38, 38, 0.3), inset 0 0 40px rgba(239, 68, 68, 0.2)',
                        }}
                      />
                    )}
                    
                    {/* Subtle border glow */}
                    <div className={`
                      absolute inset-0 rounded-xl border-2 pointer-events-none transition-all duration-500
                      ${isSelected 
                        ? 'border-red-500 opacity-100' 
                        : 'border-transparent opacity-0 group-hover:opacity-100 group-hover:border-red-500/30'
                      }
                    `} />
                    
                    {/* Subtle overlay for non-selected cards on hover */}
                    {!isSelected && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    )}
                    
                    {/* Movie info overlay - Only for non-selected cards on hover */}
                    {!isSelected && (
                      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <h3 className="text-white font-light mb-2 line-clamp-2 tracking-tight text-sm sm:text-base" style={{ textShadow: '0 2px 12px rgba(0, 0, 0, 0.9)' }}>
                          {movie.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-300 font-light">
                          <span>{movie.year}</span>
                          <span className="text-red-500">•</span>
                          <span className="text-red-500 font-light flex items-center gap-1">
                            <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                            </svg>
                            {movie.rating % 1 === 0 ? movie.rating.toFixed(0) : movie.rating.toFixed(1)}/10
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* My Pick Overlay - Glassmorphism on selected card */}
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/80 to-black/60 rounded-xl p-4 sm:p-5 md:p-6 flex flex-col justify-end"
                      >
                        {/* Close button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMovie(null);
                          }}
                          className="absolute top-3 right-3 w-7 h-7 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/80 transition-colors z-20"
                          aria-label="Close My Pick"
                        >
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        
                        {/* Title */}
                        <h3 className="text-white font-light text-xl sm:text-2xl md:text-3xl mb-2 sm:mb-3 tracking-tight" style={{ textShadow: '0 2px 12px rgba(0, 0, 0, 0.9)' }}>
                          {movie.title}
                        </h3>
                        
                        {/* Year and Rating */}
                        <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">
                          <span className="font-light">{movie.year}</span>
                          <span className="text-gray-600">•</span>
                          <span className="text-red-500 font-light flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                            </svg>
                            {movie.rating % 1 === 0 ? movie.rating.toFixed(0) : movie.rating.toFixed(1)}/10
                          </span>
                        </div>
                        
                        {/* Reason - Highlighted with black background and red text */}
                        <div className="mb-3 sm:mb-4">
                          <span className="inline-flex items-center px-3 py-1 bg-black/80 backdrop-blur-sm rounded-full border border-red-500/30">
                            <span className="text-red-500 italic text-sm sm:text-base font-light">
                              {generateWatchReason(movie).split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </span>
                          </span>
                        </div>
                        
                        {/* Description */}
                        {movie.synopsis && (
                          <div className="mb-3 sm:mb-4">
                            <p className={`text-gray-300 text-xs sm:text-sm font-light leading-relaxed ${!expandedDescriptions.has(movie.id) ? 'line-clamp-2 sm:line-clamp-3' : ''}`}>
                              {movie.synopsis}
                            </p>
                            {movie.synopsis.length > 150 && (
                              <button
                                onClick={(e) => toggleDescriptionExpanded(movie.id, e)}
                                className="mt-2 text-red-400 text-xs sm:text-sm font-light hover:text-red-300 transition-colors cursor-pointer"
                              >
                                {expandedDescriptions.has(movie.id) ? 'Read less' : 'Read more'}
                              </button>
                            )}
                          </div>
                        )}
                        
                        {/* Genres */}
                        {movie.genres && movie.genres.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3 sm:mb-4 overflow-x-auto scrollbar-hide">
                            {movie.genres.slice(0, 4).map((genre, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-xs sm:text-sm text-white font-light whitespace-nowrap"
                              >
                                {genre}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* OTT Platforms - Horizontal scroll */}
                        {movie.ott && movie.ott.length > 0 && (
                          <div className="flex gap-2 mb-4 sm:mb-5 overflow-x-auto scrollbar-hide">
                            {movie.ott.map((platform, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 bg-red-500/20 backdrop-blur-sm border border-red-500/40 rounded-full text-xs sm:text-sm text-red-400 font-light whitespace-nowrap"
                              >
                                {platform}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Watch Button */}
                        <motion.a
                          href={getOTTLink(movie)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="group relative bg-red-600 text-white px-6 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-light text-center transition-all duration-300 hover:bg-red-700 overflow-hidden shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]"
                        >
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            Watch
                            <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </span>
                        </motion.a>
                      </motion.div>
                    )}
                    
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">🎞</div>
            <p className="text-white text-2xl font-light mb-3">404: Plot not found.</p>
            <p className="text-gray-400 text-base mb-8 font-light">Our servers took a coffee break.</p>
            <button
              onClick={() => {
                resetState();
                setCurrentScreen('home');
              }}
              className="bg-red-600 text-white font-light py-3 px-8 rounded-full hover:bg-red-700 transition-all text-base"
            >
              Try Again
            </button>
          </div>
        )}


        {/* Action Buttons - Better Spacing */}
        <div className="flex gap-4 justify-center mb-12 sm:mb-16">
          <motion.button
            onClick={handleStartOver}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-lg font-medium transition-colors duration-300 border border-red-600/70 bg-red-600/10 text-white shadow-[0_0_12px_rgba(255,0,0,0.35)] hover:bg-red-600/20"
          >
            <span className="italic">Start Over</span>
            <span className="text-base">→</span>
          </motion.button>
        </div>

        {/* Fun Message */}
        <div className="text-center pb-8">
          <p className="text-gray-400 text-sm sm:text-base font-light tracking-wide">
            <span className="text-red-500">🎬</span> Lights, camera, chill! <span className="text-red-500">🎬</span>
          </p>
        </div>
      </div>
    </div>
  );
}
