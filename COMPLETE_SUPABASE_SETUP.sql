-- ============================================================================
-- COMPLETE SUPABASE SETUP FOR CINEMATCH
-- ============================================================================
-- Run this entire file in your Supabase SQL Editor
-- Or run each section separately if you prefer
-- ============================================================================

-- ============================================================================
-- SECTION 1: SESSIONS, MOVIE_LIKES, AND MUTUAL_MATCHES TABLES
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE IF EXISTS sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS movie_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mutual_matches ENABLE ROW LEVEL SECURITY;

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(6) UNIQUE NOT NULL,
  mode VARCHAR(10) NOT NULL CHECK (mode IN ('single', 'dual')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  seed DECIMAL NOT NULL,
  creator_id VARCHAR(255) NOT NULL,
  joiner_id VARCHAR(255),
  creator_ready BOOLEAN DEFAULT FALSE,
  joiner_ready BOOLEAN DEFAULT FALSE,
  creator_preferences JSONB,
  joiner_preferences JSONB,
  movie_deck JSONB, -- Store the combined movie deck for both users
  mutual_matches JSONB DEFAULT '[]'::jsonb, -- Shared mutual matches counter for both users
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create movie_likes table
CREATE TABLE IF NOT EXISTS movie_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  movie_id VARCHAR(255) NOT NULL,
  movie_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mutual_matches table
CREATE TABLE IF NOT EXISTS mutual_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  movie_id VARCHAR(255) NOT NULL,
  movie_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_code ON sessions(code);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_movie_likes_session_id ON movie_likes(session_id);
CREATE INDEX IF NOT EXISTS idx_movie_likes_user_id ON movie_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_movie_likes_movie_id ON movie_likes(movie_id);
CREATE INDEX IF NOT EXISTS idx_mutual_matches_session_id ON mutual_matches(session_id);
CREATE INDEX IF NOT EXISTS idx_mutual_matches_movie_id ON mutual_matches(movie_id);

-- Create unique constraint to prevent duplicate likes
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_movie_like ON movie_likes(session_id, user_id, movie_id);

-- Create unique constraint to prevent duplicate matches
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_session_movie_match ON mutual_matches(session_id, movie_id);

-- Row Level Security Policies
-- Allow anyone to read sessions (for joining)
DROP POLICY IF EXISTS "Anyone can read sessions" ON sessions;
CREATE POLICY "Anyone can read sessions" ON sessions FOR SELECT USING (true);

-- Allow anyone to create sessions
DROP POLICY IF EXISTS "Anyone can create sessions" ON sessions;
CREATE POLICY "Anyone can create sessions" ON sessions FOR INSERT WITH CHECK (true);

-- Allow anyone to update sessions (for ready states, etc.)
DROP POLICY IF EXISTS "Anyone can update sessions" ON sessions;
CREATE POLICY "Anyone can update sessions" ON sessions FOR UPDATE USING (true);

-- Allow anyone to read movie likes
DROP POLICY IF EXISTS "Anyone can read movie likes" ON movie_likes;
CREATE POLICY "Anyone can read movie likes" ON movie_likes FOR SELECT USING (true);

-- Allow anyone to insert movie likes
DROP POLICY IF EXISTS "Anyone can insert movie likes" ON movie_likes;
CREATE POLICY "Anyone can insert movie likes" ON movie_likes FOR INSERT WITH CHECK (true);

-- Allow anyone to read mutual matches
DROP POLICY IF EXISTS "Anyone can read mutual matches" ON mutual_matches;
CREATE POLICY "Anyone can read mutual matches" ON mutual_matches FOR SELECT USING (true);

-- Allow anyone to insert mutual matches
DROP POLICY IF EXISTS "Anyone can insert mutual matches" ON mutual_matches;
CREATE POLICY "Anyone can insert mutual matches" ON mutual_matches FOR INSERT WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on sessions
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to detect and create mutual matches
CREATE OR REPLACE FUNCTION detect_mutual_matches()
RETURNS TRIGGER AS $$
DECLARE
    other_user_likes INTEGER;
BEGIN
    -- Check if there's a mutual like for this movie
    SELECT COUNT(*) INTO other_user_likes
    FROM movie_likes ml
    WHERE ml.session_id = NEW.session_id
      AND ml.movie_id = NEW.movie_id
      AND ml.user_id != NEW.user_id;
    
    -- If there's a mutual like, create a match
    IF other_user_likes > 0 THEN
        INSERT INTO mutual_matches (session_id, movie_id, movie_data)
        VALUES (NEW.session_id, NEW.movie_id, NEW.movie_data)
        ON CONFLICT (session_id, movie_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically detect mutual matches
DROP TRIGGER IF EXISTS detect_mutual_matches_trigger ON movie_likes;
CREATE TRIGGER detect_mutual_matches_trigger
    AFTER INSERT ON movie_likes
    FOR EACH ROW EXECUTE FUNCTION detect_mutual_matches();

-- ============================================================================
-- SECTION 2: MOVIE_CARDS TABLE (for mood preset cards)
-- ============================================================================

-- Movie Cards table for pre-stored mood card movies
-- Stores 100 movies per mood preset card (Bollywood, LightFun, CriticallyAcclaimed, NewPopular)

CREATE TABLE IF NOT EXISTS movie_cards (
  card_id TEXT PRIMARY KEY,
  card_type TEXT NOT NULL DEFAULT 'mood_preset',
  card_config JSONB NOT NULL,
  movies JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_movie_cards_card_id ON movie_cards(card_id);
CREATE INDEX IF NOT EXISTS idx_movie_cards_card_type ON movie_cards(card_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_movie_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS trigger_movie_cards_updated_at ON movie_cards;
CREATE TRIGGER trigger_movie_cards_updated_at
  BEFORE UPDATE ON movie_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_movie_cards_updated_at();

-- Row Level Security Policies
ALTER TABLE movie_cards ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read movie cards
DROP POLICY IF EXISTS "Anyone can read movie cards" ON movie_cards;
CREATE POLICY "Anyone can read movie cards" ON movie_cards FOR SELECT USING (true);

-- Allow anyone to insert/update movie cards (for admin scripts)
DROP POLICY IF EXISTS "Anyone can insert movie cards" ON movie_cards;
CREATE POLICY "Anyone can insert movie cards" ON movie_cards FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update movie cards" ON movie_cards;
CREATE POLICY "Anyone can update movie cards" ON movie_cards FOR UPDATE USING (true);

-- ============================================================================
-- SECTION 3: IMDB_TOP250_MOVIES TABLE (optional, for CriticallyAcclaimed mood)
-- ============================================================================

-- IMDb Top 250 Movies table
-- Stores pre-mapped IMDb Top 250 movies with full TMDB data
-- Updated manually every 3 months

CREATE TABLE IF NOT EXISTS imdb_top250_movies (
  id SERIAL PRIMARY KEY,
  imdb_id TEXT UNIQUE NOT NULL,
  rank INTEGER NOT NULL,
  tmdb_id INTEGER,
  tmdb_data JSONB,
  title TEXT,
  year INTEGER,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_imdb_top250_rank ON imdb_top250_movies(rank);
CREATE INDEX IF NOT EXISTS idx_imdb_top250_tmdb_id ON imdb_top250_movies(tmdb_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_imdb_top250_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS trigger_imdb_top250_updated_at ON imdb_top250_movies;
CREATE TRIGGER trigger_imdb_top250_updated_at
  BEFORE UPDATE ON imdb_top250_movies
  FOR EACH ROW
  EXECUTE FUNCTION update_imdb_top250_updated_at();

-- ============================================================================
-- VERIFICATION QUERIES (run these to check your setup)
-- ============================================================================

-- Check if all tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('sessions', 'movie_likes', 'mutual_matches', 'movie_cards', 'imdb_top250_movies')
ORDER BY table_name;

-- Check table row counts
SELECT 
    'sessions' AS table_name,
    COUNT(*) AS row_count
FROM sessions
UNION ALL
SELECT 
    'movie_likes' AS table_name,
    COUNT(*) AS row_count
FROM movie_likes
UNION ALL
SELECT 
    'mutual_matches' AS table_name,
    COUNT(*) AS row_count
FROM mutual_matches
UNION ALL
SELECT 
    'movie_cards' AS table_name,
    COUNT(*) AS row_count
FROM movie_cards
UNION ALL
SELECT 
    'imdb_top250_movies' AS table_name,
    COUNT(*) AS row_count
FROM imdb_top250_movies;

-- Check movie_cards content
SELECT 
    card_id,
    card_type,
    jsonb_array_length(movies) AS movie_count,
    updated_at
FROM movie_cards
ORDER BY card_id;

-- Check indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
    AND tablename IN ('sessions', 'movie_likes', 'mutual_matches', 'movie_cards', 'imdb_top250_movies')
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('sessions', 'movie_likes', 'mutual_matches', 'movie_cards')
ORDER BY tablename, policyname;

-- ============================================================================
-- END OF SETUP
-- ============================================================================

