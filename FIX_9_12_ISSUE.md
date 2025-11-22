# Fix 9:12 AM Database Issue

## What We Know

- ✅ Project restored yesterday and working fine
- ❌ At 9:12 AM today, everything broke
- ❌ Multiple "statement timeout" errors in logs
- ❌ Lock contention errors
- ❌ Services showing as "Unhealthy"

## What Likely Happened at 9:12 AM

Something started at 9:12 that's causing:
1. **Stuck queries** - blocking other operations
2. **Lock contention** - queries waiting for locks
3. **Cascading timeouts** - one stuck query blocking everything

## Immediate Fix: Kill Stuck Queries

### Step 1: Check for Long-Running Queries

Once SQL Editor is accessible, run this:

```sql
SELECT 
    pid,
    now() - query_start AS duration,
    state,
    LEFT(query, 200) AS query_preview,
    application_name
FROM pg_stat_activity
WHERE state != 'idle'
    AND query_start < now() - interval '1 minute'
ORDER BY query_start;
```

**Look for:**
- Queries running longer than a few minutes
- Queries in "active" or "idle in transaction" state
- Queries that started around 9:12 AM

### Step 2: Check for Blocking Locks

```sql
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocking_locks.pid AS blocking_pid,
    blocked_activity.usename AS blocked_user,
    blocking_activity.usename AS blocking_user,
    now() - blocked_activity.query_start AS blocked_duration,
    now() - blocking_activity.query_start AS blocking_duration,
    LEFT(blocked_activity.query, 100) AS blocked_query,
    LEFT(blocking_activity.query, 100) AS blocking_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity 
    ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity 
    ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted
ORDER BY blocked_activity.query_start;
```

### Step 3: Kill Stuck Queries

If you find stuck queries (especially ones that started around 9:12), kill them:

```sql
-- Replace <pid> with the actual PID from Step 1 or 2
SELECT pg_terminate_backend(<pid>);
```

**Kill in this order:**
1. First kill the **blocking** queries (the ones causing locks)
2. Then kill the **blocked** queries (they'll restart automatically)

### Step 4: Kill All Long-Running Queries (Nuclear Option)

If there are many stuck queries, kill all non-essential ones:

```sql
-- Kill all queries running longer than 5 minutes (except your own)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE pid != pg_backend_pid()
    AND state != 'idle'
    AND query_start < now() - interval '5 minutes';
```

⚠️ **Warning**: This will kill all long-running queries. Only do this if you're sure.

## Check What Caused It

### Check Table Sizes

```sql
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS size,
    n_live_tup AS row_count,
    n_dead_tup AS dead_rows
FROM pg_stat_user_tables
WHERE tablename IN ('sessions', 'movie_likes', 'mutual_matches')
ORDER BY pg_total_relation_size('public.' || tablename) DESC;
```

**If tables are large without indexes**, that could cause slow queries.

### Verify Indexes Exist

```sql
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
    AND tablename IN ('sessions', 'movie_likes', 'mutual_matches')
ORDER BY tablename, indexname;
```

**Expected indexes:**
- `sessions`: `idx_sessions_code`, `idx_sessions_expires_at`
- `movie_likes`: `idx_movie_likes_session_id`, `idx_movie_likes_user_id`, `idx_movie_likes_movie_id`, `idx_unique_user_movie_like`
- `mutual_matches`: `idx_mutual_matches_session_id`, `idx_mutual_matches_movie_id`, `idx_unique_session_movie_match`

**If indexes are missing**, that's likely the cause. Re-run `supabase-schema.sql`.

### Check for Stuck Transactions

```sql
SELECT 
    pid,
    now() - xact_start AS transaction_duration,
    state,
    LEFT(query, 100) AS query
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
    AND state != 'idle'
    AND xact_start < now() - interval '1 minute'
ORDER BY xact_start;
```

## Most Likely Causes

### 1. Missing Indexes (Most Likely)
If tables have data but no indexes, queries become slow and can timeout.

**Fix**: Re-run `supabase-schema.sql` to create indexes.

### 2. Stuck Transaction
A transaction started at 9:12 and never committed, holding locks.

**Fix**: Kill the stuck transaction (Step 3 above).

### 3. Large Table Scan
A query is scanning a large table without using indexes.

**Fix**: Create indexes, then kill the stuck query.

### 4. Trigger Loop
The `detect_mutual_matches` trigger might be stuck in a loop.

**Fix**: Check trigger status, kill stuck queries, verify trigger logic.

## Recovery Steps (In Order)

1. **Wait for services to become healthy** (if still unhealthy)
2. **Check for stuck queries** (Step 1)
3. **Kill stuck queries** (Step 3)
4. **Verify indexes exist** (above)
5. **If indexes missing, create them** (run schema)
6. **Test connection** from your app

## Prevention

Once fixed:

1. **Monitor query performance** - Check logs regularly
2. **Ensure indexes exist** - They're critical for performance
3. **Set query timeouts** - Already done in code (6-8 seconds)
4. **Clean up old data** - Old sessions can accumulate

## Quick Test After Fix

Once you've killed stuck queries and verified indexes:

1. Try the simplest query: `SELECT 1;`
2. If that works, try: `SELECT COUNT(*) FROM sessions;`
3. If that works, try creating a session from your app

If all three work, you're good to go!







