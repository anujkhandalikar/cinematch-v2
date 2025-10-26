import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nvsobyilytwdkrvbembu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52c29ieWlseXR3ZGtydmJlbWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0OTExMDEsImV4cCI6MjA3NzA2NzEwMX0.CDqCYA0H-5YWJGpZiqlpJyX4CZ2Nlllhwzzv5g7XsfI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
export const sessionService = {
  // Create a new session
  async createSession(sessionData: Omit<Session, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('sessions')
      .insert([sessionData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get session by code
  async getSessionByCode(code: string) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('code', code)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update session
  async updateSession(sessionId: string, updates: Partial<Session>) {
    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
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
    
    if (error) throw error;
    return data;
  },

  // Get likes for a session
  async getSessionLikes(sessionId: string) {
    const { data, error } = await supabase
      .from('movie_likes')
      .select('*')
      .eq('session_id', sessionId);
    
    if (error) throw error;
    return data;
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
