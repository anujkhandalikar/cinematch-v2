# Quick SQL Setup - Step by Step

## ⚠️ Important: Use the SQL File, Not the TypeScript File!

You need to run `supabase-schema.sql` in the SQL Editor, **NOT** `lib/supabase.ts`

## Step-by-Step Instructions

### Step 1: Open the Correct File

1. In your code editor, open: `supabase-schema.sql`
2. **NOT** `lib/supabase.ts` (that's TypeScript code, not SQL!)

### Step 2: Copy the SQL Content

1. Open `supabase-schema.sql`
2. Select **ALL** the contents (Cmd+A / Ctrl+A)
3. Copy it (Cmd+C / Ctrl+C)

The file should start with:
```sql
-- Enable Row Level Security
ALTER TABLE IF EXISTS sessions ENABLE ROW LEVEL SECURITY;
...
```

**NOT** this (that's TypeScript):
```typescript
import { createClient } from '@supabase/supabase-js';
...
```

### Step 3: Paste in Supabase SQL Editor

1. Go to Supabase Dashboard → Your IMDb project (`xzlgttxargsptzeghppo`)
2. Go to **SQL Editor**
3. Click **New Query** (or use existing query tab)
4. **Paste** the SQL content (Cmd+V / Ctrl+V)
5. Click **Run** (or press Cmd+Enter / Ctrl+Enter)

### Step 4: Verify Success

You should see:
- ✅ "Success. No rows returned" message
- ✅ No errors in the results

### Step 5: Check Tables Created

1. Go to **Table Editor** in Supabase Dashboard
2. You should see 4 tables:
   - `sessions`
   - `movie_likes`
   - `mutual_matches`
   - `imdb_top250_movies` (already existed)

## If You Get Errors

### Error: "syntax error at or near..."
- **Cause**: You pasted TypeScript code instead of SQL
- **Fix**: Use `supabase-schema.sql`, not `lib/supabase.ts`

### Error: "relation already exists"
- **Cause**: Tables already exist
- **Fix**: This is OK! The schema uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times

### Error: "permission denied"
- **Cause**: RLS policies not set correctly
- **Fix**: The schema includes RLS policies, make sure you ran the entire file

## File Locations

- ✅ **SQL File to Use**: `supabase-schema.sql` (in project root)
- ❌ **NOT This**: `lib/supabase.ts` (TypeScript code for your app)

## Quick Checklist

- [ ] Opened `supabase-schema.sql` (NOT `lib/supabase.ts`)
- [ ] Copied ALL contents of the SQL file
- [ ] Pasted into Supabase SQL Editor
- [ ] Clicked Run
- [ ] Saw "Success" message
- [ ] Verified 4 tables in Table Editor

## Still Having Issues?

Make sure you're copying from the file that starts with:
```sql
-- Enable Row Level Security
```

NOT the file that starts with:
```typescript
import { createClient } from '@supabase/supabase-js';
```







