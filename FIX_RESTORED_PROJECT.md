# Fix Recently Restored Supabase Project

## Current Situation

Your project shows:
- ✅ **Not paused** - Project is active
- ⚠️ **Services Unhealthy** - Database, PostgREST, Auth, Storage are all "Unhealthy"
- ✅ **Realtime & Edge Functions** - These are healthy
- 📊 **0 Tables** - Dashboard shows no tables (but they might exist, just not visible yet)
- ⏱️ **Recently Restored** - Message says "can take up to 5 minutes to become fully operational"

## What's Happening

When a Supabase project is restored from pause:
1. Services take time to come back online (up to 5 minutes)
2. Database might be accessible but services are still initializing
3. Dashboard might not immediately reflect the actual database state
4. Tables might exist but dashboard hasn't refreshed yet

## Step-by-Step Fix

### Step 1: Wait for Services to Become Healthy (5-10 minutes)

1. **Refresh the dashboard** every 1-2 minutes
2. **Watch the Project Status** dropdown
3. **Wait until** Database and PostgREST show "Healthy" (green checkmark)
4. This usually takes 5-10 minutes after restore

### Step 2: Verify Tables Actually Exist

Once services are healthy, check if tables exist:

1. Go to **SQL Editor**
2. Run this query:

```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('sessions', 'movie_likes', 'mutual_matches');
```

**Results:**
- **If you see 3 rows** → Tables exist! Dashboard just needs to refresh
- **If you see 0 rows** → Tables don't exist, go to Step 3

### Step 3: Create Tables (If They Don't Exist)

If the query returns 0 rows, you need to create the tables:

1. Go to **SQL Editor**
2. Open the file `supabase-schema.sql` from your project
3. Copy the **entire contents**
4. Paste into SQL Editor
5. Click **Run** (or Cmd/Ctrl + Enter)
6. Wait for "Success" message
7. Refresh the dashboard - tables should appear

### Step 4: Verify Tables Are Created

Run this to verify all tables and indexes exist:

```sql
-- Check tables
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('sessions', 'movie_likes', 'mutual_matches');

-- Check indexes (should return multiple rows)
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename IN ('sessions', 'movie_likes', 'mutual_matches')
ORDER BY tablename;
```

**Expected:**
- 3 tables: `sessions`, `movie_likes`, `mutual_matches`
- Multiple indexes for each table (at least 2-3 per table)

### Step 5: Test Connection from Your App

Once services are healthy and tables exist:

1. **Restart your dev server** (if running):
   ```bash
   # Stop with Ctrl+C, then:
   npm run dev
   ```

2. **Try creating a session** in your app
3. **Check browser console** for connection status
4. Should work now!

## Timeline

Based on the "Recently restored" message:
- **Now**: Services are coming back online (Unhealthy)
- **5-10 minutes**: Services should be Healthy
- **After that**: Database fully operational

## If Services Stay Unhealthy

If after 10-15 minutes services are still unhealthy:

1. **Check Supabase Status**: https://status.supabase.com
2. **Try refreshing** the dashboard
3. **Contact Supabase Support** if it persists

## Quick Checklist

- [ ] Wait 5-10 minutes for services to become Healthy
- [ ] Check Project Status dropdown - all should be green
- [ ] Run SQL query to check if tables exist
- [ ] If no tables, run `supabase-schema.sql`
- [ ] Verify tables and indexes were created
- [ ] Restart dev server
- [ ] Test app connection

## Why This Happened

Free tier Supabase projects automatically pause after 7 days of inactivity. When you restored it:
- Services need time to initialize
- Database connection pool needs to rebuild
- Dashboard needs to sync with actual database state

This is normal and temporary - just wait for services to come online!









