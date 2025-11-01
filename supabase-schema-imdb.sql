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

