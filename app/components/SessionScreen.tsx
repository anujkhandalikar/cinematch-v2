'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';

export default function SessionScreen() {
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);
  const preferences = useStore((state) => state.preferences);
  const createSupabaseSession = useStore((state) => state.createSupabaseSession);
  const joinSupabaseSession = useStore((state) => state.joinSupabaseSession);
  const createFallbackSession = useStore((state) => state.createFallbackSession);
  const joinFallbackSession = useStore((state) => state.joinFallbackSession);
  const [sessionCode, setSessionCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const createSession = async () => {
    setIsCreating(true);
    setError('');
    try {
      // Try Supabase first, fallback to local if it fails
      try {
        await createSupabaseSession('dual', preferences);
        console.log('Session created with Supabase');
      } catch (supabaseError) {
        console.warn('Supabase failed, using fallback:', supabaseError);
        createFallbackSession('dual', preferences);
      }
      setCurrentScreen('ready');
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Failed to create session. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const joinSession = async () => {
    if (!sessionCode.trim()) return;
    
    setIsJoining(true);
    setError('');
    try {
      // Try Supabase first, fallback to local if it fails
      try {
        await joinSupabaseSession(sessionCode.trim(), preferences);
        console.log('Session joined with Supabase');
      } catch (supabaseError) {
        console.warn('Supabase failed, using fallback:', supabaseError);
        joinFallbackSession(sessionCode.trim(), preferences);
      }
      setCurrentScreen('ready');
    } catch (error) {
      console.error('Error joining session:', error);
      setError('Failed to join session. Please check the code and try again.');
    } finally {
      setIsJoining(false);
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
              disabled={isCreating}
              className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-full hover:bg-red-700 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Create New Session'}
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
                onChange={(e) => setSessionCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-full border border-gray-700 focus:border-red-500 focus:outline-none"
              />
              <button
                onClick={joinSession}
                disabled={!sessionCode.trim() || isJoining}
                className="bg-red-600 text-white font-bold py-3 px-6 rounded-full hover:bg-red-700 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isJoining ? 'Joining...' : 'Join'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-900 text-red-200 rounded-lg">
            {error}
          </div>
        )}

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
