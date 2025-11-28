# Fix Supabase API Key Issue

## Problem
The populate script successfully scraped and mapped 249 movies to TMDB, but failed to upload to Supabase with error: **"Invalid API key"**

## Solution

### Step 1: Get Your Supabase API Key

1. Go to: https://supabase.com/dashboard/project/xzlgttxargsptzeghppo/settings/api
2. Copy the **"anon public"** key (long string starting with `eyJ...`)

### Step 2: Update `.env.local`

Edit your `.env.local` file and replace `your_anon_key_here` with the actual key:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xzlgttxargsptzeghppo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste_your_actual_key_here
NEXT_PUBLIC_TMDB_API_KEY=1e652e44e3d133f83a692081459137a9
```

**Important:** Make sure there are no quotes around the key value!

### Step 3: Run Script Again

After updating the key, run:

```bash
npx tsx scripts/populate-imdb-top250-complete.ts
```

This time it should upload all ~250 movies to Supabase successfully!

## Alternative: Use Service Role Key (More Powerful)

If you want more permissions, you can use the **service_role** key instead:

1. Go to: https://supabase.com/dashboard/project/xzlgttxargsptzeghppo/settings/api
2. Copy the **"service_role"** key (⚠️ Keep this secret!)
3. Add to `.env.local`:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

The script will automatically use the service_role key if available.














