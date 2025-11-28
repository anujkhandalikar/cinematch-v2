'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { testSupabaseConnection } from '@/lib/supabase';

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
  const [diagnostics, setDiagnostics] = useState<string>('');

  const testConnection = async () => {
    setDiagnostics('Testing connection...');
    try {
      const results = await testSupabaseConnection();
      const allPassed = results.sessions && results.movie_likes && results.mutual_matches;
      if (allPassed) {
        setDiagnostics('✅ All Supabase connections working!');
        setTimeout(() => setDiagnostics(''), 5000);
      } else {
        setDiagnostics(`⚠️ Some connections failed. Check console for details.`);
        setTimeout(() => setDiagnostics(''), 10000);
      }
    } catch (err: any) {
      setDiagnostics(`❌ Connection test failed: ${err?.message || 'Unknown error'}`);
      setTimeout(() => setDiagnostics(''), 10000);
    }
  };

  const createSession = async () => {
    setIsCreating(true);
    setError('');
    setDiagnostics('');
    
    const startTime = Date.now();
    
    // Add timeout to prevent infinite hanging - reduced to 8 seconds to fail faster
    const timeoutId = setTimeout(() => {
      const elapsed = Date.now() - startTime;
      console.error(`⏱️ Session creation timeout after ${elapsed}ms - using fallback`);
        setDiagnostics(`⏱️ Connection timed out. This usually means Firebase is unreachable from your network. Using offline mode (dual mode sync won't work, but single mode will).`);
      setIsCreating(false);
      createFallbackSession('dual', preferences);
      setCurrentScreen('ready');
    }, 8000); // 8 second timeout (6s for insert + 2s buffer)
    
    try {
      // Try Supabase first, fallback to local if it fails
      try {
        console.log('🔄 Attempting to create Supabase session...');
        setDiagnostics('Connecting to Supabase...');
        await createSupabaseSession('dual', preferences);
        clearTimeout(timeoutId);
        const elapsed = Date.now() - startTime;
        console.log(`✅ Session created with Supabase (${elapsed}ms)`);
        setDiagnostics('');
        setCurrentScreen('ready');
      } catch (supabaseError: any) {
        clearTimeout(timeoutId);
        const elapsed = Date.now() - startTime;
        const isTableNotFound = supabaseError?.isTableNotFound || supabaseError?.message?.includes('Table not found');
        const isApiKeyError = supabaseError?.isMissingApiKey ||
                              supabaseError?.isInvalidApiKey ||
                              supabaseError?.code === 'MISSING_API_KEY' ||
                              supabaseError?.code === 'INVALID_API_KEY' ||
                              supabaseError?.message?.includes('Invalid Supabase API key') ||
                              supabaseError?.message?.includes('Supabase API key is missing');
        const isTimeoutError = supabaseError?.message?.includes('timed out') || 
                               supabaseError?.code === 'TIMEOUT' ||
                               supabaseError?.isTimeout;
        const isExpectedSupabaseFailure = isTableNotFound || isApiKeyError || isTimeoutError;

        const log = isExpectedSupabaseFailure ? console.warn : console.error;
        const prefix = isExpectedSupabaseFailure ? '⚠️ Firebase session creation unavailable' : '❌ Firebase session creation failed';
        log(`${prefix} after ${elapsed}ms`, supabaseError);

        if (!isExpectedSupabaseFailure) {
          console.error('   Error type:', typeof supabaseError);
          console.error('   Error message:', supabaseError?.message);
          console.error('   Error code:', supabaseError?.code);
          console.error('   Error details:', supabaseError?.details);
        }

        if (isTimeoutError) {
          setDiagnostics(`⏱️ Request timed out. Possible causes: network issue, Firebase service down, or firewall blocking connection.`);
        } else if (isTableNotFound) {
          setDiagnostics(`⚠️ Database tables not found. Using offline mode.`);
          console.log('⚠️ Table not found - using fallback (this is expected if tables are not set up)');
        } else if (isApiKeyError) {
          setDiagnostics(`⚠️ Firebase configuration missing or invalid. Using offline mode.`);
          console.log('⚠️ Firebase configuration issue detected - using fallback');
        } else {
          setDiagnostics(`⚠️ Firebase error: ${supabaseError?.message || 'Unknown error'}. Using offline mode.`);
          console.warn('⚠️ Firebase failed, using fallback:', supabaseError?.message || supabaseError);
        }
        
        // Use fallback session
        console.log('🔄 Using fallback session...');
        createFallbackSession('dual', preferences);
        setCurrentScreen('ready');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;
      console.error(`❌ Error creating session after ${elapsed}ms:`, error);
      console.error('   Error type:', typeof error);
      console.error('   Error message:', error?.message);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      setError(`Failed to create session: ${errorMessage}. Using offline mode.`);
      setDiagnostics(`❌ Error: ${errorMessage}`);
      // Still try to use fallback
      try {
        createFallbackSession('dual', preferences);
        setCurrentScreen('ready');
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        setError('Failed to create session. Please try again.');
        setDiagnostics('❌ Fallback session creation also failed.');
      }
    } finally {
      clearTimeout(timeoutId);
      setIsCreating(false);
    }
  };

  const joinSession = async () => {
    if (!sessionCode.trim()) return;
    
    setIsJoining(true);
    setError('');
    setDiagnostics('');
    
    const startTime = Date.now();
    
    // Add timeout to prevent infinite hanging
    const timeoutId = setTimeout(() => {
      const elapsed = Date.now() - startTime;
      console.error(`⏱️ Session join timeout after ${elapsed}ms - using fallback`);
      setDiagnostics(`⏱️ Connection timed out. Using offline mode (dual mode sync won't work, but single mode will).`);
      setIsJoining(false);
      joinFallbackSession(sessionCode.trim(), preferences);
      setCurrentScreen('ready');
    }, 8000); // 8 second timeout (6s for query + 2s buffer)
    
    try {
      // Try Supabase first, fallback to local if it fails
      try {
        console.log('🔄 Attempting to join Supabase session...');
        setDiagnostics('Connecting to Supabase...');
        await joinSupabaseSession(sessionCode.trim(), preferences);
        clearTimeout(timeoutId);
        const elapsed = Date.now() - startTime;
        console.log(`✅ Session joined with Supabase (${elapsed}ms)`);
        setDiagnostics('');
        setCurrentScreen('ready');
      } catch (supabaseError: any) {
        clearTimeout(timeoutId);
        const elapsed = Date.now() - startTime;
        
        const isTableNotFound = supabaseError?.isTableNotFound || 
                               supabaseError?.message?.includes('Table not found') ||
                               supabaseError?.code === 'PGRST205';
        const isApiKeyError = supabaseError?.isMissingApiKey ||
                             supabaseError?.isInvalidApiKey ||
                             supabaseError?.code === 'MISSING_API_KEY' ||
                             supabaseError?.code === 'INVALID_API_KEY' ||
                             supabaseError?.message?.includes('Invalid Supabase API key') ||
                             supabaseError?.message?.includes('Supabase API key is missing');
        const isTimeoutError = supabaseError?.message?.includes('timed out') || 
                               supabaseError?.code === 'TIMEOUT' ||
                               supabaseError?.isTimeout;
        const isExpectedSupabaseFailure = isTableNotFound || isApiKeyError || isTimeoutError;

        const log = isExpectedSupabaseFailure ? console.warn : console.error;
        const prefix = isExpectedSupabaseFailure ? '⚠️ Supabase session join unavailable' : '❌ Supabase session join failed';
        log(`${prefix} after ${elapsed}ms`, supabaseError);

        if (isTimeoutError) {
          setDiagnostics(`⏱️ Request timed out. Possible causes: network issue, Supabase service down, or firewall blocking connection.`);
        } else if (isTableNotFound) {
          setDiagnostics(`⚠️ Database tables not found. Using offline mode.`);
          console.log('⚠️ Table not found - using fallback (this is expected if tables are not set up)');
        } else if (isApiKeyError) {
          setDiagnostics(`⚠️ Supabase configuration missing or invalid. Using offline mode.`);
          console.log('⚠️ Supabase configuration issue detected - using fallback');
        } else {
          setDiagnostics(`⚠️ Supabase error: ${supabaseError?.message || 'Unknown error'}. Using offline mode.`);
          console.warn('⚠️ Supabase failed, using fallback:', supabaseError?.message || supabaseError);
        }
        
        // Use fallback session
        console.log('🔄 Using fallback session...');
        joinFallbackSession(sessionCode.trim(), preferences);
        setCurrentScreen('ready');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;
      console.error(`❌ Error joining session after ${elapsed}ms:`, error);
      console.error('   Error type:', typeof error);
      console.error('   Error message:', error?.message);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      setError(`Failed to join session: ${errorMessage}. Using offline mode.`);
      setDiagnostics(`❌ Error: ${errorMessage}`);
      // Still try to use fallback
      try {
        joinFallbackSession(sessionCode.trim(), preferences);
        setCurrentScreen('ready');
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        setError('Failed to join session. Please check the code and try again.');
        setDiagnostics('❌ Fallback session join also failed.');
      }
    } finally {
      clearTimeout(timeoutId);
      setIsJoining(false);
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
            Partner Mode
          </h1>
          <p className="text-gray-400 mb-10 sm:mb-12 font-light italic">Two screens. One shared taste test.</p>
        </div>
        
        <div className="space-y-6">
          {/* Create Session - Elevated card */}
          <div className="bg-[#121212] rounded-2xl p-6 sm:p-8 border border-[#1a1a1a] hover:border-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-300">
            <h2 className="text-xl sm:text-2xl font-light text-white mb-3">Create Session</h2>
            <p className="text-gray-400 mb-6 text-sm sm:text-base font-light">Start a session and share the code with your partner in movie crime.</p>
            <div className="flex gap-3">
              <button
                onClick={createSession}
                disabled={isCreating}
                className="flex-1 bg-red-600 text-white font-light py-4 px-8 rounded-full hover:bg-red-700 active:bg-red-800 transition-all duration-300 disabled:bg-gray-700 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(239,68,68,0.3)] hover:shadow-[0_6px_24px_rgba(239,68,68,0.4)] hover:translate-y-[-2px] disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_20px_rgba(239,68,68,0.3)]"
              >
                {isCreating ? 'Creating...' : 'Create New Session'}
              </button>
              <button
                onClick={testConnection}
                disabled={isCreating}
                className="bg-gray-700 text-gray-300 font-light py-4 px-6 rounded-full hover:bg-gray-600 transition-all duration-300 disabled:bg-gray-800 disabled:cursor-not-allowed text-sm"
                title="Test Firebase connection"
              >
                🔍 Test
              </button>
            </div>
            {diagnostics && (
              <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-yellow-200 text-xs font-light">
                {diagnostics}
              </div>
            )}
          </div>

          {/* Join Session - Elevated card */}
          <div className="bg-[#121212] rounded-2xl p-6 sm:p-8 border border-[#1a1a1a] hover:border-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-300">
            <h2 className="text-xl sm:text-2xl font-light text-white mb-3">Join Session</h2>
            <p className="text-gray-400 mb-6 text-sm sm:text-base font-light">Got a code? Type it in and join your partner's watch quest.</p>
            <div className="flex gap-3">
              <input
                type="text"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="flex-1 bg-[#0a0a0a] text-white px-5 py-3.5 rounded-full border border-[#1a1a1a] focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all duration-300 placeholder:text-gray-500"
              />
              <button
                onClick={joinSession}
                disabled={!sessionCode.trim() || isJoining}
                className="bg-gray-700 text-gray-300 font-light py-3.5 px-6 rounded-full hover:bg-red-600 hover:text-white transition-all duration-300 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:hover:bg-gray-700 disabled:hover:text-gray-300 shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:shadow-[0_6px_16px_rgba(239,68,68,0.3)]"
              >
                {isJoining ? 'Joining...' : 'Join'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-900/80 text-red-200 rounded-2xl border border-red-800/50 backdrop-blur-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
