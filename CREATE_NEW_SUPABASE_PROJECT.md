# Create New Supabase Project - Quick Setup Guide

## Why This Works

- ✅ Fresh start - No IO budget issues
- ✅ Clean database - No stuck queries
- ✅ Same free tier - But with full IO budget
- ✅ Quick setup - 10-15 minutes

## Step-by-Step Setup

### Step 1: Create New Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `cinematch_tmdb_v2` (or any name you prefer)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free (if available)
4. Click **"Create new project"**
5. Wait 2-3 minutes for project to be ready

### Step 2: Get Your Project Credentials

1. Once project is ready, go to **Settings** → **API**
2. Copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (long JWT token)
3. Save these - you'll need them!

### Step 3: Create Tables and Indexes

1. Go to **SQL Editor**
2. Open `supabase-schema.sql` from your project
3. Copy the **entire contents**
4. Paste into SQL Editor
5. Click **Run** (or Cmd/Ctrl + Enter)
6. Wait for "Success" message
7. Go to **Table Editor** - you should see 3 tables:
   - `sessions`
   - `movie_likes`
   - `mutual_matches`

### Step 4: Verify Tables and Indexes

Run these queries to verify:

```sql
-- Check tables exist
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('sessions', 'movie_likes', 'mutual_matches');

-- Check indexes exist (should return 8-10 rows)
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename IN ('sessions', 'movie_likes', 'mutual_matches')
ORDER BY tablename;
```

### Step 5: Update Environment Variables

1. Open `.env.local` in your project root
2. Update these variables:

```env
# Partner Mode Supabase (NEW PROJECT)
NEXT_PUBLIC_SUPABASE_PARTNER_URL=https://YOUR_NEW_PROJECT_URL.supabase.co
NEXT_PUBLIC_SUPABASE_PARTNER_ANON_KEY=your_new_anon_key_here

# IMDb Supabase (KEEP THIS - it's working fine)
NEXT_PUBLIC_SUPABASE_IMDB_URL=https://xzlgttxargsptzeghppo.supabase.co
NEXT_PUBLIC_SUPABASE_IMDB_ANON_KEY=your_imdb_key_here
```

**Replace:**
- `YOUR_NEW_PROJECT_URL` with the URL from Step 2
- `your_new_anon_key_here` with the anon key from Step 2

### Step 6: Restart Your Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 7: Test It Works

1. Open your app in browser
2. Open browser console (F12)
3. Look for: `🔧 Supabase Configuration:`
4. Check that `supa1.url` matches your new project URL
5. Try creating a session - should work!

## Advantages of New Project

1. ✅ **Fresh IO budget** - Full quota available
2. ✅ **No stuck queries** - Clean slate
3. ✅ **Proper indexes** - Created from the start
4. ✅ **No old data** - Clean database
5. ✅ **Fast queries** - Optimized from day 1

## What Happens to Old Project?

- Old project (`cinematch_tmdb`) can be:
  - **Deleted** (if you don't need it)
  - **Left as-is** (for reference)
  - **Kept paused** (doesn't cost anything on free tier)

You can have multiple free tier projects, so no issue keeping both.

## Prevention for New Project

To avoid IO issues again:

1. ✅ **Indexes created** - Already done in schema
2. ✅ **Query timeouts** - Already in code (6-8 seconds)
3. ✅ **Clean up old data** - Run cleanup queries weekly
4. ✅ **Monitor usage** - Check dashboard regularly

## Quick Cleanup Query (Run Weekly)

Once you start using the new project, run this weekly to clean up old data:

```sql
-- Delete expired sessions (older than 1 day)
DELETE FROM sessions 
WHERE expires_at < NOW() - INTERVAL '1 day';
```

## Troubleshooting

### If tables don't appear:
- Refresh the dashboard
- Check SQL Editor for error messages
- Re-run the schema file

### If connection still fails:
- Verify URL and anon key in `.env.local`
- Make sure you restarted dev server
- Check browser console for actual URL being used

### If queries are slow:
- Verify indexes exist (Step 4)
- Check IO usage in dashboard
- Make sure you're using indexed columns in queries

## Summary

1. Create new project → Get credentials
2. Run schema SQL → Create tables + indexes
3. Update `.env.local` → Point to new project
4. Restart dev server → Test it works

**Total time: 10-15 minutes** ⏱️

Much faster than troubleshooting the old project!





