# Verify Supabase 1 (supa1) Setup

## ✅ Tables Confirmed
All required tables exist in supa1 (`nvsobyilytwdkrvbembu`):
- ✅ `sessions` - Contains session data (75+ records visible)
- ✅ `movie_likes` - For storing movie likes
- ✅ `mutual_matches` - For storing mutual matches

## Configuration Check

### Current Setup:
- **Supabase 1 (supa1)**: `nvsobyilytwdkrvbembu`
  - Used for: Partner mode (sessions, movie_likes, mutual_matches)
  - Environment: `NEXT_PUBLIC_SUPABASE_URL` (defaults to supa1)
  - Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (defaults to supa1 key)

- **Supabase 2 (supa2)**: `xzlgttxargsptzeghppo`
  - Used for: IMDb Top 250 movies
  - Environment: `NEXT_PUBLIC_SUPABASE_IMDB_URL` (defaults to supa2)
  - Key: `NEXT_PUBLIC_SUPABASE_IMDB_ANON_KEY` (needs to be set)

## Testing the Connection

1. **Open your app** in the browser
2. **Open browser console** (F12 or Cmd+Option+I)
3. **Navigate to dual mode** (create or join a session)
4. **Look for these console messages**:
   ```
   🔧 Supabase Configuration:
     supa1: { url: 'https://nvsobyilytwdkrvbembu.supabase.co', ... }
     supa2: { url: 'https://xzlgttxargsptzeghppo.supabase.co', ... }
   
   🧪 Testing Supabase connection (supa1 - partner mode)...
   ✅ sessions table: OK
   ✅ movie_likes table: OK
   ✅ mutual_matches table: OK
   ```

## If Tables Test Fails

If you see errors like `PGRST205` (table not found) or `42501` (permission denied):

1. **Check RLS Policies**:
   - Go to: https://supabase.com/dashboard/project/nvsobyilytwdkrvbembu/auth/policies
   - Ensure policies allow SELECT, INSERT, UPDATE for all three tables

2. **Verify Anon Key**:
   - Go to: https://supabase.com/dashboard/project/nvsobyilytwdkrvbembu/settings/api
   - Copy the `anon/public` key
   - Set it in `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Check Table Permissions**:
   - In Table Editor, verify tables show "Unrestricted" or have proper RLS policies
   - The screenshot shows "RLS disabled" which is fine for development

## Next Steps

1. ✅ Tables exist - confirmed
2. ⏳ Test connection in app (should work now)
3. ⏳ Test mutual matches functionality
4. ⏳ Verify real-time subscriptions work

## Environment Variables (Optional)

If you want to override defaults, create `.env.local`:

```env
# Supabase 1 (Partner Mode) - defaults are already set
NEXT_PUBLIC_SUPABASE_URL=https://nvsobyilytwdkrvbembu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supa1_anon_key

# Supabase 2 (IMDb) - required for IMDb Top 250
NEXT_PUBLIC_SUPABASE_IMDB_URL=https://xzlgttxargsptzeghppo.supabase.co
NEXT_PUBLIC_SUPABASE_IMDB_ANON_KEY=your_supa2_anon_key
```







