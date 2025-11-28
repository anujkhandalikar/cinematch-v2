'use client';

import { useState, useEffect } from 'react';
import { useStore, UserPreferences } from '@/lib/store';
import { fetchFilteredMovies } from '@/lib/movies';

export default function ReadyScreen() {
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);
  const session = useStore((state) => state.session);
  const updateSessionReady = useStore((state) => state.updateSessionReady);
  const subscribeToRealtimeUpdates = useStore((state) => state.subscribeToRealtimeUpdates);
  const refreshSessionState = useStore((state) => state.refreshSessionState);
  const combinePreferences = useStore((state) => state.combinePreferences);
  const setMovies = useStore((state) => state.setMovies);
  const [isReady, setIsReady] = useState(false);
  const [partnerReady, setPartnerReady] = useState(false);
  const [isPreloadingMovies, setIsPreloadingMovies] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Subscribe to real-time updates when component mounts
  useEffect(() => {
    if (session?.supabaseSession) {
      console.log('ReadyScreen: Setting up Firebase subscriptions');
      subscribeToRealtimeUpdates();
      
      // Also refresh session state immediately to get latest data
      refreshSessionState();
      
      // Set up periodic refresh as backup (more frequent for better responsiveness)
      const refreshInterval = setInterval(() => {
        console.log('Periodic refresh: Checking session state');
        refreshSessionState();
      }, 2000); // Check every 2 seconds for better responsiveness
      
      return () => {
        clearInterval(refreshInterval);
        console.log('ReadyScreen: Cleaning up subscriptions');
        const unsubscribeFromRealtimeUpdates = useStore.getState().unsubscribeFromRealtimeUpdates;
        unsubscribeFromRealtimeUpdates();
      };
    } else {
      console.log('ReadyScreen: No Firebase session, using fallback mode');
    }
  }, [session?.supabaseSession?.id, subscribeToRealtimeUpdates, refreshSessionState]);

  // Update partner ready state based on session data
  useEffect(() => {
    if (session?.supabaseSession) {
      // Supabase mode - use real-time data
      const supabaseSession = session.supabaseSession;
      const currentPartnerReady = session.isCreator ? supabaseSession.joiner_ready : supabaseSession.creator_ready;
      
      console.log('ReadyScreen: Session state update', {
        isCreator: session.isCreator,
        creatorReady: supabaseSession.creator_ready,
        joinerReady: supabaseSession.joiner_ready,
        currentPartnerReady,
        partnerReady
      });
      
      setPartnerReady(currentPartnerReady);
      
      // Combine preferences when both users are ready
      if (supabaseSession.creator_ready && supabaseSession.joiner_ready) {
        console.log('Both users ready, combining preferences');
        if (session.creatorPreferences && session.joinerPreferences) {
          const combinedPrefs = combinePreferences(
            session.creatorPreferences, 
            session.joinerPreferences
          );
          // Update session with combined preferences
          useStore.setState((state) => ({
            session: state.session ? {
              ...state.session,
              combinedPreferences: combinedPrefs
            } : null
          }));
        }
      }
    } else {
      // Fallback mode - simulate partner ready after delay
      if (isReady && !partnerReady) {
        console.log('Fallback mode: Simulating partner ready after delay');
        const timer = setTimeout(() => {
          setPartnerReady(true);
          console.log('Fallback mode: Partner is now ready');
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [session?.supabaseSession?.creator_ready, session?.supabaseSession?.joiner_ready, session?.isCreator, session?.creatorPreferences, session?.joinerPreferences, combinePreferences, isReady, partnerReady]);

  // Listen to store changes for partner ready state  
  useEffect(() => {
    const updatePartnerState = () => {
      const currentSession = useStore.getState().session;
      if (currentSession?.supabaseSession && session?.isCreator !== undefined) {
        const currentPartnerReady = session.isCreator 
          ? currentSession.supabaseSession.joiner_ready 
          : currentSession.supabaseSession.creator_ready;
        setPartnerReady(currentPartnerReady);
      }
    };
    
    const unsubscribe = useStore.subscribe(updatePartnerState);
    return unsubscribe;
  }, [session?.isCreator]);

  // Reset countdown when both users become ready
  useEffect(() => {
    if (session?.mode === 'dual' && isReady && partnerReady && countdown === 3) {
      console.log('Both users ready, countdown will start');
      // Countdown is already 3, now it will start ticking down
    }
  }, [isReady, partnerReady, session?.mode, countdown]);

  // Auto-start game when both users are ready (with live countdown)
  useEffect(() => {
    // Only trigger if all conditions are met AND session is dual mode
    // Support both Supabase mode and fallback mode
    const shouldAutoStart = session?.mode === 'dual' && isReady && partnerReady;
    
    if (shouldAutoStart && countdown > 0) {
      console.log(`⏰ Countdown: ${countdown} seconds remaining`);
      
      const timer = setTimeout(() => {
        if (countdown > 1) {
          setCountdown(countdown - 1);
        } else {
          console.log('✅✅✅ Starting game NOW!');
          setCurrentScreen('swipe');
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isReady, partnerReady, countdown, session?.mode, setCurrentScreen]);

  // Preload movies when both users are ready (ONLY for single mode)
  // For dual mode, let the swipe screen handle deck creation and sharing
  useEffect(() => {
    if (session?.supabaseSession && 
        session.supabaseSession.creator_ready && 
        session.supabaseSession.joiner_ready && 
        !isPreloadingMovies &&
        session.mode === 'single') {  // ONLY preload for single mode
      
      console.log('Both users ready, preloading movies for single mode...');
      setIsPreloadingMovies(true);
      
      // Get combined preferences
      const base = (session.combinedPreferences || session.creatorPreferences) as Partial<UserPreferences> | undefined;
      const preferences: Partial<UserPreferences> = {
        genres: base?.genres ?? [],
        ottPlatforms: base?.ottPlatforms ?? [],
        languages: base?.languages ?? [],
        adultContent: base?.adultContent ?? false,
        releaseYear: typeof base?.releaseYear === 'number' ? base?.releaseYear : undefined,
        highRatedOnly: base?.highRatedOnly ?? false,
        imdbTop250Movies: base?.imdbTop250Movies ?? false,
        releaseAfterMonths: base?.releaseAfterMonths ?? null,
        moodIncludeGenres: base?.moodIncludeGenres ?? [],
        moodExcludeGenres: base?.moodExcludeGenres ?? [],
        moodPreset: base?.moodPreset ?? null,
      };
      
      // Preload movies in background
      fetchFilteredMovies(preferences, (movies, isComplete) => {
        console.log(`Preloaded ${movies.length} movies, complete: ${isComplete}`);
        setMovies(movies);
        
        if (isComplete) {
          setIsPreloadingMovies(false);
        }
      }).catch(error => {
        console.error('Error preloading movies:', error);
        setIsPreloadingMovies(false);
      });
    } else if (session?.mode === 'dual') {
      console.log('Dual mode: Skipping preload. Swipe screen will handle deck creation.');
    }
  }, [session?.supabaseSession?.creator_ready, session?.supabaseSession?.joiner_ready, isPreloadingMovies, setMovies, session?.mode]);

  const markReady = async () => {
    setIsReady(true);
    if (session?.supabaseSession) {
      // Supabase mode - update database
      try {
        await updateSessionReady(true);
        console.log('Ready state updated in Supabase');
      } catch (error) {
        console.error('Error updating ready state:', error);
        setIsReady(false);
      }
    } else {
      // Fallback mode - just update local state
      console.log('Fallback mode: Ready state updated locally');
      useStore.setState((state) => ({
        session: state.session ? {
          ...state.session,
          isReady: true
        } : null
      }));
    }
  };

  const startSwiping = () => {
    if (isReady && partnerReady) {
      setCurrentScreen('swipe');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative">
      {/* Subtle radial gradient for depth */}
      <div 
        className="fixed inset-0 pointer-events-none z-0" 
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(239, 68, 68, 0.03) 0%, transparent 50%)',
        }}
      />
      
      <div className="max-w-2xl w-full relative z-10">
        {/* Back Button */}
        <button 
          onClick={() => setCurrentScreen('mode')}
          className="mb-6 text-gray-500 hover:text-red-400 transition-colors text-sm font-light"
        >
          ← Back
        </button>

        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-light text-white mb-3 tracking-tight" style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.1)' }}>
            Ready to Swipe!
          </h1>
          <p className="text-gray-400 mb-10 sm:mb-12 font-light italic">Two humans. Zero chill. Infinite opinions.</p>
        </div>
        
        {session && (
          <div className="bg-[#121212] rounded-2xl p-6 sm:p-8 mb-8 border border-[#1a1a1a] hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-300">
            <h2 className="text-xl sm:text-2xl font-light text-white mb-6">Your Secret Code</h2>
            <div className="bg-[#0a0a0a] rounded-2xl p-6 sm:p-8 mb-6 border border-[#1a1a1a]">
              <p 
                className="text-4xl sm:text-5xl font-mono font-bold"
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: '0 0 30px rgba(239, 68, 68, 0.4)',
                }}
              >
                {session.code}
              </p>
            </div>
            <p className="text-gray-400 text-sm font-light">
              Share this with your partner to enter the cinematic arena.
            </p>
          </div>
        )}

        {/* Ready Status - Elevated card */}
        <div className="bg-[#121212] rounded-2xl p-6 sm:p-8 mb-8 border border-[#1a1a1a] hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-300">
          <h2 className="text-xl sm:text-2xl font-light text-white mb-6">Status Check</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 font-light">You:</span>
              <span className={`px-4 py-2 rounded-full text-sm font-light transition-all duration-300 ${
                isReady 
                  ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]' 
                  : 'bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a]'
              }`}>
                {isReady ? '✅ Locked and loaded' : '⏳ Not Ready'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300 font-light">Partner:</span>
              <span className={`px-4 py-2 rounded-full text-sm font-light transition-all duration-300 ${
                partnerReady 
                  ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]' 
                  : 'bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a]'
              }`}>
                {partnerReady ? '✅ Also pretending to have taste' : '⏳ Not Ready'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {!isReady ? (
            <button
              onClick={markReady}
              className="w-full bg-red-600 text-white font-light py-4 px-8 rounded-full hover:bg-red-700 active:bg-red-800 transition-all duration-300 text-lg shadow-[0_4px_20px_rgba(239,68,68,0.3)] hover:shadow-[0_6px_24px_rgba(239,68,68,0.4)] hover:translate-y-[-2px]"
            >
              I'm Ready! 🚀
            </button>
          ) : !partnerReady ? (
            <div className="text-center">
              <p className="text-gray-300 mb-6 font-light">Waiting for your partner to be ready...</p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-6"></div>
              {session?.supabaseSession && (
                <button
                  onClick={refreshSessionState}
                  className="bg-red-600 text-white px-5 py-2.5 rounded-full hover:bg-red-700 transition-all duration-300 text-sm font-light shadow-[0_4px_12px_rgba(239,68,68,0.3)] hover:shadow-[0_6px_16px_rgba(239,68,68,0.4)]"
                >
                  Refresh Status
                </button>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p 
                className="text-white font-light text-xl sm:text-2xl mb-6 tracking-tight"
                style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.1)' }}
              >
                {countdown === 3 ? 'Game starting in 3… 2… grab the popcorn…' : 
                 countdown === 2 ? 'Game starting in 2… grab the popcorn…' :
                 'Game starting in 1… grab the popcorn…'}
              </p>
              <div className="flex justify-center gap-3 mb-6">
                <div 
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    countdown === 3 
                      ? 'bg-red-600 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]' 
                      : 'bg-red-600/30'
                  }`}
                ></div>
                <div 
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    countdown === 2 
                      ? 'bg-red-600 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]' 
                      : 'bg-red-600/30'
                  }`}
                ></div>
                <div 
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    countdown === 1 
                      ? 'bg-red-600 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]' 
                      : 'bg-red-600/30'
                  }`}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
