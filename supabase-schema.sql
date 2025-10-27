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
CREATE POLICY "Anyone can read sessions" ON sessions FOR SELECT USING (true);

-- Allow anyone to create sessions
CREATE POLICY "Anyone can create sessions" ON sessions FOR INSERT WITH CHECK (true);

-- Allow anyone to update sessions (for ready states, etc.)
CREATE POLICY "Anyone can update sessions" ON sessions FOR UPDATE USING (true);

-- Allow anyone to read movie likes
CREATE POLICY "Anyone can read movie likes" ON movie_likes FOR SELECT USING (true);

-- Allow anyone to insert movie likes
CREATE POLICY "Anyone can insert movie likes" ON movie_likes FOR INSERT WITH CHECK (true);

-- Allow anyone to read mutual matches
CREATE POLICY "Anyone can read mutual matches" ON mutual_matches FOR SELECT USING (true);

-- Allow anyone to insert mutual matches
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
CREATE TRIGGER detect_mutual_matches_trigger
    AFTER INSERT ON movie_likes
    FOR EACH ROW EXECUTE FUNCTION detect_mutual_matches();
