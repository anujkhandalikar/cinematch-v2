# Fix Supabase Tables - Quick Setup Guide

## Problem
The Supabase tables (`sessions`, `movie_likes`, `mutual_matches`) don't exist in your Supabase project.

## Solution

### Step 1: Identify Your Supabase Project

The error shows your Supabase URL is: `https://xzlgttxargsptzeghppo.supabase.co`

**Important**: Make sure this matches your actual Supabase project URL.

### Step 2: Create the Tables

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (the one with URL `xzlgttxargsptzeghppo`)
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the **entire contents** of `supabase-schema.sql` from this project
6. Paste it into the SQL Editor
7. Click **Run** (or press Cmd/Ctrl + Enter)

### Step 3: Verify Tables Were Created

After running the SQL, you should see:
- ✅ `sessions` table created
- ✅ `movie_likes` table created
- ✅ `mutual_matches` table created
- ✅ Indexes created
- ✅ RLS policies created
- ✅ Triggers created

### Step 4: Verify in Supabase Dashboard

1. Go to **Table Editor** in Supabase Dashboard
2. You should see three tables:
   - `sessions`
   - `movie_likes`
   - `mutual_matches`

### Step 5: Check Environment Variables

Make sure your `.env.local` file (if you have one) has the correct Supabase URL:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xzlgttxargsptzeghppo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**To find your anon key:**
1. Go to Supabase Dashboard → Your Project
2. Click **Settings** (gear icon) → **API**
3. Copy the **anon/public** key under "Project API keys"

### Step 6: Test Again

After creating the tables, refresh your app. The connection test should now show:
- ✅ sessions table: OK
- ✅ movie_likes table: OK
- ✅ mutual_matches table: OK

## Troubleshooting

### If you get "permission denied" errors:
- Check that Row Level Security (RLS) policies were created
- The SQL schema includes policies that allow anyone to read/write (for this app's use case)

### If tables still don't appear:
- Make sure you're in the correct Supabase project
- Check the SQL Editor for any error messages
- Try refreshing the Supabase Dashboard

### If the URL doesn't match:
- Update `lib/supabase.ts` with your correct Supabase URL
- Or set `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`






