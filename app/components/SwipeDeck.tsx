'use client';

import { useEffect, useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useStore } from '@/lib/store';

export default function SwipeDeck() {
  const movies = useStore((state) => state.movies);
  const currentMovieIndex = useStore((state) => state.currentMovieIndex);
  const likedMovies = useStore((state) => state.likedMovies);
  const addLikedMovie = useStore((state) => state.addLikedMovie);
  const nextMovie = useStore((state) => state.nextMovie);
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);
  const setTimer = useStore((state) => state.setTimer);
  const session = useStore((state) => state.session);

  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
  const [hasReachedThreeLikes, setHasReachedThreeLikes] = useState(false);
  const [swipeDelta, setSwipeDelta] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // Set timer
    const start = new Date();
    const end = new Date(start.getTime() + 3 * 60 * 1000);
    setTimer(start, end);

    // Countdown timer
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCurrentScreen('shortlist');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [setTimer, setCurrentScreen]);

  // Check for 3 likes in single mode
  useEffect(() => {
    if (session?.mode !== 'dual') {
      if (likedMovies.length >= 3 && !hasReachedThreeLikes) {
        setHasReachedThreeLikes(true);
      }
    }
  }, [likedMovies, session, hasReachedThreeLikes]);

  const handleSwipeRight = async () => {
    const currentMovie = movies && movies[currentMovieIndex];
    if (currentMovie) {
      addLikedMovie(currentMovie);
      
      // Single mode: check if user has 3 likes
      if (likedMovies.length + 1 >= 3) {
        setTimeout(() => {
          setCurrentScreen('shortlist');
        }, 500);
      } else {
        nextMovie();
      }
    }
    // Reset swipe delta
    setSwipeDelta({ x: 0, y: 0 });
  };

  const handleSwipeLeft = () => {
    // Skip this movie and go to next
    nextMovie();
    // Reset swipe delta
    setSwipeDelta({ x: 0, y: 0 });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Swipe handlers
  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      setSwipeDelta({ x: eventData.deltaX, y: eventData.deltaY });
      setIsDragging(true);
    },
    onSwipedRight: () => {
      setIsDragging(false);
      handleSwipeRight();
    },
    onSwipedLeft: () => {
      setIsDragging(false);
      handleSwipeLeft();
    },
    onTouchEndOrOnMouseUp: () => {
      setIsDragging(false);
      setSwipeDelta({ x: 0, y: 0 });
    },
    trackMouse: true,
    trackTouch: true,
    preventScrollOnSwipe: true,
  });

  const currentMovie = movies && movies[currentMovieIndex];

  // Debug logging
  console.log('SwipeDeck - Movies:', movies?.length || 0);
  console.log('SwipeDeck - Current index:', currentMovieIndex);
  console.log('SwipeDeck - Current movie:', currentMovie);

  if (!movies || movies.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading movies...</p>
        </div>
      </div>
    );
  }

  if (!currentMovie) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white text-xl">No more movies!</p>
          <p className="text-gray-400 text-sm mt-2">
            Movies loaded: {movies.length}, Current index: {currentMovieIndex}
          </p>
        </div>
      </div>
    );
  }

  // Calculate rotation and scale based on swipe
  const rotation = swipeDelta.x * 0.1;
  const opacity = Math.max(0.5, 1 - Math.abs(swipeDelta.x) / 300);
  const scale = isDragging ? 0.95 : 1;

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6">
      {/* Timer and Status */}
      <div className="max-w-md mx-auto mb-4 sm:mb-6">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <div className="text-white font-semibold text-sm sm:text-base">
            ⏱️ {formatTime(timeLeft)}
          </div>
          <div className="text-white font-semibold text-sm sm:text-base">
            ❤️ {likedMovies.length}/3
          </div>
        </div>
        
        {hasReachedThreeLikes && session?.mode !== 'dual' && (
          <div className="bg-green-500 text-white p-3 sm:p-4 rounded-lg text-center mb-3 sm:mb-4">
            <p className="font-semibold text-sm sm:text-base">Solid shortlist! Time to watch?</p>
            <p className="text-xs sm:text-sm mt-1">Continue swiping or view your picks</p>
          </div>
        )}
      </div>

      {/* Swipe Instruction */}
      <div className="max-w-md mx-auto mb-4 text-center">
        <p className="text-red-200 text-sm">← Swipe left to skip • Swipe right to like →</p>
      </div>

      {/* Movie Card */}
      {currentMovie && (
        <div className="max-w-md mx-auto relative">
          <div
            {...handlers}
            className="bg-white rounded-2xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing select-none touch-none"
            style={{
              transform: `translateX(${swipeDelta.x}px) translateY(${swipeDelta.y}px) rotate(${rotation}deg) scale(${scale})`,
              opacity,
              transition: isDragging ? 'none' : 'all 0.3s ease-out',
            }}
          >
            {/* Poster */}
            <div 
              className="h-64 sm:h-96 bg-cover bg-center"
              style={{ backgroundImage: `url(${currentMovie.poster_url})` }}
            >
              <div className="h-full bg-gradient-to-t from-black/80 to-transparent flex items-end p-4 sm:p-6">
                <div className="text-white">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">{currentMovie.title}</h2>
                  <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                    <span>{currentMovie.year}</span>
                    <span>•</span>
                    <span>{currentMovie.runtime} min</span>
                    <span>•</span>
                    <span>⭐ {currentMovie.rating}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="p-4 sm:p-6">
              <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
                {currentMovie.genres && currentMovie.genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-2 sm:px-3 py-1 bg-red-100 text-red-900 rounded-full text-xs sm:text-sm font-medium"
                  >
                    {genre}
                  </span>
                ))}
              </div>

              <p className="text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">{currentMovie.synopsis}</p>

              <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                {currentMovie.ott && currentMovie.ott.map((platform) => (
                  <span
                    key={platform}
                    className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs sm:text-sm"
                  >
                    {platform}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleSwipeLeft}
                  className="flex-1 bg-gray-300 text-gray-800 font-bold py-3 sm:py-4 rounded-full text-base sm:text-lg hover:bg-gray-400 active:bg-gray-500 transition-all touch-manipulation"
                >
                  Skip
                </button>
                <button
                  onClick={handleSwipeRight}
                  className="flex-1 bg-red-600 text-white font-bold py-3 sm:py-4 rounded-full text-base sm:text-lg hover:bg-red-700 active:bg-red-800 transition-all touch-manipulation"
                >
                  ❤️ Like
                </button>
              </div>
            </div>
          </div>

          {/* Swipe indicators */}
          {isDragging && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {swipeDelta.x > 50 && (
                <div className="bg-green-500 text-white px-6 py-3 rounded-full font-bold text-lg transform rotate-12">
                  LIKE!
                </div>
              )}
              {swipeDelta.x < -50 && (
                <div className="bg-red-500 text-white px-6 py-3 rounded-full font-bold text-lg transform -rotate-12">
                  SKIP
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
