# Environment Variables Setup

## Supabase Configuration

The app now uses **two separate Supabase projects**:

### Supabase 1 (supa1) - Partner Mode
- **Project**: `nvsobyilytwdkrvbembu`
- **Purpose**: Sessions, movie_likes, mutual_matches
- **Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_PARTNER_URL` (defaults to `https://nvsobyilytwdkrvbembu.supabase.co`)
  - `NEXT_PUBLIC_SUPABASE_PARTNER_ANON_KEY` (defaults to hardcoded key)

### Supabase 2 (supa2) - IMDb Data
- **Project**: `xzlgttxargsptzeghppo`
- **Purpose**: IMDb Top 250 movies
- **Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_IMDB_URL` (defaults to `https://xzlgttxargsptzeghppo.supabase.co`)
  - `NEXT_PUBLIC_SUPABASE_IMDB_ANON_KEY` (required for IMDb functionality)

## Recommended `.env.local` Setup

Create a `.env.local` file in the project root:

```env
# Supabase 1 (Partner Mode) - Optional (has defaults)
NEXT_PUBLIC_SUPABASE_PARTNER_URL=https://nvsobyilytwdkrvbembu.supabase.co
NEXT_PUBLIC_SUPABASE_PARTNER_ANON_KEY=your_supa1_anon_key

# Supabase 2 (IMDb) - Required for IMDb Top 250
NEXT_PUBLIC_SUPABASE_IMDB_URL=https://xzlgttxargsptzeghppo.supabase.co
NEXT_PUBLIC_SUPABASE_IMDB_ANON_KEY=your_supa2_anon_key
```

## Backward Compatibility

If you have existing environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` → Will be used for supa2 (IMDb) if `NEXT_PUBLIC_SUPABASE_IMDB_URL` is not set
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Will be used for supa2 (IMDb) if `NEXT_PUBLIC_SUPABASE_IMDB_ANON_KEY` is not set

**Important**: The legacy `NEXT_PUBLIC_SUPABASE_URL` will NOT affect supa1 (partner mode) anymore. Supa1 always uses `nvsobyilytwdkrvbembu` unless you explicitly set `NEXT_PUBLIC_SUPABASE_PARTNER_URL`.

## Getting Your Anon Keys

### Supabase 1 (Partner Mode):
1. Go to: https://supabase.com/dashboard/project/nvsobyilytwdkrvbembu/settings/api
2. Copy the `anon/public` key

### Supabase 2 (IMDb):
1. Go to: https://supabase.com/dashboard/project/xzlgttxargsptzeghppo/settings/api
2. Copy the `anon/public` key

## Verification

After setting up, check the browser console. You should see:

```
🔧 Supabase Configuration:
  supa1: {
    url: 'https://nvsobyilytwdkrvbembu.supabase.co',
    purpose: 'Partner mode (sessions, movie_likes, mutual_matches)'
  },
  supa2: {
    url: 'https://xzlgttxargsptzeghppo.supabase.co',
    purpose: 'IMDb data (imdb_top250_movies)'
  }
```

If both show the same URL, check your environment variables.









