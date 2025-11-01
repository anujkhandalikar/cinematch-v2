# IMDb Top 250 Movies in Supabase

## ⚠️ IMPORTANT: Table Must Be Created First!

**The table doesn't exist yet!** You need to create it first.

## Step 1: Create the Table

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**
5. Copy and paste the entire contents of `supabase-schema-imdb.sql`
6. Click **"Run"** (or press Cmd/Ctrl + Enter)

This creates the `imdb_top250_movies` table.

## Step 2: Populate the Table

After the table is created, run:

```bash
npx tsx scripts/populate-imdb-top250-complete.ts
```

This will:
- Scrape all 250 movies from IMDb
- Map to TMDB IDs
- Fetch full movie data
- Upload to Supabase

Takes ~5-10 minutes.

## Step 3: View the Data

Once populated, you can view it:

**Table Name:** `imdb_top250_movies`

## How to Access in Supabase Dashboard

1. **Go to your Supabase Dashboard:**
   - URL: `https://supabase.com/dashboard`
   - Select your project

2. **Navigate to Table Editor:**
   - In the left sidebar, click **"Table Editor"**
   - Look for the table: **`imdb_top250_movies`**

3. **View/Edit Data:**
   - Click on `imdb_top250_movies` to see all rows
   - You can:
     - View all 250 movies
     - See columns: `id`, `imdb_id`, `rank`, `tmdb_id`, `tmdb_data`, `title`, `year`, `updated_at`, `created_at`
     - Edit data if needed
     - Add/delete rows

## Table Schema

```sql
imdb_top250_movies
├── id (SERIAL PRIMARY KEY)
├── imdb_id (TEXT UNIQUE) - e.g., "tt0111161"
├── rank (INTEGER) - 1-250
├── tmdb_id (INTEGER) - TMDB movie ID
├── tmdb_data (JSONB) - Full TMDB movie data
├── title (TEXT) - Movie title
├── year (INTEGER) - Release year
├── updated_at (TIMESTAMP)
└── created_at (TIMESTAMP)
```

## Direct SQL Query

You can also query directly in Supabase SQL Editor:

```sql
-- View all movies
SELECT rank, title, year, imdb_id 
FROM imdb_top250_movies 
ORDER BY rank 
LIMIT 250;

-- Count movies
SELECT COUNT(*) FROM imdb_top250_movies;

-- View a specific movie
SELECT * FROM imdb_top250_movies WHERE rank = 1;
```

## Quick Access URLs

1. **Supabase Dashboard:** https://supabase.com/dashboard
2. Select your project (should see project name like "nvsobyilytwdkrvbembu" or your custom name)
3. **SQL Editor:** Left sidebar → "SQL Editor" → "New query"
4. **Table Editor:** Left sidebar → "Table Editor" → Look for `imdb_top250_movies`

**Your actual project URLs:**
- Dashboard: `https://supabase.com/dashboard/project/xzlgttxargsptzeghppo`
- Table Editor: `https://supabase.com/dashboard/project/xzlgttxargsptzeghppo/editor`
- SQL Editor: `https://supabase.com/dashboard/project/xzlgttxargsptzeghppo/sql/new`

