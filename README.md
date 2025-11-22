# Cinematch 🎬

A modern, real-time movie matching app that helps you discover movies you'll love. Swipe through personalized movie recommendations, either solo or with a friend in dual mode, and find your next watch in minutes.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Edge Cases & Error Handling](#edge-cases--error-handling)
- [Deployment](#deployment)
- [Tech Stack](#tech-stack)

## Overview

Cinematch is a Tinder-style movie discovery app that makes finding your next watch fun and easy. You can:

- **Browse Solo**: Get personalized movie recommendations based on your preferences
- **Match with Friends**: Use dual mode to find movies you both want to watch
- **Real-time Sync**: See mutual matches instantly as you swipe together
- **Smart Filtering**: Filter by genres, streaming platforms, languages, ratings, and more

## Features

### 1. Solo Mode
- Set your movie preferences (genres, platforms, languages)
- Swipe through personalized recommendations
- Build your personal shortlist
- 3-minute swiping session timer

### 2. Dual Mode
- Create or join a session with a 6-digit code
- Both users set preferences (app combines them)
- Swipe through the same movie sequence together
- Real-time mutual match detection
- See movies you both liked instantly

### 3. Smart Movie Filtering
- **Genres**: Action, Comedy, Drama, Horror, Romance, Sci-Fi, Thriller, and more
- **Streaming Platforms**: Netflix, Prime Video, Disney+, Hulu, HBO Max, Apple TV+, and more
- **Languages**: English, Hindi, Tamil, Telugu, Malayalam, Bengali
- **Quality Filters**: High-rated only (8+), IMDb Top 250
- **Year Range**: Recent (2025), 2000s, or older
- **Content Rating**: Optional adult content filter

### 4. Real-time Synchronization
- Instant like synchronization between devices
- Automatic mutual match detection
- Live session status updates
- Smart nudges when you find 3+ mutual matches

### 5. User Experience
- Beautiful, minimalist landing page with animations
- Smooth swipe gestures (left to skip, right to like)
- Expandable movie descriptions
- Responsive design for all devices
- Loading states and error handling

## How It Works

### Solo Mode Flow

1. **Landing Page**: User clicks "Start" and selects Solo Mode
2. **Set Preferences**: Choose genres, platforms, languages, and filters
3. **Loading**: App fetches movies matching preferences from TMDB API
4. **Swipe Session**: 
   - 3-minute timer starts
   - Swipe right (❤️) to like, left (✕) to skip
   - Session ends when timer expires or deck is exhausted
5. **Shortlist**: View all your liked movies with streaming links

### Dual Mode Flow

1. **Create Session**: User A selects Dual Mode and creates a session
2. **Get Code**: User A receives a 6-digit session code
3. **Join Session**: User B enters the code to join
4. **Set Preferences**: Both users set their preferences independently
5. **Ready Check**: Both users mark themselves ready
6. **Countdown**: 3-2-1 countdown when both are ready
7. **Swipe Together**: 
   - Both users see the same movie sequence
   - Swipe decisions are synced in real-time via Supabase
   - Mutual matches are detected automatically
8. **Nudge System**: If you find 3+ mutual matches, you get a nudge to view shortlist
9. **Shortlist**: View mutual matches only (or all likes in solo mode)

### Movie Loading Strategy

The app uses a smart loading strategy:

1. **Instant Local Deck**: Shows cached movies immediately (if available)
2. **Progressive Loading**: Loads more movies in the background
3. **Streaming**: For language-only searches, streams all pages
4. **Deduplication**: Prevents showing the same movie twice
5. **IMDb Top 250**: If enabled, loads instantly from Supabase

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- TMDB API key (free at [themoviedb.org](https://www.themoviedb.org/settings/api))
- Supabase account (for dual mode features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cinematch
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase** (for dual mode)
   
   See `SUPABASE_SETUP.md` for detailed instructions. You need to:
   - Create tables for sessions, movie_likes, and mutual_matches
   - Enable real-time subscriptions
   - Set up database triggers for mutual match detection

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### Setup Documentation

For detailed setup instructions, see:
- `TMDB_SETUP.md` - TMDB API configuration
- `SUPABASE_SETUP.md` - Supabase database setup
- `QUICK_SETUP.md` - Quick setup guide
- `IMDB_UPDATE_README.md` - IMDb Top 250 setup

## Architecture

### Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **Real-time**: Supabase Realtime
- **Movie Data**: TMDB API, Supabase (for IMDb Top 250)
- **Deployment**: Vercel

### Key Components

1. **HomeScreen**: Landing page with hero section and "How it works"
2. **ModeSelectionScreen**: Choose between Solo and Dual mode
3. **PreferencesScreen**: Set movie preferences and filters
4. **SessionScreen**: Create or join dual mode sessions
5. **ReadyScreen**: Ready check and countdown for dual mode
6. **LoadingScreen**: Movie loading with progress indicator
7. **SwipeDeck**: Main swiping interface with movie cards
8. **ShortlistScreen**: View liked movies and mutual matches

### State Management

The app uses Zustand for centralized state management:

- **Preferences**: User's movie preferences
- **Session**: Current session state (single/dual mode)
- **Movies**: Movie deck and current index
- **Liked Movies**: User's liked movies
- **Timer**: Session start/end times

### Real-time Architecture (Dual Mode)

1. **Session Creation**: Creates session in Supabase with unique code
2. **Session Joining**: Partner joins using 6-digit code
3. **Realtime Subscriptions**: 
   - Session changes (ready states)
   - Movie likes (both users)
   - Mutual matches (automatic detection)
4. **Database Triggers**: Automatically detect when both users like the same movie
5. **State Sync**: Updates local state when real-time events occur

## Edge Cases & Error Handling

### 1. Network Failures

**Problem**: What happens if the internet connection is lost?

**Solution**: 
- App gracefully falls back to cached data
- Shows error messages with retry options
- Dual mode continues with last known state
- On reconnect, syncs with Supabase

**Where it happens**: Movie loading, session creation, like synchronization

### 2. Session Expiration

**Problem**: What if a session expires while users are swiping?

**Solution**:
- Sessions expire after 1 hour
- App checks expiration before critical operations
- Shows clear error message if session expired
- Users can create a new session

**Where it happens**: When joining sessions, during swipe sync

### 3. Duplicate Likes

**Problem**: What if a user tries to like the same movie twice?

**Solution**:
- Frontend prevents duplicate likes (button disabled)
- Database has unique constraints to prevent duplicates
- Real-time sync handles race conditions gracefully

**Where it happens**: When swiping right on already-liked movies

### 4. No Movies Found

**Problem**: What if filters are too strict and no movies match?

**Solution**:
- App shows "No movies found" message
- Suggests relaxing filters
- Falls back to popular movies if instant deck is empty
- For language-only searches, still loads all available movies

**Where it happens**: When preferences are too restrictive

### 5. Timer Expiration

**Problem**: What happens when the 3-minute timer runs out?

**Solution**:
- Automatically redirects to shortlist screen
- All liked movies are saved
- Can continue browsing or start over
- Timer is checked after each swipe

**Where it happens**: During swipe session

### 6. Deck Exhaustion

**Problem**: What if user swipes through all available movies?

**Solution**:
- Automatically redirects to shortlist
- Shows "No more movies" message
- Can start over with new preferences
- In dual mode, both users see the same end state

**Where it happens**: When currentMovieIndex >= movies.length

### 7. Supabase Connection Failures

**Problem**: What if Supabase is unavailable?

**Solution**:
- App falls back to local-only mode
- Dual mode features disabled gracefully
- Shows clear message about limited functionality
- Solo mode continues to work normally

**Where it happens**: Session creation, joining, like sync

### 8. Partner Disconnects

**Problem**: What if partner leaves the session in dual mode?

**Solution**:
- Real-time updates stop coming from partner
- User can continue swiping solo
- Mutual matches from before disconnect are preserved
- Can create a new session anytime

**Where it happens**: During dual mode swipe session

### 9. Invalid Session Codes

**Problem**: What if user enters wrong session code?

**Solution**:
- App validates code format (6 digits)
- Shows clear error message if code doesn't exist
- Prevents joining expired sessions
- Allows retry with correct code

**Where it happens**: When joining dual mode sessions

### 10. Movie Loading Timeouts

**Problem**: What if movies take too long to load?

**Solution**:
- Shows loading progress indicator
- Times out after reasonable duration
- Falls back to cached movies if available
- Shows error with retry option

**Where it happens**: During initial movie loading

### 11. Race Conditions in Dual Mode

**Problem**: What if both users like the same movie at the exact same time?

**Solution**:
- Database handles concurrent inserts gracefully
- Unique constraints prevent duplicate mutual matches
- Real-time updates sync both users correctly
- Database triggers ensure mutual match is created once

**Where it happens**: When both users swipe right simultaneously

### 12. Description Expansion Conflicts

**Problem**: What if user tries to expand description while swiping?

**Solution**:
- Tap on description area is isolated from swipe gestures
- Swipe handlers check if interaction started on description
- Prevents accidental swipes when reading
- "Read more" button has dedicated touch handlers

**Where it happens**: In SwipeDeck when interacting with movie descriptions

### 13. State Synchronization Issues

**Problem**: What if local state gets out of sync with Supabase?

**Solution**:
- Periodic state refresh in dual mode
- Real-time subscriptions keep state in sync
- Manual refresh button available
- State resets on session creation/join

**Where it happens**: During long dual mode sessions

### 14. Browser Refresh During Session

**Problem**: What if user refreshes the page during a session?

**Solution**:
- Session data is stored in Zustand (lost on refresh)
- Supabase session persists, but local state resets
- User needs to rejoin session or start over
- Liked movies are preserved in Supabase

**Where it happens**: Any time during app usage

### 15. Multiple Devices Same Session

**Problem**: What if same user joins session from multiple devices?

**Solution**:
- Each device gets unique user ID
- Both devices can swipe independently
- Likes from both devices count
- Mutual matches work correctly

**Where it happens**: When user joins from phone and tablet

## Deployment

### Vercel Deployment

1. **Connect Repository**
   - Push code to GitHub/GitLab
   - Import project in Vercel dashboard

2. **Set Environment Variables**
   - Add `NEXT_PUBLIC_TMDB_API_KEY`
   - Add `NEXT_PUBLIC_SUPABASE_URL`
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Production Checklist

- [ ] Environment variables configured
- [ ] Supabase tables created and triggers enabled
- [ ] TMDB API key is valid
- [ ] Real-time subscriptions working
- [ ] Error boundaries in place
- [ ] Performance optimized
- [ ] Mobile responsive tested

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI**: React 19
- **Styling**: Tailwind CSS 4
- **State**: Zustand
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime
- **API**: TMDB API
- **Deployment**: Vercel
- **Caching**: IndexedDB (via idb library)

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## License

Private project - All rights reserved

---

Made with ❤️ for movie lovers everywhere
