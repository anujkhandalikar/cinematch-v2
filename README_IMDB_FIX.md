# Fix for Only 20-25 Movies Showing

## The Problem
The scraping is only finding ~25 movies from IMDb instead of all 250. This is because:
- IMDb's page structure may have changed
- The scraping strategies aren't finding all entries
- Some content may be dynamically loaded

## The Solution

**Run the update script to populate Supabase** - This is the proper way to get all 250 movies:

```bash
npx tsx scripts/update-imdb-top250.ts
```

The script will:
1. Scrape IMDb Top 250
2. Map all IDs to TMDB
3. Fetch full movie data
4. Store in Supabase

Once Supabase is populated, the app will load all 250 movies instantly.

## Why the API is Limited
The API route is designed as a fallback - it scrapes on-demand which is:
- Slow (5-10 minutes)
- Limited by TMDB rate limits
- May not find all 250 due to parsing issues

The update script is the proper way to handle this - run it once, store in Supabase, then enjoy instant loads.












