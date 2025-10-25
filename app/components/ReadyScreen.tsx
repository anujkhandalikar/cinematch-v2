'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';

export default function ReadyScreen() {
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);
  const session = useStore((state) => state.session);
  const setSession = useStore((state) => state.setSession);
  const combinePreferences = useStore((state) => state.combinePreferences);
  const [isReady, setIsReady] = useState(false);
  const [partnerReady, setPartnerReady] = useState(false);

  // Simulate partner ready state (in real app, this would be from server)
  useEffect(() => {
    if (session && isReady) {
      // Simulate partner becoming ready after 2 seconds
      const timer = setTimeout(() => {
        setPartnerReady(true);
        
        // Combine preferences when both users are ready
        if (session.creatorPreferences && session.joinerPreferences) {
          const combinedPrefs = combinePreferences(
            session.creatorPreferences, 
            session.joinerPreferences
          );
          setSession({
            ...session,
            combinedPreferences: combinedPrefs
          });
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [session, isReady, combinePreferences, setSession]);

  const markReady = () => {
    setIsReady(true);
    if (session) {
      setSession({ ...session, isReady: true });
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            </div>
          ) : (
            <button
              onClick={startSwiping}
              className="w-full bg-red-600 text-white font-bold py-4 px-8 rounded-full hover:bg-red-700 transition-all text-lg"
            >
              Start Swiping Together! 🎬
            </button>
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
