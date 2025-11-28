# Fix Supabase Partner Mode Setup

## Problem
- Your `cinematch_tmdb` project shows **0 tables**
- The code is trying to connect but tables don't exist
- This causes timeouts when creating sessions

## Quick Fix (3 Steps)

### Step 1: Get Your Project Credentials

1. In Supabase dashboard, go to your `cinematch_tmdb` project
2. Click **Settings** (gear icon) → **API**
3. Copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (long JWT token)

### Step 2: Create the Tables

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire contents of `supabase-schema.sql`
4. Click **Run** (or press Cmd/Ctrl + Enter)
5. Verify success - you should see "Success. No rows returned"
6. Go to **Table Editor** - you should now see 3 tables:
   - `sessions`
   - `movie_likes`
   - `mutual_matches`

### Step 3: Update Environment Variables

Create/update `.env.local` in your project root:

```env
# Partner Mode Supabase (cinematch_tmdb)
NEXT_PUBLIC_SUPABASE_PARTNER_URL=https://YOUR_PROJECT_URL_HERE.supabase.co
NEXT_PUBLIC_SUPABASE_PARTNER_ANON_KEY=your_anon_key_here

# IMDb Supabase (already working - keep this)
NEXT_PUBLIC_SUPABASE_IMDB_URL=https://xzlgttxargsptzeghppo.supabase.co
NEXT_PUBLIC_SUPABASE_IMDB_ANON_KEY=your_imdb_key_here
```

**Replace:**
- `YOUR_PROJECT_URL_HERE` with your actual project URL from Step 1
- `your_anon_key_here` with your actual anon key from Step 1

### Step 4: Restart Your Dev Server

```bash
# Stop your current server (Ctrl+C)
# Then restart:
npm run dev
```

## Verify It's Working

1. Open your app in the browser
2. Open browser console (F12)
3. Look for: `🔧 Supabase Configuration:`
4. Check that `supa1.url` matches your `cinematch_tmdb` project URL
5. Try creating a session - it should work now!

## Troubleshooting

### If tables still show 0:
- Make sure you ran the SQL in the correct project (`cinematch_tmdb`)
- Check SQL Editor for any error messages
- Try refreshing the Supabase dashboard

### If connection still times out:
- Verify the URL and anon key in `.env.local` are correct
- Make sure you restarted the dev server after updating `.env.local`
- Check browser console for the actual URL being used

### If you get permission errors:
- The SQL schema includes RLS policies that allow all operations
- If you see permission errors, the policies might not have been created
- Re-run the SQL schema, especially the policy creation section









