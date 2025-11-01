# Vercel Deployment Instructions

## ✅ Deployment Status

Your app is being deployed to Vercel!

**Preview URL:** Check the build output for the preview URL

**Production URL:** Will be available after you set up the production domain

## 🔧 Required Environment Variables

Make sure these are set in Vercel (Production + Preview environments):

1. **Go to:** https://vercel.com/anujs-projects-7e529fb9/cinematch-copy/settings/environment-variables

2. **Add these variables:**

### Required Variables:
```
NEXT_PUBLIC_TMDB_API_KEY=1e652e44e3d133f83a692081459137a9
NEXT_PUBLIC_SUPABASE_URL=https://xzlgttxargsptzeghppo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Optional (if using TMDB Bearer Token):
```
TMDB_BEARER_TOKEN=your_bearer_token_here
```

3. **Set for both environments:**
   - ✅ Production
   - ✅ Preview

## 🚀 Quick Add via CLI

If you prefer CLI, run:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Paste: https://xzlgttxargsptzeghppo.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Paste your anon key

vercel env add NEXT_PUBLIC_SUPABASE_URL preview
# Paste: https://xzlgttxargsptzeghppo.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
# Paste your anon key
```

## 📝 After Adding Variables

After adding the environment variables:

1. **Redeploy** - Go to Vercel dashboard and click "Redeploy" on the latest deployment
   OR
2. **New deployment** - Push a new commit or run `vercel --prod`

## ✅ Verify Deployment

1. Check build logs in Vercel dashboard
2. Visit the preview/production URL
3. Test the IMDb Top 250 filter to ensure Supabase connection works

## 🔗 Useful Links

- **Vercel Dashboard:** https://vercel.com/anujs-projects-7e529fb9/cinematch-copy
- **Project Settings:** https://vercel.com/anujs-projects-7e529fb9/cinematch-copy/settings
- **Environment Variables:** https://vercel.com/anujs-projects-7e529fb9/cinematch-copy/settings/environment-variables

