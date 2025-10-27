'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
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

  // Subscribe to real-time updates when component mounts
  useEffect(() => {
    if (session?.supabaseSession) {
      console.log('ReadyScreen: Setting up Supabase subscriptions');
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
      console.log('ReadyScreen: No Supabase session, using fallback mode');
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
    const unsubscribe = useStore.subscribe(
      (state) => state.session?.supabaseSession,
      (supabaseSession) => {
        if (supabaseSession && session?.isCreator !== undefined) {
          const currentPartnerReady = session.isCreator ? supabaseSession.joiner_ready : supabaseSession.creator_ready;
          console.log('Store subscription: Partner ready state changed', {
            isCreator: session.isCreator,
            creatorReady: supabaseSession.creator_ready,
            joinerReady: supabaseSession.joiner_ready,
            currentPartnerReady
          });
          setPartnerReady(currentPartnerReady);
        }
      }
    );
    
    return unsubscribe;
  }, [session?.isCreator]);

  // Auto-start game when both users are ready (after 3 seconds)
  useEffect(() => {
    console.log('Auto-start check:', {
      'mode': session?.mode,
      'isReady': isReady,
      'partnerReady': partnerReady,
      'supabaseSession': !!session?.supabaseSession,
      'conditionMet': session?.mode === 'dual' && isReady && partnerReady && session?.supabaseSession
    });
    
    if (session?.mode === 'dual' && isReady && partnerReady && session?.supabaseSession) {
      console.log('✅ Both users ready, starting countdown to auto-start (3 seconds)');
      
      const countdown = setTimeout(() => {
        console.log('✅✅✅ 3 seconds elapsed, starting game NOW');
        setCurrentScreen('swipe');
      }, 3000); // 3000ms = 3 seconds
      
      return () => {
        console.log('Clearing countdown');
        clearTimeout(countdown);
      };
    }
  }, [session?.mode, isReady, partnerReady, session?.supabaseSession, setCurrentScreen]);

  // Preload movies when both users are ready
  useEffect(() => {
    if (session?.supabaseSession && 
        session.supabaseSession.creator_ready && 
        session.supabaseSession.joiner_ready && 
        !isPreloadingMovies) {
      
      console.log('Both users ready, preloading movies...');
      setIsPreloadingMovies(true);
      
      // Get combined preferences
      const preferences = session.combinedPreferences || session.creatorPreferences || {
        genres: [],
        ottPlatforms: [],
        adultContent: false
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
    }
  }, [session?.supabaseSession?.creator_ready, session?.supabaseSession?.joiner_ready, isPreloadingMovies, setMovies]);

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
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-white mb-4">Ready to Swipe!</h1>
        
        {session && (
          <div className="bg-gray-900 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Session Code</h2>
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-3xl font-mono font-bold text-red-500">{session.code}</p>
            </div>
            <p className="text-gray-400 text-sm">
              Share this code with your friend so they can join the same session
            </p>
          </div>
        )}

        {/* Ready Status */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Ready Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">You:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isReady ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'
              }`}>
                {isReady ? '✅ Ready' : '⏳ Not Ready'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Partner:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                partnerReady ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'
              }`}>
                {partnerReady ? '✅ Ready' : '⏳ Not Ready'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {!isReady ? (
            <button
              onClick={markReady}
              className="w-full bg-green-600 text-white font-bold py-4 px-8 rounded-full hover:bg-green-700 transition-all text-lg"
            >
              I'm Ready! 🚀
            </button>
          ) : !partnerReady ? (
            <div className="text-center">
              <p className="text-gray-300 mb-4">Waiting for your partner to be ready...</p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              {session?.supabaseSession && (
                <button
                  onClick={refreshSessionState}
                  className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-all text-sm"
                >
                  Refresh Status
                </button>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-white font-bold text-2xl mb-2">Game starting in 3 seconds...</p>
              <div className="flex justify-center gap-2 mb-4">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          
          <button
            onClick={() => setCurrentScreen('mode')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Mode Selection
          </button>
        </div>
      </div>
    </div>
  );
}
