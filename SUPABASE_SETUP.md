# Cinematch - Real-time Movie Matching App

This app now uses Supabase for real-time synchronization between devices, enabling proper mutual match detection in dual mode.

## Database Setup

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (`nvsobyilytwdkrvbembu`)
3. Navigate to **SQL Editor**
4. Copy the contents of `supabase-schema.sql`
5. Paste and execute the SQL commands

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Initialize Supabase in your project
supabase init

# Link to your remote project
supabase link --project-ref nvsobyilytwdkrvbembu

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

The app uses the following Supabase configuration:
- **URL**: `https://nvsobyilytwdkrvbembu.supabase.co`
- **Anon Key**: Already configured in `lib/supabase.ts`

## Testing Real-time Features

1. Open the app in two different browser windows/tabs
2. Create a session in one window
3. Join the session in the other window using the 6-digit code
4. Mark both users as ready
5. Start swiping and watch for real-time mutual match updates

The mutual matches will appear instantly on both devices when both users like the same movie!
