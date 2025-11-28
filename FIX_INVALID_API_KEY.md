# Fix "Invalid API key" Error

## Problem

The error "Invalid API key" means your Supabase anon key is either:
- Not set in environment variables
- Empty string
- Wrong key

## Solution: Set Environment Variable

### Step 1: Get Your Anon Key

1. Go to Supabase Dashboard
2. Select your IMDb project: `xzlgttxargsptzeghppo`
3. Go to **Settings** → **API**
4. Copy the **anon/public key** (long JWT token)

### Step 2: Update `.env.local`

Create or update `.env.local` in your project root:

```env
# Use your IMDb project credentials for both Partner Mode and IMDb
NEXT_PUBLIC_SUPABASE_IMDB_URL=https://xzlgttxargsptzeghppo.supabase.co
NEXT_PUBLIC_SUPABASE_IMDB_ANON_KEY=paste_your_anon_key_here
```

**Replace `paste_your_anon_key_here` with the actual anon key from Step 1**

### Step 3: Restart Dev Server

**Important**: You MUST restart the dev server for environment variables to load:

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 4: Verify

1. Open browser console (F12)
2. Look for: `🔧 Supabase Configuration:`
3. Check:
   - `hasAnonKey: true`
   - `anonKeyLength: > 0` (should be ~200+ characters)
   - `usingEnv.imdbKey: true`

## Alternative: Use Legacy Env Vars

If you prefer, you can also use:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xzlgttxargsptzeghppo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste_your_anon_key_here
```

Both work - the code checks for either.

## Why This Happened

The code falls back to empty string `''` if no environment variables are set:
```typescript
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PARTNER_ANON_KEY || 
                        process.env.NEXT_PUBLIC_SUPABASE_IMDB_ANON_KEY || 
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                        '';  // ← Falls back to empty string
```

Empty string = Invalid API key error.

## Quick Checklist

- [ ] Got anon key from Supabase Dashboard
- [ ] Created/updated `.env.local` with correct key
- [ ] Restarted dev server (important!)
- [ ] Checked browser console - `hasAnonKey: true`
- [ ] Tried creating session again

## Still Not Working?

1. **Check `.env.local` exists** in project root (not in a subfolder)
2. **Verify key is correct** - should be a long JWT token starting with `eyJ...`
3. **Make sure you restarted** - env vars only load on server start
4. **Check console** - should show `usingEnv.imdbKey: true`

Once you set the env var and restart, it should work! 🎉









