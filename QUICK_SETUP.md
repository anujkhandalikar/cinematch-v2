# Quick Setup for IMDb Top 250

## Your Supabase Project
**Project ID:** `xzlgttxargsptzeghppo`  
**Dashboard:** https://supabase.com/dashboard/project/xzlgttxargsptzeghppo

## Step 1: Create Table (In Supabase)

1. Go to: https://supabase.com/dashboard/project/xzlgttxargsptzeghppo/sql/new
2. Copy ENTIRE contents of `supabase-schema-imdb.sql`
3. Paste in SQL editor
4. Click "Run"

## Step 2: Get Your Supabase Keys

1. Go to: https://supabase.com/dashboard/project/xzlgttxargsptzeghppo/settings/api
2. Copy these values:
   - **Project URL** (should be: `https://xzlgttxargsptzeghppo.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

## Step 3: Update .env.local

Edit your `.env.local` file and add:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xzlgttxargsptzeghppo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste_your_anon_key_here
NEXT_PUBLIC_TMDB_API_KEY=1e652e44e3d133f83a692081459137a9
```

## Step 4: Run Populate Script

In your terminal:

```bash
cd "/Users/anujk/cinematch copy"
npx tsx scripts/populate-imdb-top250-complete.ts
```

Takes ~5-10 minutes. You'll see progress in the terminal.

## Step 5: Verify

1. Go to: https://supabase.com/dashboard/project/xzlgttxargsptzeghppo/editor
2. Click `imdb_top250_movies` table
3. Should see ~250 rows! ✅

## Done!

Now when you enable "IMDb Top 250 Movies" filter in your app, it will load all 250 movies instantly from Supabase!












