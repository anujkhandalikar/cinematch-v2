# Cinematch - Real-time Movie Matching App

This app now uses Supabase for real-time synchronization between devices, enabling proper mutual match detection in dual mode.

## Database Setup

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (`qvoqnaqyqsnpydmtskoz`)
3. Navigate to **SQL Editor**
4. Copy and execute the following schema files in order:
   - `supabase-schema.sql` (sessions, movie_likes, mutual_matches tables)
   - `supabase-schema-movies.sql` (movie_cards table)
   - `supabase-schema-imdb.sql` (imdb_top250_movies table, optional)
5. Paste and execute the SQL commands

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Initialize Supabase in your project
supabase init

# Link to your remote project
supabase link --project-ref qvoqnaqyqsnpydmtskoz

# Push the schema
supabase db push
```

## Key Features

### Real-time Synchronization
- **Sessions**: Create and join sessions with 6-digit codes
- **Ready States**: Real-time updates when both users are ready
- **Movie Likes**: Instant synchronization of liked movies
- **Mutual Matches**: Automatic detection and real-time updates of mutual likes

### Database Schema

#### Sessions Table
- Stores session information including creator/joiner preferences
- Tracks ready states for both users
- Automatic expiration handling

#### Movie Likes Table
- Stores individual movie likes per user per session
- Prevents duplicate likes with unique constraints
- Triggers automatic mutual match detection

#### Mutual Matches Table
- Automatically populated when both users like the same movie
- Real-time updates via database triggers
- Prevents duplicate matches

#### Movie Cards Table
- Stores 100 pre-fetched movies for each mood preset (LightFun, CriticallyAcclaimed, NewPopular, Bollywood)
- Enables fast loading when users select a mood preset
- Updated via populate script

#### IMDb Top 250 Movies Table (Optional)
- Stores pre-mapped IMDb Top 250 movies with full TMDB data
- Used for CriticallyAcclaimed mood preset
- Updated manually every 3 months

### Real-time Features

1. **Session Creation/Joining**: Instant session creation and joining
2. **Ready State Sync**: Real-time updates when users mark themselves ready
3. **Like Synchronization**: Instant sync of movie likes between devices
4. **Mutual Match Detection**: Automatic detection and real-time updates of mutual likes
5. **Nudge System**: Smart nudges based on individual likes and mutual matches

## How It Works

1. **Create Session**: User creates a session with preferences
2. **Join Session**: Partner joins using 6-digit code
3. **Ready Check**: Both users mark themselves ready
4. **Swipe Together**: Users swipe through the same movie sequence
5. **Real-time Sync**: Likes are instantly synchronized
6. **Mutual Detection**: Database automatically detects mutual likes
7. **Live Updates**: Both users see mutual matches in real-time

## Performance Improvements

- **Faster Loading**: Supabase handles data persistence and caching
- **Real-time Updates**: No more polling or manual refresh needed
- **Scalable**: Database handles multiple concurrent sessions
- **Reliable**: Built-in error handling and retry logic

## Environment Variables

The app uses the following Supabase configuration (with defaults):
- **URL**: `https://qvoqnaqyqsnpydmtskoz.supabase.co` (default, can be overridden)
- **Anon Key**: Configured in `lib/supabase.ts` (default, can be overridden)

### Optional: Override with Environment Variables

Create a `.env.local` file in your project root to override defaults:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://qvoqnaqyqsnpydmtskoz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
```

**To get your Supabase keys:**
1. Go to: https://supabase.com/dashboard/project/qvoqnaqyqsnpydmtskoz/settings/api
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Testing Real-time Features

1. Open the app in two different browser windows/tabs
2. Create a session in one window
3. Join the session in the other window using the 6-digit code
4. Mark both users as ready
5. Start swiping and watch for real-time mutual match updates

The mutual matches will appear instantly on both devices when both users like the same movie!
