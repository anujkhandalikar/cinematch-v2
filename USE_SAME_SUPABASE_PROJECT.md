# Use Same Supabase Project for Partner Mode and IMDb

## What We're Doing

Instead of using two separate Supabase projects, we're using the **same working project** (`xzlgttxargsptzeghppo`) for both:
- ✅ Partner Mode (sessions, movie_likes, mutual_matches)
- ✅ IMDb Data (imdb_top250_movies)

## Advantages

1. ✅ **Simpler setup** - One project, one set of credentials
2. ✅ **Already working** - No IO issues, no timeouts
3. ✅ **Easier to manage** - One dashboard to check
4. ✅ **No new project needed** - Use existing working project

## Setup Steps

### Step 1: Add Partner Mode Tables to IMDb Project

1. Go to your IMDb Supabase project: `xzlgttxargsptzeghppo`
2. Go to **SQL Editor**
3. Open `supabase-schema.sql` from your project
4. Copy the **entire contents**
5. Paste into SQL Editor
6. Click **Run** (or Cmd/Ctrl + Enter)
7. Wait for "Success" message
8. Go to **Table Editor** - you should see:
   - `sessions` (new)
   - `movie_likes` (new)
   - `mutual_matches` (new)
   - `imdb_top250_movies` (existing)

### Step 2: Verify Tables Created

Run this query to verify:

```sql
-- Check all tables exist
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('sessions', 'movie_likes', 'mutual_matches', 'imdb_top250_movies')
ORDER BY tablename;
```

Should return 4 rows.

### Step 3: Verify Indexes Created

```sql
-- Check indexes exist (should return 8-10 rows)
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename IN ('sessions', 'movie_likes', 'mutual_matches')
ORDER BY tablename;
```

### Step 4: Update Environment Variables

Update your `.env.local` file:

```env
# Use same Supabase project for both Partner Mode and IMDb
# You only need ONE set of credentials now!

# Option 1: Use IMDb env vars (if you already have these set)
NEXT_PUBLIC_SUPABASE_IMDB_URL=https://xzlgttxargsptzeghppo.supabase.co
NEXT_PUBLIC_SUPABASE_IMDB_ANON_KEY=your_imdb_anon_key_here

# Option 2: Or use legacy env vars (also works)
NEXT_PUBLIC_SUPABASE_URL=https://xzlgttxargsptzeghppo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Option 3: Or use partner env vars (all point to same project now)
NEXT_PUBLIC_SUPABASE_PARTNER_URL=https://xzlgttxargsptzeghppo.supabase.co
NEXT_PUBLIC_SUPABASE_PARTNER_ANON_KEY=your_anon_key_here
```

**You only need ONE of these sets** - they all point to the same project now!

### Step 5: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 6: Test It Works

1. Open your app in browser
2. Open browser console (F12)
3. Look for: `🔧 Supabase Configuration:`
4. Should show same URL for both purposes
5. Try creating a session - should work!
6. Try loading IMDb data - should still work!

## What Changed in Code

The code now:
- Uses the same Supabase client for both Partner Mode and IMDb
- Automatically uses the same project URL/key
- Prioritizes environment variables (partner > imdb > legacy)
- Falls back to IMDb project URL if no env vars set

## Verification

After setup, check browser console:

```
🔧 Supabase Configuration:
  project: {
    url: 'https://xzlgttxargsptzeghppo.supabase.co',
    purpose: 'Partner mode + IMDb data'
  },
  note: 'Using same Supabase project for both Partner Mode and IMDb data'
```

## Benefits

1. ✅ **No new project needed** - Use existing working one
2. ✅ **No IO issues** - Project is already healthy
3. ✅ **Simpler config** - One set of credentials
4. ✅ **Easier debugging** - One dashboard to check
5. ✅ **Cost effective** - One free tier project

## What Happens to Old Project?

The old project (`nvsobyilytwdkrvbembu` or `cinematch_tmdb`) can be:
- **Left as-is** (doesn't affect anything)
- **Deleted** (if you don't need it)
- **Ignored** (code no longer uses it)

## Troubleshooting

### If tables don't appear:
- Refresh dashboard
- Check SQL Editor for errors
- Re-run schema file

### If connection fails:
- Verify URL and anon key in `.env.local`
- Make sure you restarted dev server
- Check browser console for actual URL

### If IMDb data stops working:
- Verify `supabaseImdb` is not null in console
- Check that `imdb_top250_movies` table still exists
- Both should use same client now, so should work

## Summary

1. Add partner mode tables to IMDb project (Step 1)
2. Update `.env.local` (use existing IMDb credentials)
3. Restart dev server
4. Test - both should work!

**Total time: 5 minutes** ⏱️

Much simpler than creating a new project!






