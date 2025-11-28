import { createClient } from '@supabase/supabase-js';

// Using the new Supabase project for all features
// Project: qvoqnaqyqsnpydmtskoz
// This simplifies setup - one project, one set of credentials

// Get URL and key from environment variables, with fallback to new project
// Priority: NEXT_PUBLIC_SUPABASE_URL > NEXT_PUBLIC_SUPABASE_ANON_KEY > hardcoded new project
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                    'https://qvoqnaqyqsnpydmtskoz.supabase.co';

// Get API key, trimming whitespace to avoid issues
const getEnvKey = (key: string | undefined): string => {
  return key?.trim() || '';
};

const supabaseAnonKey = getEnvKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 
                        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2b3FuYXF5cXNucHlkbXRza296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4OTc2OTIsImV4cCI6MjA3OTQ3MzY5Mn0.GCRxhs45uZ8jz0UeT69SSfEB9WwpoU1qw2gTeeb_l5Y';

// Keep these for backward compatibility and clarity in code
const supabase1Url = supabaseUrl;
const supabase1AnonKey = supabaseAnonKey;
const supabase2Url = supabaseUrl;
const supabase2AnonKey = supabaseAnonKey;

// Validate Supabase configuration
// Log server-side to help debug env var loading
if (typeof window === 'undefined') {
  console.log('🔧 [Server] Supabase Config Check:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set (using default)');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set (using default)');
  console.log('   Final supabaseUrl:', supabaseUrl);
  console.log('   Final supabaseAnonKey:', supabaseAnonKey ? `✅ Set (${supabaseAnonKey.length} chars)` : '❌ Empty');
}

if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
  const errorMessage = `
⚠️ Missing Supabase API Key!

Please set the following environment variables in your .env.local file:
- NEXT_PUBLIC_SUPABASE_URL (optional, defaults to new project)
- NEXT_PUBLIC_SUPABASE_ANON_KEY (optional, defaults to new project key)

To get your Supabase API key:
1. Go to your Supabase project dashboard: ${supabaseUrl.replace('/rest/v1', '')}
2. Navigate to Settings → API
3. Copy the "anon" or "public" key
4. Add it to .env.local as: NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here

Without this key, Supabase features (session creation, dual mode) will not work.
The app will use offline mode as a fallback.

⚠️ IMPORTANT: If you just added the key to .env.local, you MUST restart your Next.js dev server!
Run: npm run dev (or stop and restart your dev server)
  `.trim();
  
  console.error(errorMessage);
  
  // In browser, show a more user-friendly error
  if (typeof window !== 'undefined') {
    console.error('❌ Supabase API key is missing. Please check your .env.local file and restart the dev server.');
  }
}

// Debug Supabase configuration
if (typeof window !== 'undefined') {
  console.log('🔧 Supabase Configuration:', {
    project: {
      url: supabaseUrl,
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey && supabaseAnonKey.trim() !== '',
      anonKeyLength: supabaseAnonKey?.length || 0,
      purpose: 'All features (sessions, movie_likes, mutual_matches, movie_cards)'
    },
    usingEnv: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    },
    note: 'Using new Supabase project for all features'
  });
  
  if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
    console.warn('⚠️ Supabase anon key is missing or empty. Supabase features will not work.');
  }
}

// Main Supabase client - used for both Partner Mode and IMDb data
// Both use the same project now, so we use a single client
// Note: If key is empty, Supabase operations will throw "Invalid API key" errors
// We validate the key before operations in sessionService.createSession and other methods
// Use empty string instead of placeholder to get clearer error messages
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// IMDb Supabase client - alias to same client for backward compatibility
// Both point to the same project now
export const supabaseImdb = supabaseAnonKey ? supabase : null;

// Test Supabase connection and table access (for supa1 - partner mode)
export async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase connection (supa1 - partner mode)...');
  console.log('   URL:', supabase1Url);
  console.log('   Anon Key:', supabase1AnonKey ? `${supabase1AnonKey.substring(0, 20)}...` : 'MISSING');
  console.log('   Purpose: Partner mode (sessions, movie_likes, mutual_matches)');
  
  const tests = {
    sessions: false,
    movie_likes: false,
    mutual_matches: false
  };
  
  // Test sessions table
  try {
    const { data, error } = await supabase.from('sessions').select('id').limit(1);
    if (error) {
      console.error('❌ sessions table test failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      if (error.code === 'PGRST205') {
        console.error('   → Table "sessions" does not exist. Create it using the SQL schema.');
      }
      if (error.code === '42501') {
        console.error('   → Permission denied. Check RLS policies for "sessions" table.');
      }
    } else {
      tests.sessions = true;
      console.log('✅ sessions table: OK');
    }
  } catch (err: any) {
    console.error('❌ sessions table test exception:', err);
  }
  
  // Test movie_likes table
  try {
    const { data, error } = await supabase.from('movie_likes').select('id').limit(1);
    if (error) {
      console.error('❌ movie_likes table test failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      if (error.code === 'PGRST205') {
        console.error('   → Table "movie_likes" does not exist. Create it using the SQL schema.');
      }
      if (error.code === '42501') {
        console.error('   → Permission denied. Check RLS policies for "movie_likes" table.');
      }
    } else {
      tests.movie_likes = true;
      console.log('✅ movie_likes table: OK');
    }
  } catch (err: any) {
    console.error('❌ movie_likes table test exception:', err);
  }
  
  // Test mutual_matches table
  try {
    const { data, error } = await supabase.from('mutual_matches').select('id').limit(1);
    if (error) {
      console.error('❌ mutual_matches table test failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      if (error.code === 'PGRST205') {
        console.error('   → Table "mutual_matches" does not exist. Create it using the SQL schema.');
      }
      if (error.code === '42501') {
        console.error('   → Permission denied. Check RLS policies for "mutual_matches" table.');
      }
    } else {
      tests.mutual_matches = true;
      console.log('✅ mutual_matches table: OK');
    }
  } catch (err: any) {
    console.error('❌ mutual_matches table test exception:', err);
  }
  
  console.log('🧪 Supabase connection test results:', tests);
  return tests;
}

// Database types
export interface Session {
  id: string;
  code: string;
  mode: 'single' | 'dual';
  expires_at: string;
  seed: number;
  creator_id: string;
  joiner_id?: string;
  creator_ready: boolean;
  joiner_ready: boolean;
  creator_preferences: any;
  joiner_preferences?: any;
  movie_deck?: any; // Combined movie deck for both users
  created_at: string;
  updated_at: string;
}

export interface MovieLike {
  id: string;
  session_id: string;
  user_id: string;
  movie_id: string;
  movie_data: any;
  created_at: string;
}

export interface MutualMatch {
  id: string;
  session_id: string;
  movie_id: string;
  movie_data: any;
  created_at: string;
}

// Database operations
// Helper function to add timeout to Supabase requests
function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        const timeoutError = new Error(`⏱️ ${operation} timed out after ${timeoutMs}ms. Check your network connection and Supabase status.`);
        (timeoutError as any).code = 'TIMEOUT';
        (timeoutError as any).isTimeout = true;
        reject(timeoutError);
      }, timeoutMs);
    })
  ]);
}

// Test if Supabase URL is reachable (browser only) - lightweight diagnostic
async function testSupabaseReachability(): Promise<boolean> {
  // Only test in browser environment
  if (typeof window === 'undefined') {
    return true; // Assume reachable in server environment
  }
  
  try {
    const url = supabase1Url.replace(/\/$/, '');
    // Use the REST API endpoint instead of root to avoid 404
    // The /rest/v1/ path is the actual Supabase REST endpoint
    const testUrl = `${url}/rest/v1/`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // Reduced to 2 seconds for faster fail
    
    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
        mode: 'no-cors', // Avoid CORS issues - we just want to know if it's reachable
        cache: 'no-cache',
        headers: {
          'apikey': supabaseAnonKey || ''
        }
      });
      
      clearTimeout(timeoutId);
      // If we get here, the server responded (even if CORS blocked the response)
      return true;
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      // Suppress 404 and network errors - they're expected in no-cors mode
      // Just return false silently - the actual Supabase client will handle errors properly
      return false;
    }
  } catch (err: any) {
    // Silently return false - this is just a diagnostic, don't spam console
    return false;
  }
}

export const sessionService = {
  // Create a new session
  async createSession(sessionData: Omit<Session, 'id' | 'created_at' | 'updated_at'>) {
    try {
      console.log('📤 sessionService.createSession: Starting...');
      console.log('   Supabase URL:', supabase1Url);
      console.log('   Table: sessions');
      console.log('   Data keys:', Object.keys(sessionData));
      
      // Check if API key is missing
      if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
        const errorMessage = 'Supabase API key is missing. Please set NEXT_PUBLIC_SUPABASE_PARTNER_ANON_KEY (or NEXT_PUBLIC_SUPABASE_IMDB_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY) in your .env.local file.';
        console.error('❌', errorMessage);
        const enhancedError = new Error(errorMessage);
        (enhancedError as any).code = 'MISSING_API_KEY';
        (enhancedError as any).isMissingApiKey = true;
        throw enhancedError;
      }
      
      // Skip reachability test - let the actual Supabase operations handle connectivity
      // The timeout mechanism will properly detect and handle unreachable Supabase
      
      const startTime = Date.now();
      console.log('📤 Calling Supabase insert (will timeout after 6s if unreachable)...');
      console.log('   If this times out, the app will automatically use offline mode.');
      
      // Validate Supabase client
      if (!supabase) {
        console.error('❌ Supabase client is not initialized');
        throw new Error('Supabase client is not initialized');
      }
      
      // Reduce timeout to 6 seconds to fail faster and fallback sooner
      // Note: The Supabase client might work even if the raw fetch test failed
      let insertQuery;
      try {
        // Log the exact data being sent for debugging
        console.log('📋 Session data being inserted:', JSON.stringify(sessionData, null, 2));
        console.log('   Data types:', {
          code: typeof sessionData.code,
          mode: typeof sessionData.mode,
          expires_at: typeof sessionData.expires_at,
          seed: typeof sessionData.seed,
          creator_id: typeof sessionData.creator_id,
          creator_ready: typeof sessionData.creator_ready,
          joiner_ready: typeof sessionData.joiner_ready,
          creator_preferences: typeof sessionData.creator_preferences,
        });
        
        insertQuery = supabase
          .from('sessions')
          .insert([sessionData])
          .select()
          .single();
      } catch (queryError: any) {
        console.error('❌ sessionService.createSession: Error creating query');
        console.error('   Error:', queryError);
        throw queryError;
      }
      
      // Await the query with timeout (PostgrestBuilder is thenable)
      let result;
      try {
        result = await withTimeout(insertQuery, 6000, 'Supabase insert');
      } catch (timeoutError: any) {
        // Handle timeout specifically
        const duration = Date.now() - startTime;
        console.warn(`⏱️ sessionService.createSession: Request timed out after ${duration}ms`);
        console.warn('   This usually means:');
        console.warn('   - Network connection is slow');
        console.warn('   - Supabase service is temporarily unavailable');
        console.warn('   - The sessions table might not exist');
        console.warn('   - Firewall or network restrictions blocking connection');
        console.warn('   App will use fallback mode');
        const enhancedError = new Error(`Session creation timed out after ${duration}ms`);
        (enhancedError as any).code = 'TIMEOUT';
        (enhancedError as any).isTimeout = true;
        throw enhancedError;
      }
      
      const { data, error } = result;
      
      const duration = Date.now() - startTime;
      console.log(`📥 sessionService.createSession: Response received (${duration}ms)`);
      console.log('   Has data:', !!data);
      console.log('   Has error:', !!error);
      
      if (error) {
        console.error('❌ sessionService.createSession: Supabase error');
        console.error('   Error code:', error.code);
        console.error('   Error message:', error.message);
        console.error('   Error details:', error.details);
        console.error('   Error hint:', error.hint);
        console.error('   Supabase URL:', supabase1Url);
        
        // Check if error has any properties by trying to access them directly
        const errorMessage = (error as any)?.message || 
                            (error as any)?.details || 
                            (error as any)?.hint || 
                            (error as any)?.code || 
                            'Supabase table "sessions" may not exist or you may not have permission to access it';
        const errorCode = (error as any)?.code;
        
        // Handle "Invalid API key" error specifically
        if (errorMessage.includes('Invalid API key') || errorMessage.includes('invalid api key') || errorCode === 'PGRST301') {
          const apiKeyError = 'Invalid Supabase API key. Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_PARTNER_ANON_KEY (or NEXT_PUBLIC_SUPABASE_IMDB_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY) is set correctly.';
          console.error('❌', apiKeyError);
          const enhancedError = new Error(apiKeyError);
          (enhancedError as any).code = 'INVALID_API_KEY';
          (enhancedError as any).isInvalidApiKey = true;
          (enhancedError as any).originalError = error;
          throw enhancedError;
        }
        
        // Suppress PGRST205 (table not found) errors since we have fallback
        if (errorCode === 'PGRST205' || errorMessage.includes('Could not find the table')) {
          console.log('⚠️ Table not found error - will use fallback');
          // Silently fail - fallback will be used
          const enhancedError = new Error('Table not found - using fallback');
          (enhancedError as any).code = errorCode;
          (enhancedError as any).isTableNotFound = true;
          throw enhancedError;
        }
        
        // Log other errors with more context
        console.error('❌ Supabase createSession error:', errorMessage);
        const enhancedError = new Error(errorMessage);
        (enhancedError as any).code = errorCode;
        (enhancedError as any).originalError = error;
        throw enhancedError;
      }
      
      if (!data) {
        console.error('❌ No data returned from Supabase');
        throw new Error('No data returned from Supabase');
      }
      
      console.log('✅ sessionService.createSession: Success');
      console.log('   Session ID:', data.id);
      console.log('   Session code:', data.code);
      return data;
    } catch (err: any) {
      // Log a summary first for visibility - make it very prominent
      const errorSummary = {
        message: err?.message || 'Unknown error',
        code: err?.code || 'No code',
        type: typeof err,
        constructor: err?.constructor?.name,
        isTimeout: err?.isTimeout || err?.code === 'TIMEOUT',
        isTableNotFound: err?.isTableNotFound || err?.code === 'PGRST205',
        isInvalidApiKey: err?.isInvalidApiKey || err?.code === 'INVALID_API_KEY',
        isMissingApiKey: err?.isMissingApiKey || err?.code === 'MISSING_API_KEY',
      };
      
      // Collect all error info into a single object for easier viewing
      const fullErrorInfo = {
        summary: errorSummary,
        errorType: typeof err,
        constructor: err?.constructor?.name,
        message: err?.message || 'No message',
        code: err?.code || 'No code',
        details: err?.details || 'No details',
        hint: err?.hint || 'No hint',
        toString: err?.toString?.(),
        stack: err?.stack || 'No stack',
        supabaseUrl: supabase1Url,
        hasApiKey: !!supabaseAnonKey && supabaseAnonKey.trim() !== '',
        fullError: (() => {
          try {
            return JSON.stringify(err, Object.getOwnPropertyNames(err), 2);
          } catch {
            return 'Could not stringify error';
          }
        })()
      };
      
      // Make error very visible with a prominent header
      console.error('═══════════════════════════════════════════════════════════');
      console.error('❌ sessionService.createSession: EXCEPTION CAUGHT');
      console.error('═══════════════════════════════════════════════════════════');
      console.error('📋 COMPLETE ERROR INFO:', fullErrorInfo);
      console.error('═══════════════════════════════════════════════════════════');
      
      // Also log key info separately for easier reading
      console.error('🔍 KEY DETAILS:');
      console.error('   Message:', fullErrorInfo.message);
      console.error('   Code:', fullErrorInfo.code);
      console.error('   Type:', fullErrorInfo.errorType);
      console.error('   Constructor:', fullErrorInfo.constructor);
      if (fullErrorInfo.details !== 'No details') {
        console.error('   Details:', fullErrorInfo.details);
      }
      if (fullErrorInfo.hint !== 'No hint') {
        console.error('   Hint:', fullErrorInfo.hint);
      }
      
      // Provide helpful messages for common errors
      if (err?.code === 'PGRST205' || err?.isTableNotFound) {
        console.warn('   → Table "sessions" does not exist. Run supabase-schema.sql to create it.');
      } else if (err?.code === '42501') {
        console.warn('   → Permission denied. Check RLS policies for "sessions" table.');
      } else if (err?.code === 'PGRST301') {
        console.warn('   → Too many requests. Please try again in a moment.');
      } else if (err?.code === 'TIMEOUT' || err?.isTimeout) {
        console.warn('   → Request timed out. Check your network connection and Supabase status.');
      } else if (err?.code === 'INVALID_API_KEY' || err?.isInvalidApiKey) {
        console.warn('   → Invalid API key. Check your .env.local file and restart the dev server.');
      } else if (err?.code === 'MISSING_API_KEY' || err?.isMissingApiKey) {
        console.warn('   → API key is missing. Set NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local and restart the dev server.');
      }
      
      // Re-throw with a clear message
      const message = err?.message || 'Failed to create Supabase session. Please check your Supabase configuration.';
      const enhancedError = new Error(message);
      (enhancedError as any).originalError = err;
      (enhancedError as any).code = err?.code;
      (enhancedError as any).isTableNotFound = err?.isTableNotFound;
      (enhancedError as any).isTimeout = err?.isTimeout;
      throw enhancedError;
    }
  },

  // Get session by code
  async getSessionByCode(code: string) {
    try {
      console.log('📤 sessionService.getSessionByCode: Calling Supabase...');
      console.log('   Table: sessions');
      console.log('   Code:', code);
      
      // Check if API key is missing
      if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
        const errorMessage = 'Supabase API key is missing. Please set NEXT_PUBLIC_SUPABASE_PARTNER_ANON_KEY (or NEXT_PUBLIC_SUPABASE_IMDB_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY) in your .env.local file.';
        console.error('❌', errorMessage);
        const enhancedError = new Error(errorMessage);
        (enhancedError as any).code = 'MISSING_API_KEY';
        (enhancedError as any).isMissingApiKey = true;
        throw enhancedError;
      }
      
      const startTime = Date.now();
      const query = supabase
        .from('sessions')
        .select('*')
        .eq('code', code)
        .single();
      
      // Await the query with timeout
      let result;
      try {
        result = await withTimeout(query, 6000, 'Supabase getSessionByCode');
      } catch (timeoutError: any) {
        // Handle timeout specifically
        const duration = Date.now() - startTime;
        console.warn(`⏱️ sessionService.getSessionByCode: Request timed out after ${duration}ms`);
        console.warn('   This usually means:');
        console.warn('   - Network connection is slow');
        console.warn('   - Supabase service is temporarily unavailable');
        console.warn('   - The sessions table might not exist');
        console.warn('   - Firewall or network restrictions blocking connection');
        console.warn('   App will use fallback mode');
        const enhancedError = new Error(`Session lookup timed out after ${duration}ms`);
        (enhancedError as any).code = 'TIMEOUT';
        (enhancedError as any).isTimeout = true;
        throw enhancedError;
      }
      const { data, error } = result;
      
      const duration = Date.now() - startTime;
      console.log(`📥 sessionService.getSessionByCode: Response received (${duration}ms)`);
      console.log('   Has data:', !!data);
      console.log('   Has error:', !!error);
      
      if (error) {
        console.error('❌ sessionService.getSessionByCode: Supabase error');
        console.error('   Error code:', error.code);
        console.error('   Error message:', error.message);
        console.error('   Error details:', error.details);
        console.error('   Error hint:', error.hint);
        console.error('   Supabase URL:', supabase1Url);
        
        const errorMessage = (error as any)?.message || 
                            (error as any)?.details || 
                            (error as any)?.hint || 
                            (error as any)?.code || 
                            'Supabase table "sessions" may not exist or you may not have permission to access it';
        const errorCode = (error as any)?.code;
        
        // Handle "Invalid API key" error specifically
        if (errorMessage.includes('Invalid API key') || errorMessage.includes('invalid api key') || errorCode === 'PGRST301') {
          const apiKeyError = 'Invalid Supabase API key. Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_PARTNER_ANON_KEY (or NEXT_PUBLIC_SUPABASE_IMDB_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY) is set correctly.';
          console.error('❌', apiKeyError);
          const enhancedError = new Error(apiKeyError);
          (enhancedError as any).code = 'INVALID_API_KEY';
          (enhancedError as any).isInvalidApiKey = true;
          (enhancedError as any).originalError = error;
          throw enhancedError;
        }
        
        // Suppress PGRST205 (table not found) errors since we have fallback
        if (errorCode === 'PGRST205' || errorMessage.includes('Could not find the table')) {
          console.log('⚠️ Table not found error - will use fallback');
          const enhancedError = new Error('Table not found - using fallback');
          (enhancedError as any).code = errorCode;
          (enhancedError as any).isTableNotFound = true;
          throw enhancedError;
        }
        
        const enhancedError = new Error(errorMessage);
        (enhancedError as any).code = errorCode;
        (enhancedError as any).originalError = error;
        throw enhancedError;
      }
      
      if (!data) {
        console.error('❌ No session found for code:', code);
        throw new Error('Session not found');
      }
      
      console.log('✅ sessionService.getSessionByCode: Success');
      console.log('   Session ID:', data.id);
      console.log('   Session code:', data.code);
      return data;
    } catch (err: any) {
      console.error('❌ sessionService.getSessionByCode: Exception caught');
      console.error('   Error type:', typeof err);
      console.error('   Error message:', err?.message);
      console.error('   Error code:', err?.code);
      throw err;
    }
  },

  // Update session
  async updateSession(sessionId: string, updates: Partial<Session>) {
    try {
      console.log('📤 sessionService.updateSession: Calling Supabase...');
      console.log('   Table: sessions');
      console.log('   Session ID:', sessionId);
      console.log('   Update keys:', Object.keys(updates));
      
      // Check if API key is missing
      if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
        const errorMessage = 'Supabase API key is missing. Please set NEXT_PUBLIC_SUPABASE_PARTNER_ANON_KEY (or NEXT_PUBLIC_SUPABASE_IMDB_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY) in your .env.local file.';
        console.error('❌', errorMessage);
        const enhancedError = new Error(errorMessage);
        (enhancedError as any).code = 'MISSING_API_KEY';
        (enhancedError as any).isMissingApiKey = true;
        throw enhancedError;
      }
      
      // Detect large payloads (e.g., movie_deck with many movies)
      // Estimate payload size and adjust timeout accordingly
      let timeoutMs = 6000; // Default timeout
      const movieDeck = updates.movie_deck;
      if (movieDeck && Array.isArray(movieDeck)) {
        const movieCount = movieDeck.length;
        if (movieCount > 1000) {
          // For large movie decks, use a longer timeout
          // Estimate: ~1KB per movie, so 5000 movies = ~5MB
          // Allow 30 seconds for large payloads
          timeoutMs = 30000;
          console.log(`⏱️ Large payload detected: ${movieCount} movies, using ${timeoutMs}ms timeout`);
        } else if (movieCount > 500) {
          // Medium payloads get 15 seconds
          timeoutMs = 15000;
          console.log(`⏱️ Medium payload detected: ${movieCount} movies, using ${timeoutMs}ms timeout`);
        }
      }
      
      const updatesWithTimestamp = {
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      const startTime = Date.now();
      const query = supabase
        .from('sessions')
        .update(updatesWithTimestamp)
        .eq('id', sessionId)
        .select()
        .single();
      
      // Await the query with dynamic timeout based on payload size
      const result = await withTimeout(query, timeoutMs, 'Supabase updateSession');
      const { data, error } = result;
      
      const duration = Date.now() - startTime;
      console.log(`📥 sessionService.updateSession: Response received (${duration}ms)`);
      console.log('   Has data:', !!data);
      console.log('   Has error:', !!error);
      
      if (error) {
        console.error('❌ sessionService.updateSession: Supabase error');
        console.error('   Error code:', error.code);
        console.error('   Error message:', error.message);
        console.error('   Error details:', error.details);
        console.error('   Error hint:', error.hint);
        console.error('   Supabase URL:', supabase1Url);
        console.error('   Session ID:', sessionId);

        const postgrestError = error as any;
        const errorMessage = postgrestError?.message || postgrestError?.details || postgrestError?.hint || postgrestError?.code || 'Unknown Supabase error';
        const errorCode = postgrestError?.code;

        // Handle "Invalid API key" error specifically
        if (errorMessage.includes('Invalid API key') || errorMessage.includes('invalid api key') || errorCode === 'PGRST301') {
          const apiKeyError = 'Invalid Supabase API key. Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_PARTNER_ANON_KEY (or NEXT_PUBLIC_SUPABASE_IMDB_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY) is set correctly.';
          console.error('❌', apiKeyError);
          const enhancedError = new Error(apiKeyError);
          (enhancedError as any).code = 'INVALID_API_KEY';
          (enhancedError as any).isInvalidApiKey = true;
          (enhancedError as any).originalError = error;
          throw enhancedError;
        }

        const enhancedError = new Error(errorMessage);
        (enhancedError as any).code = errorCode;
        (enhancedError as any).details = postgrestError?.details;
        (enhancedError as any).hint = postgrestError?.hint;
        (enhancedError as any).status = postgrestError?.status;
        (enhancedError as any).originalError = error;
        throw enhancedError;
      }
      
      if (!data) {
        console.error('❌ No data returned from Supabase update');
        throw new Error('No data returned from Supabase');
      }
      
      console.log('✅ sessionService.updateSession: Success');
      console.log('   Session ID:', data.id);
      console.log('   Session code:', data.code);
      return data;
    } catch (err: any) {
      console.error('❌ sessionService.updateSession: Exception caught');
      console.error('   Error type:', typeof err);
      console.error('   Error message:', err?.message);
      console.error('   Error code:', err?.code);
      throw err;
    }
  },

  // Subscribe to session changes
  subscribeToSession(sessionId: string, callback: (payload: any) => void) {
    const channel = supabase
      .channel(`session-${sessionId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: sessionId }
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`
      }, callback)
      .subscribe((status) => {
        console.log('Session subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to session changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Session subscription error');
        }
      });
    
    return channel;
  }
};

export const likesService = {
  // Add a movie like
  async addLike(sessionId: string, userId: string, movieId: string, movieData: any) {
    console.log('🔵 addLike called:', {
      sessionId,
      userId,
      movieId,
      movieTitle: movieData?.title,
      supabaseUrl: supabase1Url,
      table: 'movie_likes'
    });
    
    try {
      const { data, error } = await supabase
        .from('movie_likes')
        .insert([{
          session_id: sessionId,
          user_id: userId,
          movie_id: movieId,
          movie_data: movieData
        }])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Supabase addLike error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          status: (error as any).status,
          statusText: (error as any).statusText,
          fullError: error
        });
        throw error;
      }
      
      console.log('✅ addLike success:', data);
      return data;
    } catch (err: any) {
      console.error('❌ addLike exception:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        status: err?.status,
        statusText: err?.statusText,
        response: err?.response,
        fullError: err
      });
      throw err;
    }
  },

  // Get likes for a session
  async getSessionLikes(sessionId: string) {
    console.log('🔵 getSessionLikes called:', { sessionId, table: 'movie_likes' });
    
    try {
      const { data, error } = await supabase
        .from('movie_likes')
        .select('*')
        .eq('session_id', sessionId);
      
      if (error) {
        console.error('❌ Supabase getSessionLikes error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          status: (error as any).status,
          statusText: (error as any).statusText,
          fullError: error
        });
        throw error;
      }
      
      console.log('✅ getSessionLikes success:', { count: data?.length || 0, data });
      return data;
    } catch (err: any) {
      console.error('❌ getSessionLikes exception:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        status: err?.status,
        statusText: err?.statusText,
        fullError: err
      });
      throw err;
    }
  },

  // Get likes for a specific user in a session
  async getUserLikes(sessionId: string, userId: string) {
    const { data, error } = await supabase
      .from('movie_likes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId);
    
    if (error) throw error;
    return data;
  },

  // Subscribe to likes changes
  subscribeToLikes(sessionId: string, callback: (payload: any) => void) {
    const channel = supabase
      .channel(`likes-${sessionId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: sessionId }
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'movie_likes',
        filter: `session_id=eq.${sessionId}`
      }, callback)
      .subscribe((status) => {
        console.log('Likes subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to likes changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Likes subscription error');
        }
      });
    
    return channel;
  }
};

export const matchesService = {
  // Add a mutual match
  async addMatch(sessionId: string, movieId: string, movieData: any) {
    const { data, error } = await supabase
      .from('mutual_matches')
      .insert([{
        session_id: sessionId,
        movie_id: movieId,
        movie_data: movieData
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get mutual matches for a session
  async getSessionMatches(sessionId: string) {
    const { data, error } = await supabase
      .from('mutual_matches')
      .select('*')
      .eq('session_id', sessionId);
    
    if (error) throw error;
    return data;
  },

  // Subscribe to matches changes
  subscribeToMatches(sessionId: string, callback: (payload: any) => void) {
    const channel = supabase
      .channel(`matches-${sessionId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: sessionId }
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mutual_matches',
        filter: `session_id=eq.${sessionId}`
      }, callback)
      .subscribe((status) => {
        console.log('Matches subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to matches changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Matches subscription error');
        }
      });
    
    return channel;
  }
};

// Movie card types
export interface MovieCard {
  card_id: string;
  card_type: string;
  card_config: any;
  movies: any[];
  updated_at: string;
  created_at: string;
}

export const movieCardService = {
  // Get movies for a mood card
  async getMovieCard(cardId: string): Promise<MovieCard | null> {
    try {
      console.log('📤 movieCardService.getMovieCard: Calling Supabase...');
      console.log('   Table: movie_cards');
      console.log('   Card ID:', cardId);
      console.log('   Supabase URL:', supabaseUrl);
      console.log('   Has API key:', !!supabaseAnonKey && supabaseAnonKey.trim() !== '');
      
      // Check if API key is missing
      if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
        console.warn('⚠️ Supabase API key is missing. Cannot fetch movie card.');
        return null;
      }
      
      // Validate Supabase client
      if (!supabase) {
        console.error('❌ Supabase client is not initialized');
        return null;
      }
      
      const startTime = Date.now();
      
      // Create query with error handling
      let query;
      try {
        // Only select movies column and essential metadata to reduce data transfer
        // Use .maybeSingle() instead of .single() to avoid errors when no row exists
        query = supabase
          .from('movie_cards')
          .select('movies, card_id, updated_at, card_type')
          .eq('card_id', cardId)
          .maybeSingle(); // Use maybeSingle() to return null instead of error when no row found
      } catch (queryError: any) {
        console.error('❌ movieCardService.getMovieCard: Error creating query');
        console.error('   Error:', queryError);
        return null;
      }
      
      let result;
      try {
        result = await withTimeout(query, 6000, 'Supabase getMovieCard');
      } catch (timeoutError: any) {
        // Handle timeout specifically
        const duration = Date.now() - startTime;
        console.warn(`⏱️ movieCardService.getMovieCard: Request timed out after ${duration}ms`);
        console.warn('   This usually means:');
        console.warn('   - Network connection is slow');
        console.warn('   - Supabase service is temporarily unavailable');
        console.warn('   - The movie_cards table might not exist');
        console.warn('   Returning null - app will continue with fallback movie fetching');
        return null;
      }
      
      const { data, error } = result;
      
      const duration = Date.now() - startTime;
      console.log(`📥 movieCardService.getMovieCard: Response received (${duration}ms)`);
      console.log('   Has data:', !!data);
      console.log('   Has error:', !!error);
      
      if (error) {
        // Don't throw - just log and return null
        // With maybeSingle(), PGRST116 shouldn't occur - data will be null instead
        console.error('❌ movieCardService.getMovieCard: Supabase error');
        console.error('   Error code:', error.code);
        console.error('   Error message:', error.message);
        console.error('   Error details:', error.details);
        console.error('   Error hint:', error.hint);
        
        // Provide helpful messages for common errors
        if (error.code === 'PGRST205') {
          console.warn('   → Table "movie_cards" does not exist. Run supabase-schema-movies.sql to create it.');
        } else if (error.code === '42501') {
          console.warn('   → Permission denied. Check RLS policies for "movie_cards" table.');
        } else if (error.code === 'PGRST301') {
          console.warn('   → Too many requests. Please try again in a moment.');
        }
        
        return null;
      }
      
      if (!data) {
        console.log('ℹ️ No movie card data returned');
        return null;
      }
      
      console.log('✅ movieCardService.getMovieCard: Success');
      console.log('   Card ID:', data.card_id);
      console.log('   Movies count:', Array.isArray(data.movies) ? data.movies.length : 0);
      return data as MovieCard;
    } catch (err: any) {
      console.error('❌ movieCardService.getMovieCard: Exception caught');
      console.error('   Error type:', typeof err);
      console.error('   Error constructor:', err?.constructor?.name);
      console.error('   Error message:', err?.message || 'No message');
      console.error('   Error code:', err?.code || 'No code');
      console.error('   Error details:', err?.details || 'No details');
      console.error('   Error hint:', err?.hint || 'No hint');
      console.error('   Error toString:', err?.toString?.());
      if (err?.stack) {
        console.error('   Error stack:', err.stack);
      }
      // Try to stringify error with error handling
      try {
        console.error('   Error JSON:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      } catch (stringifyErr) {
        console.error('   Could not stringify error:', stringifyErr);
      }
      return null;
    }
  },

  // Upsert (insert or update) a movie card
  async upsertMovieCard(cardId: string, cardType: string, cardConfig: any, movies: any[]): Promise<MovieCard | null> {
    try {
      console.log('📤 movieCardService.upsertMovieCard: Calling Supabase...');
      console.log('   Table: movie_cards');
      console.log('   Card ID:', cardId);
      console.log('   Movies count:', movies.length);
      
      // Check if API key is missing
      if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
        const errorMessage = 'Supabase API key is missing. Please set NEXT_PUBLIC_SUPABASE_PARTNER_ANON_KEY (or NEXT_PUBLIC_SUPABASE_IMDB_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY) in your .env.local file.';
        console.error('❌', errorMessage);
        throw new Error(errorMessage);
      }
      
      const cardData = {
        card_id: cardId,
        card_type: cardType,
        card_config: cardConfig,
        movies: movies,
        updated_at: new Date().toISOString()
      };
      
      const startTime = Date.now();
      const query = supabase
        .from('movie_cards')
        .upsert(cardData, {
          onConflict: 'card_id'
        })
        .select()
        .single();
      
      const result = await withTimeout(query, 10000, 'Supabase upsertMovieCard');
      const { data, error } = result;
      
      const duration = Date.now() - startTime;
      console.log(`📥 movieCardService.upsertMovieCard: Response received (${duration}ms)`);
      console.log('   Has data:', !!data);
      console.log('   Has error:', !!error);
      
      if (error) {
        console.error('❌ movieCardService.upsertMovieCard: Supabase error');
        console.error('   Error code:', error.code);
        console.error('   Error message:', error.message);
        console.error('   Error details:', error.details);
        throw error;
      }
      
      if (!data) {
        console.error('❌ No data returned from Supabase upsert');
        throw new Error('No data returned from Supabase');
      }
      
      console.log('✅ movieCardService.upsertMovieCard: Success');
      console.log('   Card ID:', data.card_id);
      console.log('   Movies count:', Array.isArray(data.movies) ? data.movies.length : 0);
      return data as MovieCard;
    } catch (err: any) {
      console.error('❌ movieCardService.upsertMovieCard: Exception caught');
      console.error('   Error type:', typeof err);
      console.error('   Error constructor:', err?.constructor?.name);
      console.error('   Error message:', err?.message || 'No message');
      console.error('   Error code:', err?.code || 'No code');
      console.error('   Error details:', err?.details || 'No details');
      console.error('   Error hint:', err?.hint || 'No hint');
      console.error('   Error toString:', err?.toString?.());
      if (err?.stack) {
        console.error('   Error stack:', err.stack);
      }
      // Try to stringify error with error handling
      try {
        console.error('   Error JSON:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      } catch (stringifyErr) {
        console.error('   Could not stringify error:', stringifyErr);
      }
      throw err;
    }
  }
};
