'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';

export default function SessionScreen() {
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);
  const setSession = useStore((state) => state.setSession);
  const [sessionCode, setSessionCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const createSession = () => {
    const sessionId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const sharedSeed = Math.random(); // Same seed for both users
    const session = {
      id: sessionId,
      mode: 'dual' as const,
      code: sessionId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      seed: sharedSeed, // Same seed ensures same movie sequence
      isCreator: true,
      isReady: false,
      partnerReady: false,
      mutualLikes: []
    };
    setSession(session);
    setCurrentScreen('ready');
  };

  const joinSession = () => {
    if (sessionCode.trim()) {
      // For joining, we'll use the same seed as the creator
      // In a real app, this would be fetched from the server
      const session = {
        id: sessionCode.trim(),
        mode: 'dual' as const,
        code: sessionCode.trim(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        seed: 0.5, // Same seed as creator for same movie sequence
        isCreator: false,
        isReady: false,
        partnerReady: false,
        mutualLikes: []
      };
      setSession(session);
      setCurrentScreen('ready');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-white mb-4">Dual Mode</h1>
        <p className="text-gray-300 mb-8">Create or join a session with a friend</p>
        
        <div className="space-y-6">
          {/* Create Session */}
          <div className="bg-gray-900 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Create Session</h2>
            <p className="text-gray-400 mb-4">Start a new session and share the code with your friend</p>
            <button
              onClick={createSession}
              className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-full hover:bg-red-700 transition-all"
            >
              Create New Session
            </button>
          </div>

          {/* Join Session */}
          <div className="bg-gray-900 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Join Session</h2>
            <p className="text-gray-400 mb-4">Enter the session code from your friend</p>
            <div className="flex gap-3">
              <input
                type="text"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                placeholder="Enter session code"
                className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-full border border-gray-700 focus:border-red-500 focus:outline-none"
                maxLength={6}
              />
              <button
                onClick={joinSession}
                disabled={!sessionCode.trim()}
                className="bg-red-600 text-white font-bold py-3 px-6 rounded-full hover:bg-red-700 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                Join
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => setCurrentScreen('mode')}
          className="mt-8 text-gray-400 hover:text-white transition-colors"
        >
          ← Back to Mode Selection
        </button>
      </div>
    </div>
  );
}
