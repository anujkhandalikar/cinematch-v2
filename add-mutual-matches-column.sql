-- Add mutual_matches column to sessions table
-- This column tracks the shared mutual matches counter for both users

ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS mutual_matches JSONB DEFAULT '[]'::jsonb;

-- Add a comment
COMMENT ON COLUMN sessions.mutual_matches IS 'Shared counter for mutual matches, used to trigger nudge on both devices';

