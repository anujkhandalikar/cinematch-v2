'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Movie } from '@/lib/store';
import { supabase, testSupabaseConnection } from '@/lib/supabase';
import { trackEvent } from '@/lib/tracking';

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
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
  const [hasLikedCurrentMovie, setHasLikedCurrentMovie] = useState(false);
  const [showSimpleRulesPopup, setShowSimpleRulesPopup] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [pendingSwipe, setPendingSwipe] = useState<'right' | 'left' | null>(null);
  const exitDirectionRef = useRef<'right' | 'left' | null>(null);
  
  // Framer Motion values for smooth animations
  const x = useMotionValue(0);
  const rotate = useSpring(useTransform(x, [-300, 300], [-30, 30]), { stiffness: 300, damping: 30 });
  const cardOpacity = useMotionValue(1);
  
  // Track likes properly according to flow diagram
  const [userLiked, setUserLiked] = useState<Movie[]>([]);
  const [partnerLiked, setPartnerLiked] = useState<Movie[]>([]);
  const [mutualLiked, setMutualLiked] = useState<Movie[]>([]);
  
  // Refs to access current values in subscriptions
  const userLikedRef = useRef<Movie[]>([]);
  const partnerLikedRef = useRef<Movie[]>([]);
  const mutualLikedRef = useRef<Movie[]>([]);
  const newMutualSinceNudgeRef = useRef(0);
  const hasRedirectedRef = useRef(false);
  
  // Update refs when state changes
  useEffect(() => {
    userLikedRef.current = userLiked;
  }, [userLiked]);
  
  useEffect(() => {
    partnerLikedRef.current = partnerLiked;
  }, [partnerLiked]);
  
  useEffect(() => {
    mutualLikedRef.current = mutualLiked;
  }, [mutualLiked]);

  // CRITICAL: Recalculate mutual matches whenever partner likes or user likes change
  useEffect(() => {
    if (session?.mode !== 'dual') return;
    
    console.log('🔄 Recalculating mutual matches...');
    console.log('User liked count:', userLiked.length);
    console.log('User liked:', userLiked.map(m => ({ title: m.title, id: m.id })));
    console.log('Partner liked count:', partnerLiked.length);
    console.log('Partner liked:', partnerLiked.map(m => ({ title: m.title, id: m.id })));
    console.log('Current mutual liked count:', mutualLiked.length);
    console.log('Current mutual liked:', mutualLiked.map(m => ({ title: m.title, id: m.id })));
    
    // Find all movies that both users have liked
    const userLikedIds = new Set(userLiked.map(m => m.id));
    const currentMutualIds = new Set(mutualLiked.map(m => m.id));
    
    console.log('User liked IDs:', Array.from(userLikedIds));
    console.log('Partner liked IDs:', partnerLiked.map(m => m.id));
    console.log('Current mutual IDs:', Array.from(currentMutualIds));
    
    const newMutualMatches = partnerLiked.filter(partnerMovie => {
      const isMutual = userLikedIds.has(partnerMovie.id);
      const alreadyInMutual = currentMutualIds.has(partnerMovie.id);
      if (isMutual && !alreadyInMutual) {
        console.log(`🎯 Found new mutual match: ${partnerMovie.title} (ID: ${partnerMovie.id})`);
      } else if (isMutual && alreadyInMutual) {
        console.log(`⚠️ ${partnerMovie.title} is already in mutual list`);
      } else if (!isMutual) {
        console.log(`❌ ${partnerMovie.title} is not mutual (user hasn't liked it yet)`);
      }
      return isMutual && !alreadyInMutual;
    });
    
    if (newMutualMatches.length > 0) {
      console.log('🎉 FOUND NEW MUTUAL MATCHES:', newMutualMatches.map(m => m.title));
      setMutualLiked(prev => {
        const updated = [...prev];
        newMutualMatches.forEach(match => {
          if (!updated.some(m => m.id === match.id)) {
            updated.push(match);
          }
        });
        console.log('💾 Updated mutualLiked state (from useEffect):', updated.length, 'total matches');
        console.log('💾 Updated mutualLiked:', updated.map(m => ({ title: m.title, id: m.id })));
        return updated;
      });
      
      // Update session state
      setTimeout(() => {
        const finalMutual = [...mutualLikedRef.current, ...newMutualMatches];
        console.log('💾 STORING MUTUAL MATCHES IN SESSION (from useEffect):', finalMutual.length, 'matches');
        console.log('💾 Mutual match movies:', finalMutual.map(m => ({ title: m.title, id: m.id })));
        setDualModeState({ mutualLikes: finalMutual });
        
        // Verify storage
        const storedSession = useStore.getState().session;
        console.log('✅ VERIFIED: Session mutualLikes count:', storedSession?.mutualLikes?.length || 0);
        console.log('✅ VERIFIED: Session mutualLikes:', storedSession?.mutualLikes?.map((m: Movie) => ({ title: m.title, id: m.id })) || []);
        
        // Force UI update by triggering a re-render
        console.log('🔄 Triggering UI update for mutual matches');
      }, 0);
    } else {
      console.log('No new mutual matches found');
      console.log('Debug: Why no matches?', {
        userLikedCount: userLiked.length,
        partnerLikedCount: partnerLiked.length,
        userLikedIds: Array.from(userLikedIds),
        partnerLikedIds: partnerLiked.map(m => m.id),
        intersection: partnerLiked.filter(m => userLikedIds.has(m.id)).map(m => m.title)
      });
    }
  }, [userLiked, partnerLiked, session?.mode]); // Removed mutualLiked from deps to avoid infinite loop
  
  useEffect(() => {
    newMutualSinceNudgeRef.current = newMutualSinceNudge;
  }, [newMutualSinceNudge]);
  
  const startPos = useRef({ x: 0, y: 0 });
  const currentMovie = movies[currentMovieIndex];
  
  // Test Supabase connection on mount (dual mode only)
  useEffect(() => {
    if (session?.mode === 'dual' && typeof window !== 'undefined') {
      console.log('🧪 Running Supabase connection test...');
      testSupabaseConnection().catch(err => {
        console.error('Failed to test Supabase connection:', err);
      });
    }
  }, [session?.mode]);
  
  // Track page visit
  useEffect(() => {
    trackEvent({ event: 'Deck_Page_Visited' });
  }, []);

  // Track deck loaded
  useEffect(() => {
    if (movies.length > 0 && currentMovieIndex === 0) {
      trackEvent({ event: 'Deck_Loaded', title: `Loaded ${movies.length} movies` });
    }
  }, [movies.length, currentMovieIndex]);

  // Auto-dismiss Simple Rules popup after 5 seconds
  useEffect(() => {
    if (showSimpleRulesPopup) {
      const timer = setTimeout(() => {
        setShowSimpleRulesPopup(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSimpleRulesPopup]);

  // Reset description expansion when movie changes
  useEffect(() => {
    setIsDescriptionExpanded(false);
  }, [currentMovieIndex]);
  
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
        // Initialize mutualLiked from session state if it exists
        const initialMutualLikes = session?.mutualLikes || [];
        setMutualLiked(initialMutualLikes);
        console.log('🔄 Initializing mutualLiked from session:', initialMutualLikes.length, 'matches');
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
    
    trackEvent({ 
      event: 'Movie_Swiped', 
      direction: 'right', 
      title: currentMovie.title 
    });
    
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
          console.log('Movie:', currentMovie.title, 'ID:', currentMovie.id);
          console.log('Session ID:', session.supabaseSession.id);
          console.log('User ID:', session.userId);
          await addMovieLike(currentMovie);
          console.log('✅ Movie like synced with partner via Supabase');
        } catch (error: any) {
          console.error('❌ Error syncing movie like:', error);
          console.error('Error details:', {
            message: error?.message,
            code: error?.code,
            details: error?.details,
            hint: error?.hint
          });
          // Continue even if Supabase fails - mutual matches can still work via polling
          console.warn('⚠️ Continuing without Supabase sync - will use polling fallback');
        }
      } else {
        console.warn('⚠️ No Supabase session - mutual matches will not sync');
      }
      
      // Also check if this movie is already in mutualLiked to prevent duplicates
      const alreadyMutual = mutualLiked.some(movie => movie.id === currentMovie.id);
      
      // Check for mutuality - use local state for fallback mode, Supabase for Supabase mode
      let isMutual = false;
      
      // First check local state (works in both modes)
      const partnerHasLiked = partnerLiked.some(movie => movie.id === currentMovie.id);
      if (partnerHasLiked) {
        console.log('✅ Partner already liked this movie (from local state):', currentMovie.title);
        isMutual = true;
      }
      
      // Also check Supabase if available (for real-time sync)
      if (!isMutual && session?.supabaseSession && session?.userId) {
        try {
          console.log('🔍🔍🔍 CHECKING FOR MUTUALITY IN DATABASE 🔍🔍🔍');
          console.log('Movie:', currentMovie.title);
          console.log('Movie ID:', currentMovie.id);
          console.log('Session ID:', session.supabaseSession.id);
          console.log('Current User ID:', session.userId);
          
          const { data } = await supabase
            .from('movie_likes')
            .select('*')
            .eq('session_id', session.supabaseSession.id)
            .neq('user_id', session.userId) // Only get partner's likes
            .eq('movie_id', currentMovie.id.toString());
          
          console.log('Partner likes for this movie from DB:', data?.length || 0);
          if (data && data.length > 0) {
            console.log('Partner liked IDs from DB:', data.map(l => l.user_id));
          }
          
          // Check if partner has liked this movie
          isMutual = !!(data && data.length > 0);
          console.log('Is mutual?', isMutual);
        } catch (err) {
          console.warn('Error checking mutuality in database (using fallback):', err);
          // In fallback mode, rely on local state check above
        }
      }
      
      if (isMutual && !alreadyMutual) {
        console.log('🎉 MUTUAL MATCH FOUND:', currentMovie.title);
        const newMutualLiked = [...mutualLiked, currentMovie];
        setMutualLiked(newMutualLiked);
        
        // Defer all state updates to avoid React render errors
        setTimeout(() => {
          // Update session with mutual likes - CRITICAL: This must be called to persist mutual matches
          console.log('💾 STORING MUTUAL MATCHES IN SESSION:', newMutualLiked.length, 'matches');
          console.log('💾 Mutual match movies:', newMutualLiked.map(m => ({ title: m.title, id: m.id })));
          setDualModeState({ mutualLikes: newMutualLiked });
          
          // Verify it was stored
          const storedSession = useStore.getState().session;
          console.log('✅ VERIFIED: Session mutualLikes count:', storedSession?.mutualLikes?.length || 0);
          console.log('✅ VERIFIED: Session mutualLikes:', storedSession?.mutualLikes?.map((m: Movie) => ({ title: m.title, id: m.id })) || []);
          
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
        }, 0);
      } else if (!isMutual) {
        console.log('Not a mutual match yet, waiting for partner to like:', currentMovie.title);
        console.log('Debug info:', {
          partnerLikedCount: partnerLiked.length,
          partnerLikedIds: partnerLiked.map(m => m.id),
          currentMovieId: currentMovie.id,
          partnerHasLiked: partnerLiked.some(movie => movie.id === currentMovie.id)
        });
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
    
    // Reset description expansion when moving to next movie
    setIsDescriptionExpanded(false);
    nextMovie();
    if (checkEndConditions()) {
      return;
    }
  };

  // Handle left swipe (skip)
  const handleSwipeLeft = () => {
    if (!currentMovie) return;
    
    trackEvent({ 
      event: 'Movie_Swiped', 
      direction: 'left', 
      title: currentMovie.title 
    });
    
    console.log('Left swipe - skipping movie:', currentMovie.title);
    
    // Reset description expansion when moving to next movie
    setIsDescriptionExpanded(false);
    
    // Move to next movie
    nextMovie();
    
    // Check end conditions
    checkEndConditions();
  };

  // Handle nudge modal actions
  const handleNudgeAction = async (action: 'shortlist' | 'continue') => {
    setShowNudgeModal(false);
    
    if (action === 'shortlist') {
      // Shortlist Now - end game for both users
      if (session?.mode === 'dual' && session?.supabaseSession) {
        // Broadcast to partner via Supabase realtime channel
        try {
          console.log('🔊 Broadcasting redirect to partner...');
          const channel = supabase.channel(`session-redirect-${session.supabaseSession.id}`, {
            config: {
              broadcast: { self: true },
              presence: { key: session.userId }
            }
          });
          
          await channel.subscribe();
          console.log('📡 Subscribed to redirect channel');
          
          await channel.send({
            type: 'broadcast',
            event: 'redirect-to-shortlist',
            payload: { mutualMatches: mutualLiked, timestamp: Date.now() }
          });
          console.log('✅ Broadcasted redirect to partner via realtime');
          console.log('Mutual matches to show:', mutualLiked.length);
          
          // Unsubscribe after a delay
          setTimeout(() => {
            channel.unsubscribe();
            console.log('📡 Unsubscribed from redirect channel');
          }, 1000);
        } catch (err) {
          console.error('❌ Error broadcasting redirect:', err);
        }
      }
      setCurrentScreen('shortlist');
    } else {
      // Keep Browsing - reset counter and sync with partner
      console.log('Keep browsing selected');
      
      if (session?.mode === 'dual' && session?.supabaseSession) {
        // Broadcast to partner to also keep browsing
        try {
          console.log('🔊 Broadcasting "keep browsing" to partner...');
          const channel = supabase.channel(`session-keep-browsing-${session.supabaseSession.id}`, {
            config: {
              broadcast: { self: true },
              presence: { key: session.userId }
            }
          });
          
          await channel.subscribe();
          console.log('📡 Subscribed to keep browsing channel');
          
          await channel.send({
            type: 'broadcast',
            event: 'keep-browsing',
            payload: { timestamp: Date.now() }
          });
          console.log('✅ Broadcasted "keep browsing" to partner');
          
          // Unsubscribe after a delay
          setTimeout(() => {
            channel.unsubscribe();
            console.log('📡 Unsubscribed from keep browsing channel');
          }, 1000);
        } catch (err) {
          console.error('❌ Error broadcasting keep browsing:', err);
        }
      }
      
      // Reset counters
      if (session?.mode === 'dual') {
        resetNewMutualSinceNudge();
        console.log('✅ Counter reset to 0. Need 3 MORE mutual matches for next nudge.');
        console.log('Current mutual matches:', mutualLiked.length);
      } else {
        resetNewLikesSinceNudge();
      }
      setHasLikedCurrentMovie(false);
      console.log('Continuing with deck...');
    }
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    // Check if the touch is on the description area or button
    const target = e.target as HTMLElement;
    if (target.closest('.description-area') || target.closest('.read-more-button')) {
      // Don't start dragging if clicking on description area
      return;
    }
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
    
    // Only allow horizontal movement - ignore vertical movement
    // Only update if horizontal movement is dominant
    if (Math.abs(deltaX) > Math.abs(deltaY) || Math.abs(deltaY) < 10) {
      setSwipeDelta({ x: deltaX, y: 0 });
    } else {
      // If vertical movement is dominant, don't update delta
      return;
    }
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
    // Check if the click is on the description area or button
    const target = e.target as HTMLElement;
    if (target.closest('.description-area') || target.closest('.read-more-button')) {
      // Don't start dragging if clicking on description area
      return;
    }
    startPos.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;
    
    // Only allow horizontal movement - ignore vertical movement
    if (Math.abs(deltaX) > Math.abs(deltaY) || Math.abs(deltaY) < 10) {
      setSwipeDelta({ x: deltaX, y: 0 });
    }
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

  // Helper function to trigger swipe animation programmatically
  const triggerSwipeAnimation = (direction: 'right' | 'left') => {
    if (isExiting) return;
    
    setIsExiting(true);
    setPendingSwipe(direction);
    exitDirectionRef.current = direction;
    // Immediately update movie index to trigger AnimatePresence exit
    if (direction === 'right') {
      handleSwipeRight();
    } else {
      handleSwipeLeft();
    }
  };

  // Keyboard support for desktop interactions
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const activeTag = activeElement?.tagName.toLowerCase();

      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || activeElement?.hasAttribute('contenteditable')) {
        return;
      }

      // Enter selects the current movie (same as swipe right)
      if (event.key === 'Enter') {
        event.preventDefault();
        triggerSwipeAnimation('right');
        return;
      }

      // Arrow keys (and WASD) for swiping
      if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
        event.preventDefault();
        triggerSwipeAnimation('right');
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
        event.preventDefault();
        triggerSwipeAnimation('left');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExiting, x]);

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
          
          const newPayload = payload.new as any;
          console.log('User ID from payload:', newPayload.user_id);
          console.log('Current user ID:', session.userId);
          console.log('Is from different user?', newPayload.user_id !== session.userId);
          
          if (newPayload.user_id !== session.userId) {
            const partnerMovie = newPayload.movie_data;
            
            // Validate movie data before adding
            if (!partnerMovie || !partnerMovie.id || !partnerMovie.title) {
              console.log('❌ Skipping invalid partner movie data:', partnerMovie);
              return;
            }
            
            console.log('✅ Adding partner movie to partnerLiked:', partnerMovie);
            
            setPartnerLiked(prev => {
              console.log('Previous partnerLiked:', prev.map(m => m.title));
              
              // Check if this movie already exists to prevent duplicates
              if (prev.some(m => m && m.id === partnerMovie.id)) {
                console.log('⚠️ Partner movie already exists, skipping duplicate');
                return prev;
              }
              
              const newPartnerLiked = [...prev, partnerMovie];
              console.log('✅✅✅ Updated partnerLiked:', newPartnerLiked.map(m => ({ title: m.title, id: m.id })));
              
              // Check if this creates a mutual match (user already liked this movie)
              const userLikedIds = userLikedRef.current
                .filter(m => m && m.id)
                .map(m => m.id);
              const isMutual = userLikedIds.includes(partnerMovie.id);
              
              console.log('🔍🔍🔍 SUBSCRIPTION CHECKING FOR MUTUALITY 🔍🔍🔍');
              console.log('Partner just liked:', partnerMovie.title);
              console.log('User liked IDs:', userLikedIds);
              console.log('Is mutual?', isMutual);
              
              if (isMutual) {
                console.log('🎉🎉🎉 PARTNER LIKES FOUND MUTUAL MATCH!', partnerMovie.title);
                const currentUserLikedMovies = userLikedRef.current;
                const userLikedThisMovie = currentUserLikedMovies.find(m => m.id === partnerMovie.id);
                
                console.log('User liked this movie?', !!userLikedThisMovie);
                console.log('Already in mutual list?', mutualLikedRef.current.some(m => m.id === partnerMovie.id));
                
                if (userLikedThisMovie && !mutualLikedRef.current.some(m => m.id === partnerMovie.id)) {
                  console.log('✅ Adding mutual match from partner like:', partnerMovie.title);
                  setMutualLiked(prevMutual => {
                    if (prevMutual.some(m => m.id === partnerMovie.id)) {
                      console.log('⚠️ Already mutual, skipping');
                      return prevMutual; // Already mutual
                    }
                    
                    return [...prevMutual, partnerMovie];
                  });
                  
                  // Defer state updates to avoid React render errors
                  setTimeout(() => {
                    // Update session with mutual likes
                    const updatedMutual = [...mutualLikedRef.current, partnerMovie];
                    setDualModeState({ mutualLikes: updatedMutual });
                    
                    incrementNewMutualSinceNudge();
                    const updatedValue = useStore.getState().newMutualSinceNudge;
                    
                    console.log('✅ Mutual match from partner like - newMutualSinceNudge:', updatedValue);
                    
                    if (updatedValue >= 3) {
                      console.log('🚨 NUDGE TRIGGER: 3 mutual matches reached (from partner like)');
                      setTimeout(() => setShowNudgeModal(true), 500);
                    }
                  }, 0);
                } else {
                  console.log('❌ Not adding mutual match - user did not like this movie or already mutual');
                }
              } else {
                console.log('Not a mutual match - user has not liked this movie yet');
              }
              
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
            console.log('⚠️ Channel error');
          } else if (status === 'TIMED_OUT') {
            console.log('⚠️ Subscription timed out');
          } else if (status === 'CLOSED') {
            console.log('⚠️ Subscription closed (this is normal during cleanup)');
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

  // Fallback: Poll database for partner likes every 2 seconds
  useEffect(() => {
    if (session?.mode === 'dual' && session?.supabaseSession && session?.userId) {
      console.log('🔵 Setting up polling for partner likes');
      console.log('   Session ID:', session.supabaseSession.id);
      console.log('   User ID:', session.userId);
      console.log('   Mode:', session.mode);
      
      const pollPartnerLikes = async () => {
        if (!session.supabaseSession || !session.userId) {
          console.warn('⚠️ Cannot poll - missing session or userId');
          return;
        }
        
        try {
          console.log('🔵 Polling partner likes:', {
            sessionId: session.supabaseSession.id,
            userId: session.userId,
            table: 'movie_likes',
            query: `session_id=eq.${session.supabaseSession.id} AND user_id!=${session.userId}`
          });
          
          const { data, error } = await supabase
            .from('movie_likes')
            .select('*')
            .eq('session_id', session.supabaseSession.id)
            .neq('user_id', session.userId); // Only get partner's likes
          
          if (error) {
            console.error('❌ Error fetching partner likes:', {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
              status: (error as any).status,
              statusText: (error as any).statusText,
              response: (error as any).response,
              fullError: error
            });
            
            // Check if it's a table not found error
            if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
              console.error('❌ TABLE NOT FOUND: movie_likes table does not exist in Supabase');
              console.error('   Please create the table using the SQL schema in SUPABASE_SETUP.md');
            }
            
            // Check if it's a permission error
            if (error.code === '42501' || error.message?.includes('permission denied')) {
              console.error('❌ PERMISSION DENIED: Check Row Level Security (RLS) policies');
              console.error('   The anon key may not have permission to read movie_likes');
            }
            
            // Don't return - continue with empty array to allow retry
            return;
          }
          
          console.log('📥 Polled partner likes - count:', data?.length || 0);
          console.log('📥 Raw data from DB:', data);
          
          if (data && data.length > 0) {
            console.log('📥 Polled partner likes from DB:', data.length);
            console.log('📥 Sample like record:', data[0]);
            
            // Update partnerLiked with movies from database
            const partnerMovies = data
              .map((like: any) => {
                console.log('📥 Processing like record:', {
                  user_id: like.user_id,
                  movie_id: like.movie_id,
                  has_movie_data: !!like.movie_data,
                  movie_data_type: typeof like.movie_data
                });
                return like.movie_data;
              })
              .filter((movie: any) => {
                const isValid = movie && movie.id && movie.title;
                if (!isValid) {
                  console.warn('⚠️ Filtered out invalid movie:', movie);
                }
                return isValid;
              }); // Filter out null/undefined/empty objects
            
            // Remove duplicates based on movie ID
            const uniqueMovies = partnerMovies.filter((movie, index, self) => 
              index === self.findIndex(m => m && m.id === movie.id)
            );
            
            console.log('📥 Partner movies after processing:', uniqueMovies.length);
            console.log('📥 Partner movies:', uniqueMovies.map((m: any) => ({ title: m?.title, id: m?.id })));
            
            if (uniqueMovies.length > 0) {
              setPartnerLiked(uniqueMovies);
              console.log('✅ Updated partnerLiked from polling:', uniqueMovies.map((m: any) => ({ title: m?.title, id: m?.id })));
            } else {
              console.warn('⚠️ No valid partner movies found after processing');
            }
            
            // Check for retroactive mutual matches: Did user already like any of the partner's movies?
            const currentUserLikedIds = userLikedRef.current
              .filter(m => m && m.id)
              .map(m => m.id);
            
            console.log('🔍 POLLING: Checking for retroactive mutual matches...');
            console.log('Current user liked IDs:', currentUserLikedIds);
            console.log('Current user liked movies:', userLikedRef.current.map(m => ({ title: m.title, id: m.id })));
            console.log('Partner liked IDs:', uniqueMovies.map((m: any) => m.id));
            console.log('Partner liked movies:', uniqueMovies.map((m: any) => ({ title: m?.title, id: m?.id })));
            
            const newMutualMatches = uniqueMovies.filter((partnerMovie: any) => {
              const isMutual = currentUserLikedIds.includes(partnerMovie.id);
              const alreadyMutual = mutualLikedRef.current.some(m => m.id === partnerMovie.id);
              console.log(`Checking ${partnerMovie?.title}: isMutual=${isMutual}, alreadyMutual=${alreadyMutual}`);
              return isMutual && !alreadyMutual;
            });
            
            if (newMutualMatches.length > 0) {
              console.log('🎉 POLLING: Found retroactive mutual matches!', newMutualMatches.map((m: any) => m.title));
              
              // Count how many NEW matches we're adding
              const countNewMutual = newMutualMatches.length;
              console.log('📊 Adding', countNewMutual, 'new mutual match(es)');
              
              setMutualLiked(prevMutual => {
                const newMutualLiked = [...prevMutual];
                newMutualMatches.forEach((newMatch: any) => {
                  if (!newMutualLiked.some(m => m.id === newMatch.id)) {
                    console.log('✅ Adding mutual match from polling:', newMatch.title);
                    newMutualLiked.push(newMatch);
                  }
                });
                console.log('💾 Updated mutualLiked state:', newMutualLiked.map(m => ({ title: m.title, id: m.id })));
                return newMutualLiked;
              });
              
              // Defer state updates to avoid React render errors
              setTimeout(() => {
                // Update session with mutual likes - use the updated state
                const finalMutualLikes = [...mutualLikedRef.current, ...newMutualMatches];
                console.log('💾 STORING MUTUAL MATCHES IN SESSION (from polling):', finalMutualLikes.length, 'matches');
                console.log('💾 Mutual match movies:', finalMutualLikes.map(m => ({ title: m.title, id: m.id })));
                setDualModeState({ mutualLikes: finalMutualLikes });
                
                // Verify it was stored
                const storedSession = useStore.getState().session;
                console.log('✅ VERIFIED: Session mutualLikes count:', storedSession?.mutualLikes?.length || 0);
                
                // Increment counter ONCE for all new matches
                for (let i = 0; i < countNewMutual; i++) {
                  incrementNewMutualSinceNudge();
                }
                
                const updatedValue = useStore.getState().newMutualSinceNudge;
                console.log('✅ Updated mutual matches from polling - newMutualSinceNudge:', updatedValue);
                
                if (updatedValue >= 3) {
                  console.log('🚨 NUDGE TRIGGER: 3 mutual matches reached (from polling)');
                  setTimeout(() => setShowNudgeModal(true), 500);
                }
              }, 0);
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      };
      
      // Poll immediately
      pollPartnerLikes();
      
      // Set up interval
      const interval = setInterval(pollPartnerLikes, 2000); // Every 2 seconds
      
      return () => clearInterval(interval);
    }
  }, [session?.mode, session?.supabaseSession?.id, session?.userId]);
  
  // Listen for partner's actions via Supabase realtime
  useEffect(() => {
    if (session?.mode === 'dual' && session?.supabaseSession && isSessionRunning) {
      console.log('📡 Setting up realtime listeners for partner actions...');
      
      const channelConfig = {
        broadcast: { self: true },
        presence: { key: session.userId }
      };
      
      const redirectChannel = supabase.channel(`session-redirect-${session.supabaseSession.id}`, {
        config: channelConfig
      });
      
      const keepBrowsingChannel = supabase.channel(`session-keep-browsing-${session.supabaseSession.id}`, {
        config: channelConfig
      });
      
      // Listen for partner clicking "Shortlist Now"
      redirectChannel
        .on('broadcast', { event: 'redirect-to-shortlist' }, (payload) => {
          console.log('🚨 Partner clicked Shortlist Now! Payload:', payload);
          
          if (hasRedirectedRef.current) {
            console.log('Already redirected, ignoring');
            return;
          }
          
          hasRedirectedRef.current = true;
          
          // Get mutual matches from payload or use local ones
          const payloadMatches = payload.payload?.mutualMatches;
          
          setTimeout(() => {
            if (payloadMatches && Array.isArray(payloadMatches)) {
              console.log('Loading', payloadMatches.length, 'mutual matches from partner broadcast');
              setDualModeState({ mutualLikes: payloadMatches });
            } else if (mutualLiked.length > 0) {
              console.log('Using', mutualLiked.length, 'local mutual likes');
              setDualModeState({ mutualLikes: mutualLiked });
            }
            
            setTimeout(() => {
              console.log('✈️ Navigating to shortlist screen...');
              setCurrentScreen('shortlist');
            }, 100);
          }, 0);
        })
        .subscribe((status) => {
          console.log('📡 Redirect listener status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Subscribed to redirect channel');
          }
        });
      
      // Listen for partner clicking "Keep Browsing"
      keepBrowsingChannel
        .on('broadcast', { event: 'keep-browsing' }, (payload) => {
          console.log('👥 Partner clicked Keep Browsing! Closing modal and resetting counter...');
          
          // Close the modal and reset counters
          setShowNudgeModal(false);
          resetNewMutualSinceNudge();
          setHasLikedCurrentMovie(false);
          
          console.log('✅ Partner keep browsing handled, both users continuing with deck');
          console.log('Counter reset to 0. Next nudge after 3 MORE mutual matches.');
        })
        .subscribe((status) => {
          console.log('📡 Keep browsing listener status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Subscribed to keep browsing channel');
          }
        });
      
      return () => {
        console.log('Cleaning up realtime listeners');
        redirectChannel.unsubscribe();
        keepBrowsingChannel.unsubscribe();
      };
    }
  }, [session?.mode, session?.supabaseSession?.id, isSessionRunning, setCurrentScreen, setDualModeState, mutualLiked.length, resetNewMutualSinceNudge, setShowNudgeModal, setHasLikedCurrentMovie, session?.userId]);

  // Watch for shared newMutualSinceNudge changes across both users
  useEffect(() => {
    if (session?.mode === 'dual' && session?.supabaseSession) {
      console.log('Setting up session watch for shared mutual matches...');
      
      const subscription = supabase
        .channel(`session-watch-${session.supabaseSession.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'sessions',
            filter: `id=eq.${session.supabaseSession.id}`
          },
          (payload) => {
            console.log('📡 Session updated:', payload);
            
            // Check if mutual matches were updated
            if (payload.new.mutual_matches) {
              const mutualMatches = payload.new.mutual_matches as number;
              console.log('🎯 New mutual matches count from session:', mutualMatches);
              
              // If other user has 3 mutual matches, show nudge on this device too
              if (mutualMatches >= 3 && newMutualSinceNudgeRef.current < 3) {
                console.log('🚨 NUDGE triggered from partner device!');
                setTimeout(() => setShowNudgeModal(true), 500);
              }
            }
          }
        )
        .subscribe();
      
      return () => {
        console.log('Cleaning up session watch subscription');
        subscription.unsubscribe();
      };
    }
  }, [session?.mode, session?.supabaseSession?.id]);

  // Helper function to render card content
  const renderCardContent = (movie: Movie, isNextCard: boolean = false) => (
    <div className="bg-[#0a0a0a] rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col border border-[#1a1a1a]" style={{ height: '100%', maxHeight: '100%', minHeight: 0 }}>
      {/* Poster Image - Fixed at top with proper aspect ratio and gradient fade */}
      <div 
        className="relative w-full flex-shrink-0 cursor-pointer"
        style={{ aspectRatio: '2/3', minHeight: '180px', maxHeight: '60%' }}
        onTouchEnd={(e) => {
          // Only toggle if user tapped (not swiped)
          if (swipeDelta.x === 0 && swipeDelta.y === 0 && !isDragging && !isNextCard) {
            e.stopPropagation();
            setIsDescriptionExpanded(!isDescriptionExpanded);
          }
        }}
        onClick={(e) => {
          // Only toggle if user clicked (not swiped)
          if (swipeDelta.x === 0 && swipeDelta.y === 0 && !isDragging && !isNextCard) {
            e.stopPropagation();
            setIsDescriptionExpanded(!isDescriptionExpanded);
          }
        }}
      >
        <img
          src={movie.poster_url}
          alt={movie.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = '/placeholder-movie.jpg';
          }}
        />
        {/* Smooth gradient fade only at bottom edge to blend with info section */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" style={{ height: '60px' }} />
      </div>
      
      {/* Text Content Section - Scrollable and expandable */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div 
          className="flex-1 overflow-y-auto min-h-0"
          style={{ 
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div className="p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 pb-4">
            {/* Genres - Outlined red pills with hover animation */}
            <div className="flex flex-wrap gap-2">
              {movie.genres.map((genre, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 border border-red-500/60 text-red-400 text-xs rounded-full font-light hover:border-red-500 hover:bg-red-500/10 hover:text-red-300 transition-all duration-300 cursor-default"
                >
                  {genre}
                </span>
              ))}
            </div>
            
            {/* Year and Rating - One row with flex spacing */}
            <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm">
              <span className="font-light">{movie.year}</span>
              <span className="text-gray-600">•</span>
              <span className="text-red-500 font-light flex items-center gap-1">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                </svg>
                {movie.rating % 1 === 0 ? movie.rating.toFixed(0) : movie.rating.toFixed(1)}/10
              </span>
            </div>
            
            {/* Title - Semi-bold white with slight glow */}
            <h2 className="text-lg sm:text-xl font-light text-white leading-tight" style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.1)' }}>
              {movie.title}
            </h2>
            
            {/* Description - Line-clamped with gentle fade */}
            <div className="relative description-area">
              <div
                className={`text-gray-400 text-xs sm:text-sm leading-relaxed ${!isDescriptionExpanded || isNextCard ? 'line-clamp-3' : ''}`}
                style={(!isDescriptionExpanded || isNextCard) ? {
                  maskImage: 'linear-gradient(to bottom, black 0%, black 85%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 85%, transparent 100%)',
                } : {}}
              >
                {movie.synopsis || 'No description available.'}
              </div>
              {movie.synopsis && movie.synopsis.length > 150 && !isNextCard && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDescriptionExpanded(!isDescriptionExpanded);
                  }}
                  className="read-more-button mt-2 text-red-400 text-xs sm:text-sm font-light hover:text-red-300 transition-colors cursor-pointer"
                >
                  {isDescriptionExpanded ? 'Read less' : 'Read more'}
                </button>
              )}
            </div>
            
            {/* Streaming Platforms - Flat red outline pills */}
            {movie.ott && movie.ott.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {movie.ott.map((platform, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 border border-red-500/60 text-red-400 text-xs sm:text-sm rounded-full font-light hover:bg-red-500 hover:border-red-500 hover:text-white transition-all duration-300 cursor-default"
                  >
                    {platform}
                  </span>
                ))}
              </div>
            )}
            
            {/* Adult Content Warning */}
            {movie.adult && (
              <div className="text-red-500/80 text-xs font-light pt-1">
                ⚠️ Adult Content
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Calculate overlay opacity based on swipe distance
  const likeOpacity = useTransform(x, [50, 100], [0, 1], { clamp: true });
  const nopeOpacity = useTransform(x, [-100, -50], [1, 0], { clamp: true });
  
  // Get next movie for stacking effect
  const nextMoviePreview = movies[currentMovieIndex + 1];
  
  // Reset x position when movie changes
  useEffect(() => {
    // Reset all animation states immediately when movie index changes
    x.set(0);
    cardOpacity.set(1);
    setIsExiting(false);
    setPendingSwipe(null);
    exitDirectionRef.current = null;
    setIsDragging(false);
    setSwipeDelta({ x: 0, y: 0 });
  }, [currentMovieIndex]);

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
    <div 
      className="bg-black overflow-hidden touch-none" 
      style={{ 
        height: '100vh', 
        maxHeight: '100vh', 
        display: 'grid', 
        gridTemplateRows: 'auto 1fr auto',
        overflowY: 'hidden',
        overflowX: 'hidden',
        touchAction: 'none',
        position: 'fixed',
        width: '100%',
        top: 0,
        left: 0
      }}
    >
      {/* Simple Rules Popup - Glassmorphism with blurred background */}
      {showSimpleRulesPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
            <h2 className="text-xl sm:text-2xl font-light text-white mb-3" style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.1)' }}>
              Rules
            </h2>
            <p 
              className="text-base sm:text-lg text-gray-300 italic font-light leading-relaxed mb-6"
              style={{
                letterSpacing: '0.02em',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              Swipe right to yes. Left to no. Revolutionary I know :)
            </p>
            <button
              onClick={() => setShowSimpleRulesPopup(false)}
              className="bg-white text-black font-light py-2.5 px-8 rounded-full hover:bg-red-50 active:bg-red-100 transition-all duration-300 text-sm sm:text-base"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* Header - Make likes and timer more visible */}
      <div className="flex justify-between items-center p-2 bg-black/90 backdrop-blur-sm border-b border-gray-800" style={{ minHeight: 'fit-content' }}>
        <div className="text-white font-bold text-sm bg-red-600 px-3 py-1.5 rounded-full">
          {session?.mode === 'dual' ? (
            <>❤️ {(() => {
              // Use the maximum of session and local state to ensure we show the correct count
              const sessionCount = session?.mutualLikes?.length || 0;
              const localCount = mutualLiked.length;
              const displayCount = Math.max(sessionCount, localCount);
              
              // Debug logging in development
              if (process.env.NODE_ENV === 'development' && displayCount === 0 && (userLiked.length > 0 || partnerLiked.length > 0)) {
                console.log('🔍 Mutual count debug (display):', {
                  sessionCount,
                  localCount,
                  displayCount,
                  userLikedCount: userLiked.length,
                  partnerLikedCount: partnerLiked.length,
                  userLikedIds: userLiked.map(m => m.id),
                  partnerLikedIds: partnerLiked.map(m => m.id),
                  intersection: partnerLiked.filter(m => userLiked.some(u => u.id === m.id)).map(m => m.title)
                });
              }
              
              return displayCount;
            })()} mutual</>
          ) : (
            <>❤️ {likedMovies.length}</>
          )}
        </div>
        {/* Swipe instruction - centered */}
        <div className="text-center flex-1">
          <p className="text-gray-400 text-sm italic font-light">
            ← Swipe →
          </p>
        </div>
        <div className="text-white font-bold text-sm bg-gray-700 px-3 py-1.5 rounded-full">
          ⏰ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>

      {/* Movie Card Container */}
      <div 
        className="flex items-center justify-center py-1 px-0 touch-none overflow-hidden relative" 
        style={{ 
          minHeight: 0, 
          maxHeight: '100%', 
          overflow: 'hidden',
          overflowY: 'hidden',
          overflowX: 'hidden',
          touchAction: 'pan-x',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {/* Next Card Preview (Stacking Effect) */}
        {nextMoviePreview && (
          <div
            className="absolute w-full max-w-[95%] sm:max-w-[399px] mx-auto"
            style={{
              height: '100%',
              maxHeight: '100%',
              width: '100%',
              transform: 'scale(0.95)',
              opacity: 0.6,
              zIndex: 0,
              pointerEvents: 'none',
            }}
          >
            {renderCardContent(nextMoviePreview, true)}
          </div>
        )}

        {/* Current Card with Animations */}
        <AnimatePresence mode="wait" initial={false}>
          {currentMovie && (
          <motion.div
            key={currentMovieIndex}
            className="relative w-full max-w-[95%] sm:max-w-[399px] mx-auto touch-auto"
            style={{
              height: '100%',
              maxHeight: '100%',
              width: '100%',
              x,
              rotate,
              zIndex: 1,
            }}
            drag={isExiting ? false : "x"}
            dragConstraints={{ left: -300, right: 300 }}
            dragElastic={0.2}
            whileDrag={{ cursor: 'grabbing' }}
            onDragStart={() => {
              setIsDragging(true);
            }}
            onDrag={(event, info) => {
              setSwipeDelta({ x: info.offset.x, y: 0 });
            }}
              onDragEnd={(event, info) => {
                // Prevent multiple swipes during exit animation
                if (isExiting) {
                  return;
                }
                
                setIsDragging(false);
                const threshold = 100;
                
                // If drag didn't move much, just reset
                if (Math.abs(info.offset.x) < 10) {
                  x.set(0);
                  setSwipeDelta({ x: 0, y: 0 });
                  return;
                }
                
                if (info.offset.x > threshold) {
                  // Swipe right - like
                  setIsExiting(true);
                  setPendingSwipe('right');
                  exitDirectionRef.current = 'right';
                  // Immediately update movie index to trigger AnimatePresence exit
                  handleSwipeRight();
                } else if (info.offset.x < -threshold) {
                  // Swipe left - skip
                  setIsExiting(true);
                  setPendingSwipe('left');
                  exitDirectionRef.current = 'left';
                  // Immediately update movie index to trigger AnimatePresence exit
                  handleSwipeLeft();
                } else {
                  // Spring back to center
                  x.set(0);
                  setSwipeDelta({ x: 0, y: 0 });
                }
              }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ 
              scale: 1, 
              y: 0,
              opacity: 1
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.8,
              x: exitDirectionRef.current === 'right' ? 1000 : exitDirectionRef.current === 'left' ? -1000 : 0,
              rotate: exitDirectionRef.current === 'right' ? 30 : exitDirectionRef.current === 'left' ? -30 : 0,
              transition: { duration: 0.3, ease: "easeInOut" }
            }}
            transition={{ duration: 0.3 }}
          >
              {renderCardContent(currentMovie)}
              
              {/* LIKE Overlay */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                style={{
                  opacity: likeOpacity,
                  rotate,
                }}
              >
                <div
                  className="text-6xl sm:text-7xl font-bold border-4 border-green-500 text-green-500 px-8 py-4 rounded-2xl"
                  style={{
                    textShadow: '0 0 20px rgba(34, 197, 94, 0.5)',
                    WebkitTextStroke: '2px rgba(34, 197, 94, 0.8)',
                  }}
                >
                  LIKE
                </div>
              </motion.div>

              {/* NOPE Overlay */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                style={{
                  opacity: nopeOpacity,
                  rotate,
                }}
              >
                <div
                  className="text-6xl sm:text-7xl font-bold border-4 border-red-500 text-red-500 px-8 py-4 rounded-2xl"
                  style={{
                    textShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
                    WebkitTextStroke: '2px rgba(239, 68, 68, 0.8)',
                  }}
                >
                  NOPE
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      {/* Nudge Modal - Dark cinematic theme */}
      {showNudgeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
            <h2 className="text-2xl sm:text-3xl font-light text-white mb-3" style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.1)' }}>
              Certified vibe check: solid picks all around.
            </h2>
            <p className="text-gray-400 mb-6 text-sm sm:text-base italic">
              What would you like to do?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleNudgeAction('continue')}
                className="flex-1 border border-gray-700 text-gray-400 font-light py-3 px-4 rounded-full hover:border-gray-600 hover:text-white transition-all duration-300"
              >
                Keep Browsing
              </button>
              <button
                onClick={() => handleNudgeAction('shortlist')}
                className="flex-1 border border-red-500/60 text-red-400 font-light py-3 px-4 rounded-full hover:bg-red-500 hover:border-red-500 hover:text-white transition-all duration-300"
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