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
CREATE POLICY "Anyone can read movie cards" ON movie_cards FOR SELECT USING (true);

-- Allow anyone to insert/update movie cards (for admin scripts)
CREATE POLICY "Anyone can insert movie cards" ON movie_cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update movie cards" ON movie_cards FOR UPDATE USING (true);



