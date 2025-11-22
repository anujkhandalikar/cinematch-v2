# Diagnosing Database Timeout Issues

## What's Happening

Your Postgres logs show:
- **Statement timeouts** starting at 9:12 AM
- **Lock contention**: "process still waiting for ShareLock"
- Multiple timeout errors in quick succession

This means queries are either:
1. Taking too long to execute (slow queries)
2. Blocked by locks from other queries
3. Deadlocked

## Immediate Steps

### Step 1: Check Active Queries

1. Go to Supabase Dashboard → **SQL Editor**
2. Run this query to see what's currently running:

```sql
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    LEFT(query, 100) AS query_preview,
    state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '1 second'
    AND state != 'idle'
ORDER BY duration DESC;
```

**Look for:**
- Queries running longer than a few seconds
- Queries in "waiting" or "active" state
- Any INSERT/UPDATE queries that might be stuck

### Step 2: Check for Locks

Run this to see if queries are blocked:

```sql
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocking_locks.pid AS blocking_pid,
    LEFT(blocked_activity.query, 100) AS blocked_query,
    LEFT(blocking_activity.query, 100) AS blocking_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

**If you see results:** There are queries blocking each other. Note the PIDs.

### Step 3: Kill Stuck Queries (if needed)

If you find stuck queries, you can terminate them:

```sql
-- Replace <pid> with the actual process ID from Step 1 or 2
SELECT pg_terminate_backend(<pid>);
```

**⚠️ Warning:** Only kill queries you're sure are stuck. Don't kill active user sessions.

### Step 4: Verify Tables and Indexes Exist

Check if tables were created properly:

```sql
-- Should return 3 rows (sessions, movie_likes, mutual_matches)
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('sessions', 'movie_likes', 'mutual_matches');
```

Check if indexes exist (they're critical for performance):

```sql
-- Should return multiple rows for each table
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public' 
    AND tablename IN ('sessions', 'movie_likes', 'mutual_matches');
```

## Common Causes

### 1. Missing Indexes
If indexes don't exist, queries will be slow. The schema file should create them, but verify they exist.

### 2. Long-Running Transaction
Something might have started a transaction at 9:12 and never committed.

### 3. Too Many Concurrent Requests
If your app is making many simultaneous requests, it could overwhelm the database.

### 4. Large Table Scans
Without proper indexes, queries might be scanning entire tables.

## Quick Fixes

### Option A: Restart Database Connection Pool
1. Go to Supabase Dashboard → **Settings** → **Database**
2. Look for connection pooler settings
3. Or wait a few minutes for connections to timeout naturally

### Option B: Verify Schema Was Applied
1. Check if all tables exist (Step 4 above)
2. If tables are missing, run `supabase-schema.sql` again
3. If indexes are missing, the schema file will recreate them

### Option C: Check for Data Issues
If tables have a lot of data but no indexes:
```sql
-- Check row counts
SELECT 
    'sessions' as table_name, COUNT(*) as rows FROM sessions
UNION ALL
SELECT 'movie_likes', COUNT(*) FROM movie_likes
UNION ALL
SELECT 'mutual_matches', COUNT(*) FROM mutual_matches;
```

If any table has thousands of rows without indexes, that could cause timeouts.

## Prevention

1. **Always use indexes** - The schema includes them, make sure they're created
2. **Set query timeouts** - Already done in code (6-8 seconds)
3. **Monitor connections** - Don't create too many simultaneous connections
4. **Clean up old sessions** - Old expired sessions can accumulate

## Next Steps

1. Run the diagnostic queries above
2. Share the results - especially:
   - Are there stuck queries?
   - Do tables exist?
   - Do indexes exist?
   - Are there any blocking locks?

This will help identify the exact cause of the timeouts.







