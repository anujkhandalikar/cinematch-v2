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
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
  const [hasLikedCurrentMovie, setHasLikedCurrentMovie] = useState(false);
  
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
  
  useEffect(() => {
    newMutualSinceNudgeRef.current = newMutualSinceNudge;
  }, [newMutualSinceNudge]);
  
  const startPos = useRef({ x: 0, y: 0 });
  const currentMovie = movies[currentMovieIndex];
  
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
      
      // Also check if this movie is already in mutualLiked to prevent duplicates
      const alreadyMutual = mutualLiked.some(movie => movie.id === currentMovie.id);
      
      // Check for mutuality by querying database directly (not from local state)
      let isMutual = false;
      if (session?.supabaseSession && session?.userId) {
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
          console.error('Error checking mutuality in database:', err);
        }
      }
      
      if (isMutual && !alreadyMutual) {
        console.log('🎉 MUTUAL MATCH FOUND:', currentMovie.title);
        const newMutualLiked = [...mutualLiked, currentMovie];
        setMutualLiked(newMutualLiked);
        
        // Defer all state updates to avoid React render errors
        setTimeout(() => {
          // Update session with mutual likes
          setDualModeState({ mutualLikes: newMutualLiked });
          
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
      console.log('Setting up polling for partner likes');
      
      const pollPartnerLikes = async () => {
        if (!session.supabaseSession || !session.userId) return;
        
        try {
          const { data, error } = await supabase
            .from('movie_likes')
            .select('*')
            .eq('session_id', session.supabaseSession.id)
            .neq('user_id', session.userId); // Only get partner's likes
          
          if (error) {
            console.error('Error fetching partner likes:', error);
            return;
          }
          
          if (data && data.length > 0) {
            console.log('📥 Polled partner likes from DB:', data.length);
            
            // Update partnerLiked with movies from database
            const partnerMovies = data
              .map((like: any) => like.movie_data)
              .filter((movie: any) => movie && movie.id && movie.title); // Filter out null/undefined/empty objects
            
            // Remove duplicates based on movie ID
            const uniqueMovies = partnerMovies.filter((movie, index, self) => 
              index === self.findIndex(m => m && m.id === movie.id)
            );
            
            setPartnerLiked(uniqueMovies);
            console.log('✅ Updated partnerLiked from polling:', uniqueMovies.map((m: any) => ({ title: m?.title, id: m?.id })));
            
            // Check for retroactive mutual matches: Did user already like any of the partner's movies?
            const currentUserLikedIds = userLikedRef.current
              .filter(m => m && m.id)
              .map(m => m.id);
            
            console.log('🔍 POLLING: Checking for retroactive mutual matches...');
            console.log('Current user liked IDs:', currentUserLikedIds);
            console.log('Partner liked IDs:', uniqueMovies.map((m: any) => m.id));
            
            const newMutualMatches = uniqueMovies.filter((partnerMovie: any) => {
              const isMutual = currentUserLikedIds.includes(partnerMovie.id);
              const alreadyMutual = mutualLikedRef.current.some(m => m.id === partnerMovie.id);
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
                return newMutualLiked;
              });
              
              // Defer state updates to avoid React render errors
              setTimeout(() => {
                // Update session with mutual likes
                setDualModeState({ mutualLikes: [...mutualLikedRef.current, ...newMutualMatches] });
                
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
      {/* Header - Make likes and timer more visible */}
      <div className="flex justify-between items-center p-4 bg-black/90 backdrop-blur-sm sticky top-0 z-40 border-b border-gray-800">
        <div className="text-white font-bold text-base sm:text-lg bg-red-600 px-4 py-2 rounded-full">
          {session?.mode === 'dual' ? (
            <>❤️ {mutualLiked.length} mutual</>
          ) : (
            <>❤️ {likedMovies.length}</>
          )}
        </div>
        <div className="text-white font-bold text-base sm:text-lg bg-green-600 px-4 py-2 rounded-full">
          ⏰ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>

      {/* Movie Card */}
      <div className="flex-1 flex items-center justify-center p-1 sm:p-4 touch-none">
        <div
          className="relative w-full max-w-[295px] sm:max-w-[399px] mx-auto touch-auto"
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
          {/* Tap to expand description - overlay that doesn't interfere with swiping */}
          <div
            onTouchEnd={(e) => {
              // Only toggle if user tapped (not swiped)
              if (swipeDelta.x === 0 && swipeDelta.y === 0 && !isDragging) {
                e.stopPropagation();
                setIsDescriptionExpanded(!isDescriptionExpanded);
              }
            }}
            onClick={(e) => {
              // Only toggle if user clicked (not swiped)
              if (swipeDelta.x === 0 && swipeDelta.y === 0 && !isDragging) {
                e.stopPropagation();
                setIsDescriptionExpanded(!isDescriptionExpanded);
              }
            }}
            className="absolute inset-0 z-10 cursor-pointer"
            style={{ 
              pointerEvents: (swipeDelta.x === 0 && swipeDelta.y === 0) ? 'auto' : 'none',
              touchAction: 'none'
            }}
          />
          <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ height: '600px', maxHeight: '80vh' }}>
            {/* Poster section - shrinks when description expands */}
            <div 
              className="relative flex-shrink transition-all duration-300"
              style={{ 
                height: isDescriptionExpanded ? '35%' : '60%',
                minHeight: isDescriptionExpanded ? '180px' : '300px'
              }}
            >
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
            
            {/* Text section - expands when description expands */}
            <div 
              className="p-2 sm:p-4 flex-1 overflow-y-auto transition-all duration-300"
              style={{ 
                height: isDescriptionExpanded ? '65%' : '40%',
                maxHeight: isDescriptionExpanded ? '420px' : '240px'
              }}
            >
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
              
              {/* Synopsis - Expandable */}
              <div className="mb-2 sm:mb-3">
                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                  {isDescriptionExpanded 
                    ? currentMovie.synopsis
                    : currentMovie.synopsis.length > 80 
                    ? `${currentMovie.synopsis.substring(0, 80)}...` 
                    : currentMovie.synopsis}
                </p>
                {currentMovie.synopsis.length > 80 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDescriptionExpanded(!isDescriptionExpanded);
                    }}
                    className="text-red-400 text-xs mt-1 hover:text-red-300 transition-colors"
                  >
                    {isDescriptionExpanded ? 'Show less' : 'Tap to read more'}
                  </button>
                )}
              </div>
              
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