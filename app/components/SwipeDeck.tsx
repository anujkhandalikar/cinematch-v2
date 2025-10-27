'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { Movie } from '@/lib/store';
import { supabase } from '@/lib/supabase';

const TIMER_DURATION = 180000; // 3 minutes in milliseconds

export default function SwipeDeck() {
  const movies = useStore((state) => state.movies);
  const currentMovieIndex = useStore((state) => state.currentMovieIndex);
  const likedMovies = useStore((state) => state.likedMovies);
  const addLikedMovie = useStore((state) => state.addLikedMovie);
  const addMovieLike = useStore((state) => state.addMovieLike);
  const nextMovie = useStore((state) => state.nextMovie);
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);
  const session = useStore((state) => state.session);
  
  // Session flow state
  const sessionStartTime = useStore((state) => state.sessionStartTime);
  const newLikesSinceNudge = useStore((state) => state.newLikesSinceNudge);
  const newMutualSinceNudge = useStore((state) => state.newMutualSinceNudge);
  const isSessionRunning = useStore((state) => state.isSessionRunning);
  const setSessionStartTime = useStore((state) => state.setSessionStartTime);
  const setIsSessionRunning = useStore((state) => state.setIsSessionRunning);
  const incrementNewLikesSinceNudge = useStore((state) => state.incrementNewLikesSinceNudge);
  const incrementNewMutualSinceNudge = useStore((state) => state.incrementNewMutualSinceNudge);
  const resetNewLikesSinceNudge = useStore((state) => state.resetNewLikesSinceNudge);
  const resetNewMutualSinceNudge = useStore((state) => state.resetNewMutualSinceNudge);
  
  // Dual mode state
  const setDualModeState = useStore((state) => state.setDualModeState);
  
  // Local state
  const [swipeDelta, setSwipeDelta] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showNudgeModal, setShowNudgeModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
  const [hasLikedCurrentMovie, setHasLikedCurrentMovie] = useState(false);
  
  // Track likes properly according to flow diagram
  const [userLiked, setUserLiked] = useState<Movie[]>([]);
  const [partnerLiked, setPartnerLiked] = useState<Movie[]>([]);
  const [mutualLiked, setMutualLiked] = useState<Movie[]>([]);
  
  // Refs to access current values in subscriptions
  const userLikedRef = useRef<Movie[]>([]);
  const newMutualSinceNudgeRef = useRef(0);
  
  // Update refs when state changes
  useEffect(() => {
    userLikedRef.current = userLiked;
  }, [userLiked]);
  
  useEffect(() => {
    newMutualSinceNudgeRef.current = newMutualSinceNudge;
  }, [newMutualSinceNudge]);
  
  const startPos = useRef({ x: 0, y: 0 });
  const currentMovie = movies[currentMovieIndex];

  // Initialize session when component mounts
  useEffect(() => {
    if (!isSessionRunning && movies.length > 0) {
      console.log('=== INITIALIZING SESSION ===');
      console.log('Movies loaded:', movies.length);
      console.log('Session mode:', session?.mode);
      console.log('Both users ready:', session?.supabaseSession?.creator_ready && session?.supabaseSession?.joiner_ready);
      
      // Start session timer
      setSessionStartTime(Date.now());
      setIsSessionRunning(true);
      setHasLikedCurrentMovie(false);
      
      if (session?.mode === 'dual') {
        // Dual mode: Initialize according to flow diagram
        setUserLiked([]);
        setPartnerLiked([]);
        setMutualLiked([]);
        resetNewMutualSinceNudge();
        
        console.log('Dual mode session initialized:', {
          userLiked: [],
          partnerLiked: [],
          mutualLiked: [],
          newMutualSinceNudge: 0,
          timerStart: Date.now()
        });
      } else {
        // Single mode: Initialize individual likes counter
        resetNewLikesSinceNudge();
        
        console.log('Single mode session initialized:', {
          newLikesSinceNudge: 0,
          timerStart: Date.now()
        });
      }
    }
  }, [movies, isSessionRunning, setSessionStartTime, setIsSessionRunning, resetNewMutualSinceNudge, resetNewLikesSinceNudge, session?.mode]);

  // Timer effect
  useEffect(() => {
    if (!isSessionRunning || !sessionStartTime) return;

    const updateTimer = () => {
      const elapsed = Date.now() - sessionStartTime;
      const remaining = Math.max(0, TIMER_DURATION - elapsed);
      const secondsLeft = Math.ceil(remaining / 1000);
      setTimeLeft(secondsLeft);

      // Check if timer expired
      if (remaining <= 0) {
        console.log('Timer expired, going to shortlist');
        setCurrentScreen('shortlist');
        return;
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isSessionRunning, sessionStartTime, setCurrentScreen]);

  // Check for end conditions after each swipe
  const checkEndConditions = () => {
    // Timer expired?
    if (sessionStartTime && Date.now() - sessionStartTime >= TIMER_DURATION) {
      console.log('Timer expired, going to shortlist');
      setCurrentScreen('shortlist');
      return true;
    }

    // Deck exhausted?
    if (currentMovieIndex >= movies.length) {
      console.log('Deck exhausted, going to shortlist');
      setCurrentScreen('shortlist');
      return true;
    }

    return false;
  };

  // Handle right swipe (like) - mode-specific logic
  const handleSwipeRight = async () => {
    if (!currentMovie || hasLikedCurrentMovie) {
      console.log('Cannot like: no movie or already liked');
      return;
    }
    
    setHasLikedCurrentMovie(true);
    addLikedMovie(currentMovie); // Add to global liked movies for display
    
    if (session?.mode === 'dual') {
      // DUAL MODE: Follow the flow diagram logic
      console.log('=== USER LIKED MOVIE (DUAL MODE) ===');
      console.log('Movie:', currentMovie.title);
      console.log('Movie ID:', currentMovie.id);
      console.log('Current userLiked:', userLiked.map(m => m.title));
      console.log('Current partnerLiked:', partnerLiked.map(m => m.title));
      
      const newUserLiked = [...userLiked, currentMovie];
      setUserLiked(newUserLiked);
      console.log('Updated userLiked:', newUserLiked.map(m => m.title));
      
      // Sync with partner via Supabase
      if (session?.supabaseSession) {
        try {
          console.log('Syncing movie like with Supabase...');
          await addMovieLike(currentMovie);
          console.log('✅ Movie like synced with partner via Supabase');
        } catch (error) {
          console.error('❌ Error syncing movie like:', error);
        }
      }
      
      // Check for mutuality
      const isMutual = partnerLiked.some(movie => movie.id === currentMovie.id);
      console.log('🔍🔍🔍 CHECKING FOR MUTUALITY 🔍🔍🔍');
      console.log('Movie:', currentMovie.title);
      console.log('Movie ID:', currentMovie.id);
      console.log('Partner liked movies:', partnerLiked.map(m => ({ title: m.title, id: m.id })));
      console.log('Partner liked IDs:', partnerLiked.map(m => m.id));
      console.log('Is mutual?', isMutual);
      console.log('Comparison:', partnerLiked.map(m => `${m.title} (${m.id}) === ${currentMovie.title} (${currentMovie.id})? ${m.id === currentMovie.id}`));
      
      // Also check if this movie is already in mutualLiked to prevent duplicates
      const alreadyMutual = mutualLiked.some(movie => movie.id === currentMovie.id);
      
      if (isMutual && !alreadyMutual) {
        console.log('🎉 MUTUAL MATCH FOUND:', currentMovie.title);
        const newMutualLiked = [...mutualLiked, currentMovie];
        setMutualLiked(newMutualLiked);
        
        // Increment the counter
        incrementNewMutualSinceNudge();
        
        // Read the new value from store
        const updatedValue = useStore.getState().newMutualSinceNudge;
        
        console.log('Mutual match added:', {
          movie: currentMovie.title,
          mutualCount: newMutualLiked.length,
          newMutualSinceNudge: updatedValue
        });
        
        // Check if we should show nudge after incrementing
        if (updatedValue >= 3) {
          console.log('🚨 NUDGE TRIGGER: 3 mutual matches reached');
          setTimeout(() => {
            setShowNudgeModal(true);
          }, 500);
        }
      } else if (!isMutual) {
        console.log('Not a mutual match yet, waiting for partner to like:', currentMovie.title);
      } else if (alreadyMutual) {
        console.log('Movie already marked as mutual, skipping');
      }
    } else {
      // SINGLE MODE: Simple individual likes counter
      console.log('RIGHT SWIPE (SINGLE) - liked:', currentMovie.title);
      incrementNewLikesSinceNudge();
      
      if (newLikesSinceNudge + 1 >= 3) {
        console.log('NUDGE TRIGGER: 3 individual likes reached');
        setTimeout(() => {
          setShowNudgeModal(true);
        }, 500);
      }
    }
    
    nextMovie();
    if (checkEndConditions()) {
      return;
    }
  };

  // Handle left swipe (skip)
  const handleSwipeLeft = () => {
    if (!currentMovie) return;
    
    console.log('Left swipe - skipping movie:', currentMovie.title);
    
    // Move to next movie
    nextMovie();
    
    // Check end conditions
    checkEndConditions();
  };

  // Handle nudge modal actions
  const handleNudgeAction = (action: 'shortlist' | 'continue') => {
    setShowNudgeModal(false);
    
    if (action === 'shortlist') {
      // Shortlist Now - end game for both users
      setCurrentScreen('shortlist');
    } else {
      // Keep Browsing - reset counter, continue deck
      if (session?.mode === 'dual') {
        resetNewMutualSinceNudge();
      } else {
        resetNewLikesSinceNudge();
      }
      setHasLikedCurrentMovie(false);
      console.log('Keep browsing selected, continuing with deck');
    }
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    startPos.current = { x: touch.clientX, y: touch.clientY };
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    const deltaX = touch.clientX - startPos.current.x;
    const deltaY = touch.clientY - startPos.current.y;
    
    setSwipeDelta({ x: deltaX, y: deltaY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const threshold = 100;
    if (swipeDelta.x > threshold) {
      handleSwipeRight();
    } else if (swipeDelta.x < -threshold) {
      handleSwipeLeft();
    }
    
    setSwipeDelta({ x: 0, y: 0 });
  };

  // Mouse handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    startPos.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;
    
    setSwipeDelta({ x: deltaX, y: deltaY });
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    const threshold = 100;
    if (swipeDelta.x > threshold) {
      handleSwipeRight();
    } else if (swipeDelta.x < -threshold) {
      handleSwipeLeft();
    }
    
    setSwipeDelta({ x: 0, y: 0 });
  };

  // Reset hasLikedCurrentMovie when moving to new movie
  useEffect(() => {
    setHasLikedCurrentMovie(false);
  }, [currentMovieIndex]);

  // Subscribe to partner likes in dual mode
  useEffect(() => {
    if (session?.mode === 'dual' && session?.supabaseSession) {
      console.log('=== SETTING UP PARTNER LIKES SUBSCRIPTION ===');
      console.log('Session ID:', session.supabaseSession.id);
      console.log('Current user ID:', session.userId);
      
      // Subscribe to likes changes to track partner likes
      const subscription = supabase
        .channel(`partner-likes-${session.supabaseSession.id}`)
        .on('postgres_changes', {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'movie_likes',
          filter: `session_id=eq.${session.supabaseSession.id}`
        }, (payload) => {
          console.log('🎬🎬🎬 PARTNER LIKE RECEIVED 🎬🎬🎬');
          console.log('Event type:', payload.eventType);
          console.log('Payload:', payload);
          console.log('New data:', payload.new);
          
          if (!payload.new) {
            console.log('❌ No new data in payload');
            return;
          }
          
          console.log('User ID from payload:', payload.new.user_id);
          console.log('Current user ID:', session.userId);
          console.log('Is from different user?', payload.new.user_id !== session.userId);
          
          if (payload.new.user_id !== session.userId) {
            const partnerMovie = payload.new.movie_data;
            console.log('✅ Adding partner movie to partnerLiked:', partnerMovie);
            
            setPartnerLiked(prev => {
              console.log('Previous partnerLiked:', prev.map(m => m.title));
              const newPartnerLiked = [...prev, partnerMovie];
              console.log('✅✅✅ Updated partnerLiked:', newPartnerLiked.map(m => ({ title: m.title, id: m.id })));
              
              return newPartnerLiked;
            });
          } else {
            console.log('❌ Ignoring own like');
          }
        })
        .subscribe((status) => {
          console.log('📡 Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to partner likes!');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Channel error');
          } else if (status === 'TIMED_OUT') {
            console.error('❌ Subscription timed out');
          } else if (status === 'CLOSED') {
            console.error('❌ Subscription closed');
          }
        });
      
      return () => {
        console.log('🧹 Cleaning up partner likes subscription');
        subscription.unsubscribe();
      };
    } else {
      console.log('❌ Cannot setup subscription:', {
        mode: session?.mode,
        hasSupabaseSession: !!session?.supabaseSession
      });
    }
  }, [session?.mode, session?.supabaseSession?.id, session?.userId]);

  // Show loading or end state
  if (!currentMovie || currentMovieIndex >= movies.length) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white text-xl">No more movies!</p>
          <p className="text-gray-400 text-sm mt-2">
            Movies loaded: {movies.length}, Current index: {currentMovieIndex}
          </p>
          <button
            onClick={() => setCurrentScreen('shortlist')}
            className="mt-4 bg-red-600 text-white font-bold py-3 px-6 rounded-full hover:bg-red-700 transition-all"
          >
            View Your Shortlist
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col overflow-hidden touch-none">
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <div className="text-white font-semibold text-sm sm:text-base">
          {session?.mode === 'dual' ? (
            <>❤️ {mutualLiked.length} mutual</>
          ) : (
            <>❤️ {likedMovies.length}</>
          )}
        </div>
        <div className="text-white font-semibold text-sm sm:text-base">
          ⏰ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>

      {/* Movie Card */}
      <div className="flex-1 flex items-center justify-center p-1 sm:p-4 touch-none">
        <div
          className="relative w-full max-w-[280px] sm:max-w-sm mx-auto touch-auto"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            transform: `translate(${swipeDelta.x}px, ${swipeDelta.y}px) rotate(${swipeDelta.x * 0.1}deg)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          }}
        >
          <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
            <div className="aspect-[3/4] sm:aspect-[2/3] relative">
              <img
                src={currentMovie.poster_url}
                alt={currentMovie.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-movie.jpg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
            
            <div className="p-2 sm:p-4">
              {/* Genres */}
              <div className="flex flex-wrap gap-1 sm:gap-2 mb-1 sm:mb-3">
                {currentMovie.genres.map((genre, index) => (
                  <span
                    key={index}
                    className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-600 text-white text-xs rounded-full"
                  >
                    {genre}
                  </span>
                ))}
              </div>
              
              {/* Movie Details */}
              <div className="flex items-center justify-between text-gray-400 text-xs sm:text-sm mb-2 sm:mb-3">
                <span className="font-medium">{currentMovie.year}</span>
                <span>•</span>
                <span className="text-yellow-400 font-medium">⭐ {currentMovie.rating % 1 === 0 ? currentMovie.rating.toFixed(0) : currentMovie.rating.toFixed(1)}/10</span>
              </div>
              
              {/* Title */}
              <h2 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">{currentMovie.title}</h2>
              
              {/* Synopsis */}
              <p className="text-gray-300 text-xs sm:text-sm mb-2 sm:mb-3">
                {currentMovie.synopsis.length > 80 
                  ? `${currentMovie.synopsis.substring(0, 80)}...` 
                  : currentMovie.synopsis}
              </p>
              
              {/* OTT Platforms */}
              {currentMovie.ott && currentMovie.ott.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {currentMovie.ott.map((platform, index) => (
                    <span
                      key={index}
                      className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Adult Content Warning */}
              {currentMovie.adult && (
                <div className="text-red-400 text-xs font-semibold">
                  ⚠️ Adult Content
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-6 p-6">
        <button
          onClick={handleSwipeLeft}
          className="w-16 h-16 bg-gray-600 text-white rounded-full flex items-center justify-center hover:bg-gray-500 transition-all"
        >
          ✕
        </button>
        <button
          onClick={handleSwipeRight}
          className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-all"
        >
          ❤️
        </button>
      </div>

      {/* Nudge Modal */}
      {showNudgeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              You found 3 mutual matches! 🎉
            </h2>
            <p className="text-gray-600 mb-6">
              What would you like to do?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleNudgeAction('continue')}
                className="flex-1 bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-full hover:bg-gray-400 transition-all"
              >
                Keep Browsing
              </button>
              <button
                onClick={() => handleNudgeAction('shortlist')}
                className="flex-1 bg-red-600 text-white font-bold py-3 px-4 rounded-full hover:bg-red-700 transition-all"
              >
                Shortlist Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}