# Setup IMDb Top 250 Movies Table - Step by Step

## 🎯 Quick Start (2 Steps)

### Step 1: Create the Table in Supabase

1. Open: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** (left sidebar)
4. Click **"New query"** button
5. Copy the ENTIRE contents of `supabase-schema-imdb.sql` file
6. Paste into the SQL editor
7. Click **"Run"** (or press Cmd+Enter / Ctrl+Enter)
8. You should see: "Success. No rows returned" ✅

### Step 2: Populate the Table

**⚠️ IMPORTANT: Run this in your TERMINAL, NOT in Supabase SQL Editor!**

1. Open your terminal/command prompt
2. Navigate to your project directory:
   ```bash
   cd "/Users/anujk/cinematch copy"
   ```
3. Run the populate script:
   ```bash
   npx tsx scripts/populate-imdb-top250-complete.ts
   ```

**Note:** This is a terminal command, NOT a SQL command!

**What happens:**
- Scrapes all 250 movies from IMDb (~1 minute)
- Maps each to TMDB ID (~5-10 minutes total)
- Fetches full movie data from TMDB
- Uploads all 250 movies to Supabase
- Shows progress in terminal

**Required environment variables:**
You need to set these before running the script:

1. **Create `.env.local` file** in your project root:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xzlgttxargsptzeghppo.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_key
   ```

2. **Get your Supabase keys:**
   - Go to: https://supabase.com/dashboard/project/xzlgttxargsptzeghppo/settings/api
   - Copy the "Project URL" and "anon/public key"

3. **You already have TMDB key** ✅ (found in your env)

## ✅ Verify It Worked

After running the script, check Supabase:

1. Go to **Table Editor** in Supabase
2. Click on `imdb_top250_movies`
3. You should see **250 rows** (or close to 250)
4. Each row has: rank, title, year, imdb_id, tmdb_id, tmdb_data

## 🎬 Once Populated

The app will automatically load all 250 movies from Supabase when you enable "IMDb Top 250 Movies" filter. No more scraping needed!

## 🔄 Update Every 3 Months

When IMDb Top 250 changes, just re-run:
```bash
npx tsx scripts/populate-imdb-top250-complete.ts
```

It will update the existing rows.

