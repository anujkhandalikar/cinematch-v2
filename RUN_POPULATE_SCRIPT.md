# How to Run the Populate Script

## Your Supabase Project
**Project ID:** `xzlgttxargsptzeghppo`
**Dashboard:** https://supabase.com/dashboard/project/xzlgttxargsptzeghppo

## Step 1: Create the Table (in Supabase)

1. Go to: https://supabase.com/dashboard/project/xzlgttxargsptzeghppo/sql/new
2. Copy entire contents of `supabase-schema-imdb.sql`
3. Paste and click "Run"

## Step 2: Set Environment Variables

The script needs these variables. You can either:

### Option A: Create `.env.local` file (Recommended)

Create a file `.env.local` in your project root with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xzlgttxargsptzeghppo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
# OR
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here (more powerful)
```

**To get your Supabase keys:**
1. Go to: https://supabase.com/dashboard/project/xzlgttxargsptzeghppo/settings/api
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Or **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (better for scripts)

### Option B: Export in Terminal (One-time)

```bash
export NEXT_PUBLIC_SUPABASE_URL=https://xzlgttxargsptzeghppo.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
export NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_key_here
```

## Step 3: Run the Script

In your terminal (same directory as your project):

```bash
cd "/Users/anujk/cinematch copy"
npx tsx scripts/populate-imdb-top250-complete.ts
```

This will take ~5-10 minutes to complete.

## Verify It Worked

After the script completes:
1. Go to: https://supabase.com/dashboard/project/xzlgttxargsptzeghppo/editor
2. Click on `imdb_top250_movies` table
3. You should see ~250 rows!














