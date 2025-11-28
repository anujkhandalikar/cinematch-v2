import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  addDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  Unsubscribe,
  QuerySnapshot,
  DocumentSnapshot,
  Query
} from 'firebase/firestore';

// Firebase configuration - get from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// Validate Firebase configuration
if (typeof window === 'undefined') {
  console.log('🔧 [Server] Firebase Config Check:');
  console.log('   NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Not set');
  console.log('   NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Not set');
}

if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
  const errorMessage = `
⚠️ Missing Firebase Configuration!

Please set the following environment variables in your .env.local file:
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID

To get your Firebase config:
1. Go to your Firebase project dashboard
2. Navigate to Project Settings → General
3. Scroll down to "Your apps" section
4. Click on web app icon (</>) to get config
5. Copy the config values to .env.local

⚠️ IMPORTANT: If you just added the config to .env.local, you MUST restart your Next.js dev server!
  `.trim();
  
  console.error(errorMessage);
  
  if (typeof window !== 'undefined') {
    console.error('❌ Firebase configuration is missing. Please check your .env.local file and restart the dev server.');
  }
}

// Initialize Firebase
const app: FirebaseApp = getApps().length === 0 
  ? initializeApp(firebaseConfig)
  : getApps()[0];

// Initialize Firestore
export const db: Firestore = getFirestore(app);

// Debug Firebase configuration
if (typeof window !== 'undefined') {
  console.log('🔧 Firebase Configuration:', {
    project: {
      projectId: firebaseConfig.projectId,
      hasProjectId: !!firebaseConfig.projectId,
      hasApiKey: !!firebaseConfig.apiKey,
      purpose: 'Session management, movie likes, mutual matches, movie cards, IMDb data'
    },
    note: 'Using Firebase Firestore for all database operations'
  });
  
  if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
    console.warn('⚠️ Firebase configuration is missing or incomplete. Firebase features will not work.');
  }
}

// Database types (same as Supabase for compatibility)
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
  movie_deck?: any;
  mutual_matches?: any[];
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

// Helper to convert Firestore Timestamp to ISO string
function timestampToISO(timestamp: any): string {
  if (timestamp?.toDate) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  return new Date().toISOString();
}

// Helper to convert ISO string or Date to Firestore Timestamp
function toFirestoreTimestamp(value: string | Date | Timestamp | any): any {
  if (value instanceof Timestamp) {
    return value;
  }
  if (value instanceof Date) {
    return Timestamp.fromDate(value);
  }
  if (typeof value === 'string') {
    return Timestamp.fromDate(new Date(value));
  }
  return serverTimestamp();
}

// Convert Firestore document to Session
function firestoreDocToSession(docSnapshot: DocumentSnapshot): Session | null {
  if (!docSnapshot.exists()) {
    return null;
  }
  const data = docSnapshot.data()!;
  return {
    id: docSnapshot.id,
    code: data.code || '',
    mode: data.mode || 'single',
    expires_at: timestampToISO(data.expires_at),
    seed: data.seed || 0.5,
    creator_id: data.creator_id || '',
    joiner_id: data.joiner_id,
    creator_ready: data.creator_ready || false,
    joiner_ready: data.joiner_ready || false,
    creator_preferences: data.creator_preferences || {},
    joiner_preferences: data.joiner_preferences,
    movie_deck: data.movie_deck,
    mutual_matches: data.mutual_matches || [],
    created_at: timestampToISO(data.created_at),
    updated_at: timestampToISO(data.updated_at),
  };
}

// Convert Firestore document to MovieLike
function firestoreDocToMovieLike(docSnapshot: DocumentSnapshot): MovieLike {
  const data = docSnapshot.data()!;
  return {
    id: docSnapshot.id,
    session_id: data.session_id || '',
    user_id: data.user_id || '',
    movie_id: data.movie_id || '',
    movie_data: data.movie_data || {},
    created_at: timestampToISO(data.created_at),
  };
}

// Convert Firestore document to MutualMatch
function firestoreDocToMutualMatch(docSnapshot: DocumentSnapshot): MutualMatch {
  const data = docSnapshot.data()!;
  return {
    id: docSnapshot.id,
    session_id: data.session_id || '',
    movie_id: data.movie_id || '',
    movie_data: data.movie_data || {},
    created_at: timestampToISO(data.created_at),
  };
}

// Test Firebase connection
export async function testFirebaseConnection() {
  console.log('🧪 Testing Firebase connection...');
  console.log('   Project ID:', firebaseConfig.projectId);
  console.log('   Purpose: Session management, movie likes, mutual matches');
  
  const tests = {
    sessions: false,
    movie_likes: false,
    mutual_matches: false
  };
  
  // Test sessions collection access
  try {
    const sessionsRef = collection(db, 'sessions');
    const testQuery = query(sessionsRef, where('__name__', '!=', 'invalid'));
    await getDocs(testQuery);
    tests.sessions = true;
    console.log('✅ sessions collection: OK');
  } catch (err: any) {
    console.error('❌ sessions collection test failed:', {
      code: err.code,
      message: err.message
    });
  }
  
  // Test movie_likes collection access
  try {
    const likesRef = collection(db, 'movie_likes');
    const testQuery = query(likesRef, where('__name__', '!=', 'invalid'));
    await getDocs(testQuery);
    tests.movie_likes = true;
    console.log('✅ movie_likes collection: OK');
  } catch (err: any) {
    console.error('❌ movie_likes collection test failed:', {
      code: err.code,
      message: err.message
    });
  }
  
  // Test mutual_matches collection access
  try {
    const matchesRef = collection(db, 'mutual_matches');
    const testQuery = query(matchesRef, where('__name__', '!=', 'invalid'));
    await getDocs(testQuery);
    tests.mutual_matches = true;
    console.log('✅ mutual_matches collection: OK');
  } catch (err: any) {
    console.error('❌ mutual_matches collection test failed:', {
      code: err.code,
      message: err.message
    });
  }
  
  console.log('🧪 Firebase connection test results:', tests);
  return tests;
}

// Session Service
export const sessionService = {
  // Create a new session
  async createSession(sessionData: Omit<Session, 'id' | 'created_at' | 'updated_at'>) {
    try {
      console.log('📤 sessionService.createSession: Starting...');
      console.log('   Collection: sessions');
      console.log('   Data keys:', Object.keys(sessionData));
      
      if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
        const errorMessage = 'Firebase configuration is missing. Please set NEXT_PUBLIC_FIREBASE_PROJECT_ID and NEXT_PUBLIC_FIREBASE_API_KEY in your .env.local file.';
        console.error('❌', errorMessage);
        const enhancedError = new Error(errorMessage);
        (enhancedError as any).code = 'MISSING_CONFIG';
        (enhancedError as any).isMissingConfig = true;
        throw enhancedError;
      }
      
      const startTime = Date.now();
      const sessionsRef = collection(db, 'sessions');
      
      // Prepare data for Firestore
      const firestoreData = {
        ...sessionData,
        expires_at: toFirestoreTimestamp(sessionData.expires_at),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      
      const docRef = await addDoc(sessionsRef, firestoreData);
      const docSnapshot = await getDoc(docRef);
      
      const duration = Date.now() - startTime;
      console.log(`📥 sessionService.createSession: Response received (${duration}ms)`);
      
      if (!docSnapshot.exists()) {
        console.error('❌ Session document not found after creation');
        throw new Error('Session not created');
      }
      
      const session = firestoreDocToSession(docSnapshot);
      if (!session) {
        throw new Error('Failed to parse session data');
      }
      
      console.log('✅ sessionService.createSession: Success');
      console.log('   Session ID:', session.id);
      console.log('   Session code:', session.code);
      return session;
    } catch (err: any) {
      console.error('❌ sessionService.createSession: Exception caught');
      console.error('   Error type:', typeof err);
      console.error('   Error message:', err?.message);
      console.error('   Error code:', err?.code);
      
      const message = err?.message || 'Failed to create Firebase session. Please check your Firebase configuration.';
      const enhancedError = new Error(message);
      (enhancedError as any).originalError = err;
      (enhancedError as any).code = err?.code;
      throw enhancedError;
    }
  },

  // Get session by code
  async getSessionByCode(code: string) {
    try {
      console.log('📤 sessionService.getSessionByCode: Calling Firestore...');
      console.log('   Collection: sessions');
      console.log('   Code:', code);
      
      if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
        const errorMessage = 'Firebase configuration is missing. Please set NEXT_PUBLIC_FIREBASE_PROJECT_ID and NEXT_PUBLIC_FIREBASE_API_KEY in your .env.local file.';
        console.error('❌', errorMessage);
        const enhancedError = new Error(errorMessage);
        (enhancedError as any).code = 'MISSING_CONFIG';
        (enhancedError as any).isMissingConfig = true;
        throw enhancedError;
      }
      
      const startTime = Date.now();
      const sessionsRef = collection(db, 'sessions');
      const q = query(sessionsRef, where('code', '==', code));
      const querySnapshot = await getDocs(q);
      
      const duration = Date.now() - startTime;
      console.log(`📥 sessionService.getSessionByCode: Response received (${duration}ms)`);
      
      if (querySnapshot.empty) {
        console.error('❌ No session found for code:', code);
        throw new Error('Session not found');
      }
      
      const docSnapshot = querySnapshot.docs[0];
      const session = firestoreDocToSession(docSnapshot);
      
      if (!session) {
        throw new Error('Failed to parse session data');
      }
      
      console.log('✅ sessionService.getSessionByCode: Success');
      console.log('   Session ID:', session.id);
      console.log('   Session code:', session.code);
      return session;
    } catch (err: any) {
      console.error('❌ sessionService.getSessionByCode: Exception caught');
      console.error('   Error message:', err?.message);
      console.error('   Error code:', err?.code);
      throw err;
    }
  },

  // Update session
  async updateSession(sessionId: string, updates: Partial<Session>) {
    try {
      console.log('📤 sessionService.updateSession: Calling Firestore...');
      console.log('   Collection: sessions');
      console.log('   Session ID:', sessionId);
      console.log('   Update keys:', Object.keys(updates));
      
      if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
        const errorMessage = 'Firebase configuration is missing. Please set NEXT_PUBLIC_FIREBASE_PROJECT_ID and NEXT_PUBLIC_FIREBASE_API_KEY in your .env.local file.';
        console.error('❌', errorMessage);
        const enhancedError = new Error(errorMessage);
        (enhancedError as any).code = 'MISSING_CONFIG';
        (enhancedError as any).isMissingConfig = true;
        throw enhancedError;
      }
      
      const updatesWithTimestamp: any = {
        ...updates,
        updated_at: serverTimestamp(),
      };
      
      // Convert expires_at if present
      if (updates.expires_at) {
        updatesWithTimestamp.expires_at = toFirestoreTimestamp(updates.expires_at);
      }
      
      const startTime = Date.now();
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, updatesWithTimestamp);
      const docSnapshot = await getDoc(sessionRef);
      
      const duration = Date.now() - startTime;
      console.log(`📥 sessionService.updateSession: Response received (${duration}ms)`);
      
      if (!docSnapshot.exists()) {
        console.error('❌ Session not found after update');
        throw new Error('Session not found');
      }
      
      const session = firestoreDocToSession(docSnapshot);
      if (!session) {
        throw new Error('Failed to parse session data');
      }
      
      console.log('✅ sessionService.updateSession: Success');
      console.log('   Session ID:', session.id);
      console.log('   Session code:', session.code);
      return session;
    } catch (err: any) {
      console.error('❌ sessionService.updateSession: Exception caught');
      console.error('   Error message:', err?.message);
      console.error('   Error code:', err?.code);
      throw err;
    }
  },

  // Subscribe to session changes
  subscribeToSession(sessionId: string, callback: (payload: any) => void): Unsubscribe {
    const sessionRef = doc(db, 'sessions', sessionId);
    
    return onSnapshot(sessionRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const session = firestoreDocToSession(docSnapshot);
        if (session) {
          callback({
            eventType: 'UPDATE',
            new: session,
            old: null
          });
        }
      }
    }, (error) => {
      console.error('Session subscription error:', error);
    });
  }
};

// Likes Service
export const likesService = {
  // Add a movie like
  async addLike(sessionId: string, userId: string, movieId: string, movieData: any) {
    console.log('🔵 addLike called:', {
      sessionId,
      userId,
      movieId,
      movieTitle: movieData?.title,
      collection: 'movie_likes'
    });
    
    try {
      const likesRef = collection(db, 'movie_likes');
      
      // Check if like already exists
      const existingQuery = query(
        likesRef,
        where('session_id', '==', sessionId),
        where('user_id', '==', userId),
        where('movie_id', '==', movieId)
      );
      const existingDocs = await getDocs(existingQuery);
      
      if (!existingDocs.empty) {
        console.log('⚠️ Like already exists, returning existing document');
        return firestoreDocToMovieLike(existingDocs.docs[0]);
      }
      
      const newLike = {
        session_id: sessionId,
        user_id: userId,
        movie_id: movieId,
        movie_data: movieData,
        created_at: serverTimestamp(),
      };
      
      const docRef = await addDoc(likesRef, newLike);
      const docSnapshot = await getDoc(docRef);
      
      if (!docSnapshot.exists()) {
        throw new Error('Like not created');
      }
      
      const like = firestoreDocToMovieLike(docSnapshot);
      
      // Check for mutual match after creating like
      await this.checkForMutualMatch(sessionId, movieId, movieData);
      
      console.log('✅ addLike success:', like);
      return like;
    } catch (err: any) {
      console.error('❌ addLike exception:', {
        message: err?.message,
        code: err?.code,
        fullError: err
      });
      throw err;
    }
  },

  // Check for mutual match (called after adding a like)
  async checkForMutualMatch(sessionId: string, movieId: string, movieData: any) {
    try {
      // Get all likes for this movie in this session
      const likesRef = collection(db, 'movie_likes');
      const q = query(
        likesRef,
        where('session_id', '==', sessionId),
        where('movie_id', '==', movieId)
      );
      const querySnapshot = await getDocs(q);
      
      // If there are at least 2 likes from different users, it's a mutual match
      const userIds = new Set(querySnapshot.docs.map(doc => doc.data().user_id));
      if (userIds.size >= 2) {
        // Check if match already exists
        const matchesRef = collection(db, 'mutual_matches');
        const matchQuery = query(
          matchesRef,
          where('session_id', '==', sessionId),
          where('movie_id', '==', movieId)
        );
        const matchDocs = await getDocs(matchQuery);
        
        if (matchDocs.empty) {
          // Create mutual match
          await addDoc(matchesRef, {
            session_id: sessionId,
            movie_id: movieId,
            movie_data: movieData,
            created_at: serverTimestamp(),
          });
          console.log('✅ Mutual match detected and created:', movieId);
        }
      }
    } catch (err) {
      console.error('Error checking for mutual match:', err);
    }
  },

  // Get likes for a session
  async getSessionLikes(sessionId: string) {
    console.log('🔵 getSessionLikes called:', { sessionId, collection: 'movie_likes' });
    
    try {
      const likesRef = collection(db, 'movie_likes');
      const q = query(likesRef, where('session_id', '==', sessionId));
      const querySnapshot = await getDocs(q);
      
      const likes = querySnapshot.docs.map(doc => firestoreDocToMovieLike(doc));
      
      console.log('✅ getSessionLikes success:', { count: likes.length, data: likes });
      return likes;
    } catch (err: any) {
      console.error('❌ getSessionLikes exception:', {
        message: err?.message,
        code: err?.code,
        fullError: err
      });
      throw err;
    }
  },

  // Get likes for a specific user in a session
  async getUserLikes(sessionId: string, userId: string) {
    const likesRef = collection(db, 'movie_likes');
    const q = query(
      likesRef,
      where('session_id', '==', sessionId),
      where('user_id', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => firestoreDocToMovieLike(doc));
  },

  // Subscribe to likes changes
  subscribeToLikes(sessionId: string, callback: (payload: any) => void): Unsubscribe {
    const likesRef = collection(db, 'movie_likes');
    const q = query(likesRef, where('session_id', '==', sessionId));
    
    return onSnapshot(q, (querySnapshot) => {
      querySnapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          callback({
            eventType: 'INSERT',
            new: firestoreDocToMovieLike(change.doc),
            old: null
          });
        } else if (change.type === 'modified') {
          callback({
            eventType: 'UPDATE',
            new: firestoreDocToMovieLike(change.doc),
            old: null
          });
        } else if (change.type === 'removed') {
          callback({
            eventType: 'DELETE',
            new: null,
            old: firestoreDocToMovieLike(change.doc)
          });
        }
      });
    }, (error) => {
      console.error('Likes subscription error:', error);
    });
  }
};

// Matches Service
export const matchesService = {
  // Add a mutual match (usually called automatically, but available for manual use)
  async addMatch(sessionId: string, movieId: string, movieData: any) {
    try {
      // Check if match already exists
      const matchesRef = collection(db, 'mutual_matches');
      const q = query(
        matchesRef,
        where('session_id', '==', sessionId),
        where('movie_id', '==', movieId)
      );
      const existingDocs = await getDocs(q);
      
      if (!existingDocs.empty) {
        return firestoreDocToMutualMatch(existingDocs.docs[0]);
      }
      
      const docRef = await addDoc(matchesRef, {
        session_id: sessionId,
        movie_id: movieId,
        movie_data: movieData,
        created_at: serverTimestamp(),
      });
      
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        throw new Error('Match not created');
      }
      
      return firestoreDocToMutualMatch(docSnapshot);
    } catch (err: any) {
      throw err;
    }
  },

  // Get mutual matches for a session
  async getSessionMatches(sessionId: string) {
    const matchesRef = collection(db, 'mutual_matches');
    const q = query(matchesRef, where('session_id', '==', sessionId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => firestoreDocToMutualMatch(doc));
  },

  // Subscribe to matches changes
  subscribeToMatches(sessionId: string, callback: (payload: any) => void): Unsubscribe {
    const matchesRef = collection(db, 'mutual_matches');
    const q = query(matchesRef, where('session_id', '==', sessionId));
    
    return onSnapshot(q, (querySnapshot) => {
      querySnapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          callback({
            eventType: 'INSERT',
            new: firestoreDocToMutualMatch(change.doc),
            old: null
          });
        } else if (change.type === 'modified') {
          callback({
            eventType: 'UPDATE',
            new: firestoreDocToMutualMatch(change.doc),
            old: null
          });
        } else if (change.type === 'removed') {
          callback({
            eventType: 'DELETE',
            new: null,
            old: firestoreDocToMutualMatch(change.doc)
          });
        }
      });
    }, (error) => {
      console.error('Matches subscription error:', error);
    });
  }
};

// Movie Card types
export interface MovieCard {
  card_id: string;
  card_type: string;
  card_config: any;
  movies: any[];
  updated_at: string;
  created_at: string;
}

// Movie Card Service
export const movieCardService = {
  // Get movies for a mood card
  async getMovieCard(cardId: string): Promise<MovieCard | null> {
    try {
      console.log('📤 movieCardService.getMovieCard: Calling Firestore...');
      console.log('   Collection: movie_cards');
      console.log('   Card ID:', cardId);
      
      if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
        console.warn('⚠️ Firebase configuration is missing. Cannot fetch movie card.');
        return null;
      }
      
      const startTime = Date.now();
      const cardRef = doc(db, 'movie_cards', cardId);
      const docSnapshot = await getDoc(cardRef);
      
      const duration = Date.now() - startTime;
      console.log(`📥 movieCardService.getMovieCard: Response received (${duration}ms)`);
      
      if (!docSnapshot.exists()) {
        console.log('ℹ️ Movie card not found:', cardId);
        return null;
      }
      
      const data = docSnapshot.data()!;
      const movieCard: MovieCard = {
        card_id: docSnapshot.id,
        card_type: data.card_type || 'mood_preset',
        card_config: data.card_config || {},
        movies: data.movies || [],
        updated_at: timestampToISO(data.updated_at),
        created_at: timestampToISO(data.created_at),
      };
      
      console.log('✅ movieCardService.getMovieCard: Success');
      console.log('   Card ID:', movieCard.card_id);
      console.log('   Movies count:', Array.isArray(movieCard.movies) ? movieCard.movies.length : 0);
      return movieCard;
    } catch (err: any) {
      console.error('❌ movieCardService.getMovieCard: Exception caught');
      console.error('   Error message:', err?.message);
      return null;
    }
  },

  // Upsert (insert or update) a movie card
  async upsertMovieCard(cardId: string, cardType: string, cardConfig: any, movies: any[]): Promise<MovieCard | null> {
    try {
      console.log('📤 movieCardService.upsertMovieCard: Calling Firestore...');
      console.log('   Collection: movie_cards');
      console.log('   Card ID:', cardId);
      console.log('   Movies count:', movies.length);
      
      if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
        const errorMessage = 'Firebase configuration is missing. Please set NEXT_PUBLIC_FIREBASE_PROJECT_ID and NEXT_PUBLIC_FIREBASE_API_KEY in your .env.local file.';
        console.error('❌', errorMessage);
        throw new Error(errorMessage);
      }
      
      const cardRef = doc(db, 'movie_cards', cardId);
      const cardData = {
        card_id: cardId,
        card_type: cardType,
        card_config: cardConfig,
        movies: movies,
        updated_at: serverTimestamp(),
      };
      
      const startTime = Date.now();
      await setDoc(cardRef, cardData, { merge: true });
      const docSnapshot = await getDoc(cardRef);
      
      const duration = Date.now() - startTime;
      console.log(`📥 movieCardService.upsertMovieCard: Response received (${duration}ms)`);
      
      if (!docSnapshot.exists()) {
        console.error('❌ Movie card not found after upsert');
        throw new Error('Movie card not created');
      }
      
      const data = docSnapshot.data()!;
      const movieCard: MovieCard = {
        card_id: docSnapshot.id,
        card_type: data.card_type || cardType,
        card_config: data.card_config || cardConfig,
        movies: data.movies || movies,
        updated_at: timestampToISO(data.updated_at),
        created_at: timestampToISO(data.created_at || data.updated_at),
      };
      
      console.log('✅ movieCardService.upsertMovieCard: Success');
      console.log('   Card ID:', movieCard.card_id);
      console.log('   Movies count:', Array.isArray(movieCard.movies) ? movieCard.movies.length : 0);
      return movieCard;
    } catch (err: any) {
      console.error('❌ movieCardService.upsertMovieCard: Exception caught');
      console.error('   Error message:', err?.message);
      throw err;
    }
  }
};

// Export for backward compatibility (if any code still uses supabaseImdb)
export const supabaseImdb = db;

