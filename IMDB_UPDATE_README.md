# IMDb Top 250 Movies Update Script

## Setup

1. **Create the Supabase table:**
   ```sql
   -- Run this in your Supabase SQL editor
   -- File: supabase-schema-imdb.sql
   ```

2. **Set environment variables:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # or use anon key
   NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key
   # OR
   TMDB_BEARER_TOKEN=your_tmdb_bearer_token
   ```

## Running the Update Script

Update IMDb Top 250 movies manually (recommended: every 3 months):

```bash
npx tsx scripts/update-imdb-top250.ts
```

Or install tsx globally:
```bash
npm install -g tsx
tsx scripts/update-imdb-top250.ts
```

## What It Does

1. Scrapes IMDb Top 250 movies page
2. Maps each IMDb ID to TMDB movie ID
3. Fetches full TMDB movie data for each
4. Upserts into Supabase `imdb_top250_movies` table

**Duration:** ~5-10 minutes (rate-limited to respect TMDB API limits)

## How the App Uses It

- App queries Supabase first (fast, instant load)
- Falls back to API scraping if Supabase is empty/old
- When IMDb Top 250 Movies filter is enabled:
  - All other filters are disabled
  - Shows only IMDb Top 250 movies (no additional filtering)














