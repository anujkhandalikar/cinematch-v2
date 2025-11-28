# Local vs Production Differences

## Why Local and Production Differ

The differences between your local development environment and production on Vercel are likely due to:

### 1. **Environment Variable Priority System**

Your code uses a priority fallback system for Supabase configuration:

**Priority Order:**
1. `NEXT_PUBLIC_SUPABASE_PARTNER_ANON_KEY` (highest priority) - **Not set**
2. `NEXT_PUBLIC_SUPABASE_IMDB_ANON_KEY` - **Not set**
3. `NEXT_PUBLIC_SUPABASE_ANON_KEY` - ✅ **Set in both local and Vercel**
4. Hardcoded fallback: `https://xzlgttxargsptzeghppo.supabase.co` - Used if no key is found

**Current Status:**
- ✅ Local: Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (falls back to #3)
- ✅ Production: Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (falls back to #3)

Both should work, but the hardcoded URL fallback might cause differences if the keys don't match the expected project.

### 2. **Build-Time vs Runtime**

`NEXT_PUBLIC_*` environment variables are **embedded at build time** in Next.js. This means:

- If Vercel built your app with different env vars, production will behave differently
- You need to **redeploy** after changing environment variables in Vercel
- Cached builds might still use old environment variable values

### 3. **Possible Causes of Differences**

1. **Different Supabase Projects**: Local `.env.local` might point to a different Supabase project than Vercel
2. **Cached Builds**: Vercel might be serving a cached build from before you set the env vars
3. **Development vs Production Code**: Code paths might differ (`process.env.NODE_ENV === 'development'`)
4. **API Endpoint Differences**: Local uses `localhost:3000/api/movies`, production uses your domain

## How to Fix

### Step 1: Verify Environment Variables Match

Check that your local `.env.local` and Vercel have the same values:

**Local (.env.local):**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
NEXT_PUBLIC_TMDB_API_KEY=your_key_here
```

**Vercel:**
```bash
vercel env ls
```

Make sure all three variables are set for **Production**, **Preview**, and **Development** environments.

### Step 2: Ensure Both Use Same Supabase Project

The code defaults to: `https://xzlgttxargsptzeghppo.supabase.co`

Make sure:
- Your `.env.local` has `NEXT_PUBLIC_SUPABASE_URL=https://xzlgttxargsptzeghppo.supabase.co`
- Vercel has the same URL
- The `NEXT_PUBLIC_SUPABASE_ANON_KEY` matches the **anon key** for this project

### Step 3: Force a Fresh Build

After ensuring env vars match, trigger a fresh deployment:

```bash
# Option 1: Redeploy latest with fresh build
vercel --prod --force

# Option 2: Make a small change and push (triggers auto-deploy)
# Or use Vercel dashboard to "Redeploy" the latest deployment
```

### Step 4: Clear Browser Cache

Sometimes differences are just browser caching:
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Or use Incognito/Private mode

## Quick Diagnostic

To see what environment your production app is using, check the browser console. You should see:

```
🔧 Supabase Configuration:
  project: {
    url: '...',
    hasUrl: true,
    hasAnonKey: true,
    ...
  }
```

Compare this between local and production to see if they differ.

## Recommended Fix

Since your code now uses `NEXT_PUBLIC_SUPABASE_PARTNER_ANON_KEY` as the highest priority, you should:

1. **Option A**: Set `NEXT_PUBLIC_SUPABASE_PARTNER_ANON_KEY` in Vercel (recommended)
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_PARTNER_ANON_KEY production
   # Paste your Supabase anon key
   ```

2. **Option B**: Keep using `NEXT_PUBLIC_SUPABASE_ANON_KEY` (works, but lower priority)

If both local and production use the same fallback level (#3), they should behave identically.

## Most Likely Issue

Based on your setup, the most common cause is:
- **Cached build** - Vercel is serving an old build before env vars were set
- **Solution**: Redeploy with `vercel --prod --force` or trigger a new deployment






