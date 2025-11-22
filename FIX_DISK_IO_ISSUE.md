# Fix Disk IO Budget Depletion Issue

## The Real Problem

Your Supabase project is **depleting its Disk IO Budget**. This is why:
- ✅ Database was working fine until 9:12 AM
- ❌ Queries started timing out at 9:12 AM
- ❌ Database became unresponsive
- ❌ Services showing as "Unhealthy"

**Disk IO** = How much your database reads/writes to disk. When you hit the limit:
- Queries become **extremely slow** (IO wait)
- Database becomes **unresponsive**
- CPU usage spikes due to IO wait
- Everything times out

## Why This Happened

Free tier (NANO plan) has **very limited Disk IO budget**. Common causes:
1. **Missing indexes** - Queries scan entire tables (high IO)
2. **Large tables** - More data = more IO needed
3. **Inefficient queries** - Full table scans instead of indexed lookups
4. **Too many queries** - Each query uses IO budget
5. **Old data accumulating** - Unused sessions/matches taking up space

## Solutions (In Order of Priority)

### Solution 1: Add/Verify Indexes (FREE - Do This First!)

**This is the #1 fix** - Indexes reduce IO by 99% for lookups.

1. Once database is responsive, go to **SQL Editor**
2. Run this to check if indexes exist:

```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public' 
    AND tablename IN ('sessions', 'movie_likes', 'mutual_matches')
ORDER BY tablename;
```

**Expected indexes:**
- `sessions`: `idx_sessions_code`, `idx_sessions_expires_at`
- `movie_likes`: `idx_movie_likes_session_id`, `idx_movie_likes_user_id`, `idx_movie_likes_movie_id`, `idx_unique_user_movie_like`
- `mutual_matches`: `idx_mutual_matches_session_id`, `idx_mutual_matches_movie_id`, `idx_unique_session_movie_match`

3. **If indexes are missing**, run `supabase-schema.sql` to create them

### Solution 2: Clean Up Old Data (FREE)

Old sessions and likes accumulate and use IO. Clean them up:

```sql
-- Delete expired sessions (older than 1 day)
DELETE FROM sessions 
WHERE expires_at < NOW() - INTERVAL '1 day';

-- Delete old movie likes (for expired sessions)
DELETE FROM movie_likes
WHERE session_id NOT IN (SELECT id FROM sessions);

-- Delete old mutual matches (for expired sessions)
DELETE FROM mutual_matches
WHERE session_id NOT IN (SELECT id FROM sessions);
```

**Run this weekly** to keep data clean.

### Solution 3: Optimize Queries (FREE)

Make sure your queries use indexes:

```sql
-- Good: Uses index on code
SELECT * FROM sessions WHERE code = '123456';

-- Bad: Full table scan (uses too much IO)
SELECT * FROM sessions; -- Don't do this

-- Good: Uses index on session_id
SELECT * FROM movie_likes WHERE session_id = '...';

-- Bad: Full table scan
SELECT * FROM movie_likes; -- Don't do this
```

### Solution 4: Reduce Query Frequency (FREE)

Your app might be making too many queries. Check:
- Are you polling too frequently?
- Are you making unnecessary queries?
- Can you cache results?

The app already has timeouts and fallbacks, but check if you're making redundant queries.

### Solution 5: Upgrade Compute Add-on (PAID)

If the above doesn't work, you can upgrade:
1. Go to **Settings** → **Billing** or **Add-ons**
2. Look for **Compute Add-on** options
3. Upgrade to a higher tier (more IO budget)
4. **Costs money** - only do this if free solutions don't work

## Immediate Actions

### Step 1: Wait for IO Budget to Reset

Disk IO budgets typically reset:
- **Daily** (midnight UTC)
- Or **hourly** (depending on plan)

**Check your consumption:**
- Daily: Link from email
- Hourly: Link from email

Wait a few hours or until tomorrow, then try again.

### Step 2: Once Database is Responsive

1. **Verify indexes exist** (Solution 1)
2. **Clean up old data** (Solution 2)
3. **Test queries** - should be much faster
4. **Monitor IO usage** - should be much lower

### Step 3: Prevent Future Issues

1. **Set up automatic cleanup** - Delete old sessions daily
2. **Monitor IO usage** - Check dashboard regularly
3. **Optimize queries** - Always use indexed columns
4. **Consider upgrade** - If you need more capacity

## Why Indexes Are Critical

**Without indexes:**
- Query: `SELECT * FROM movie_likes WHERE session_id = '...'`
- Database scans **entire table** (high IO)
- Slow, uses lots of IO budget

**With indexes:**
- Same query uses **index lookup** (low IO)
- Fast, uses minimal IO budget
- 100-1000x faster!

## Monitoring

After fixing, monitor:
1. **Disk IO usage** - Should be much lower
2. **Query performance** - Should be fast
3. **Database responsiveness** - Should be stable

## Quick Checklist

- [ ] Wait for IO budget to reset (hours or next day)
- [ ] Verify indexes exist once database is responsive
- [ ] Create indexes if missing (run schema)
- [ ] Clean up old data
- [ ] Test queries - should be fast
- [ ] Monitor IO usage going forward
- [ ] Consider upgrade if needed

## Prevention

1. **Always use indexes** - Critical for performance
2. **Clean up old data** - Run cleanup queries regularly
3. **Optimize queries** - Use indexed columns
4. **Monitor usage** - Check IO consumption regularly
5. **Upgrade if needed** - When you outgrow free tier






