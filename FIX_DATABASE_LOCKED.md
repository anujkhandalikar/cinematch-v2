# Fix Database Locked/Unresponsive

## Problem
- SQL Editor is accessible (connection works)
- But ALL queries timeout (even simple ones)
- Database appears completely locked/unresponsive

This means the database is in a **deadlock** or **all connections are blocked**.

## Solutions (Try in Order)

### Solution 1: Restart Database via Dashboard

1. Go to **Settings** → **Database**
2. Look for:
   - **"Restart Database"** button
   - **"Reset Database"** option
   - **"Pause/Resume"** toggle
3. If you see any of these:
   - Try **"Restart Database"** first (less destructive)
   - Wait 2-3 minutes for it to restart
   - Try a simple query: `SELECT 1;`

### Solution 2: Pause and Resume Project

This forces a complete restart:

1. Go to **Settings** → **General**
2. Look for **"Pause Project"** or **"Restore Project"** button
3. If project is active:
   - Click **"Pause Project"**
   - Wait 30 seconds
   - Click **"Restore Project"** (or "Resume")
   - Wait 5-10 minutes for full restart
   - Try query again

⚠️ **Warning**: This will disconnect all active connections and may take 5-10 minutes.

### Solution 3: Check Connection Pooler Settings

1. Go to **Settings** → **Database**
2. Look for **Connection Pooler** section
3. Check:
   - **Pool mode**: Should be "Transaction" or "Session"
   - **Connection limit**: Note the current limit
   - **Active connections**: If this is at the limit, that's the problem
4. If connections are maxed out:
   - Try changing pool mode
   - Or wait for connections to timeout naturally (can take 5-10 minutes)

### Solution 4: Use Supabase API to Kill Connections

If you have API access, you might be able to kill connections programmatically. But this requires:
- Service role key (not anon key)
- API access working (which might also be blocked)

### Solution 5: Wait for Natural Timeout

Database connections typically timeout after:
- **Idle connections**: 5-10 minutes
- **Active queries**: Depends on query timeout (usually 30-60 seconds)

**If you can wait:**
1. Wait 10-15 minutes
2. Don't make any new queries
3. Let existing connections timeout
4. Try query again

### Solution 6: Contact Supabase Support

If nothing works:
1. Go to Supabase Dashboard
2. Look for **Support** or **Help** section
3. Submit a ticket explaining:
   - Project: `cinematch_tmdb`
   - Issue: Database completely unresponsive, all queries timeout
   - Started: 9:12 AM today
   - SQL Editor accessible but queries timeout
   - Request: Database restart or connection reset

## What Likely Happened

At 9:12 AM, something caused:
1. **A deadlock** - Multiple queries waiting for each other
2. **Connection pool exhaustion** - All connections used by stuck queries
3. **Database process stuck** - Core database process is hung

## Prevention (After Fix)

Once database is working again:

1. **Set query timeouts** - Already done in code (6-8 seconds)
2. **Monitor connections** - Don't create too many at once
3. **Add indexes** - Critical for preventing slow queries
4. **Clean up old data** - Prevent tables from growing too large

## Quick Test After Fix

Once database is responsive:

1. **Test 1**: `SELECT 1;` (should return instantly)
2. **Test 2**: `SELECT COUNT(*) FROM sessions;` (should work if tables exist)
3. **Test 3**: Check for stuck queries (the diagnostic query)
4. **Test 4**: Verify indexes exist
5. **Test 5**: Try your app

## Recommended Action

**Try Solution 2 first** (Pause/Resume):
- Most likely to fix a completely locked database
- Forces a clean restart
- Takes 5-10 minutes but usually works

If that doesn't work, try Solution 1 (Restart Database), then Solution 6 (Contact Support).






