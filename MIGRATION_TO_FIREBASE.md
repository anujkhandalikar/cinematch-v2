# Migration from Supabase to Firebase/Firestore

This document describes the migration from Supabase to Firebase/Firestore for the Cinematch application.

## Overview

The application has been migrated from Supabase (PostgreSQL + real-time) to Firebase/Firestore (NoSQL + real-time listeners) to improve reliability and simplify the database setup.

## What Changed

### Database Services
- **Supabase** (PostgreSQL) → **Firebase Firestore** (NoSQL)
- **Supabase Realtime** (Postgres changes) → **Firestore onSnapshot** (real-time listeners)
- **Supabase Channels** (broadcasting) → **Firestore documents** (for signaling)

### Collections Structure

Firestore uses collections instead of tables:

```
sessions/{sessionId}
  - code: string
  - mode: 'single' | 'dual'
  - expires_at: timestamp
  - seed: number
  - creator_id: string
  - joiner_id?: string
  - creator_ready: boolean
  - joiner_ready: boolean
  - creator_preferences: object
  - joiner_preferences?: object
  - movie_deck?: array
  - mutual_matches?: array
  - created_at: timestamp
  - updated_at: timestamp

movie_likes/{likeId}
  - session_id: string
  - user_id: string
  - movie_id: string
  - movie_data: object
  - created_at: timestamp

mutual_matches/{matchId}
  - session_id: string
  - movie_id: string
  - movie_data: object
  - created_at: timestamp

movie_cards/{cardId}
  - card_type: string
  - card_config: object
  - movies: array
  - updated_at: timestamp
  - created_at: timestamp

imdb_top250_movies/{docId}
  - imdb_id: string
  - rank: number
  - tmdb_id: number
  - tmdb_data: object
  - title: string
  - year: number
  - updated_at: timestamp
  - created_at: timestamp
```

## Setup Instructions

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "cinematch")
4. Enable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Firestore Database

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click "Create database"
3. Select "Start in test mode" (for now - we'll set up security rules later)
4. Choose a location (choose closest to your users)
5. Click "Enable"

### 3. Get Firebase Config

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click web icon (</>)
4. Register app (if needed) - give it a nickname
5. Copy the `firebaseConfig` object

### 4. Set Environment Variables

Create or update `.env.local` in your project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 5. Set Up Firestore Security Rules

Go to **Firestore Database** → **Rules** and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Sessions - allow read/write for everyone (for now)
    match /sessions/{sessionId} {
      allow read, write: if true;
    }
    
    // Movie likes - allow read/write for everyone
    match /movie_likes/{likeId} {
      allow read, write: if true;
    }
    
    // Mutual matches - allow read/write for everyone
    match /mutual_matches/{matchId} {
      allow read, write: if true;
    }
    
    // Movie cards - allow read for everyone, write only via admin
    match /movie_cards/{cardId} {
      allow read: if true;
      allow write: if false; // Admin scripts only
    }
    
    // IMDb Top 250 - allow read for everyone, write only via admin
    match /imdb_top250_movies/{docId} {
      allow read: if true;
      allow write: if false; // Admin scripts only
    }
  }
}
```

**Note:** These rules allow public access. For production, you should add authentication and proper security rules.

### 6. Restart Dev Server

After updating `.env.local`, restart your Next.js dev server:

```bash
npm run dev
```

## Code Changes

### Service Layer

- `lib/supabase.ts` → `lib/firebase.ts`
  - Uses Firestore instead of Supabase client
  - Services maintain same interface for compatibility

### Real-time Subscriptions

- Supabase channels → Firestore `onSnapshot()`
- Real-time updates work the same way for components

### Mutual Match Detection

- Previously: Database trigger in PostgreSQL
- Now: Client-side check in `likesService.addLike()`
- Checks for mutual matches after each like is added

## Testing

1. **Test Session Creation:**
   - Create a session in dual mode
   - Verify it appears in Firestore Console

2. **Test Real-time Updates:**
   - Create a session on one device
   - Join on another device
   - Verify ready states sync in real-time

3. **Test Likes & Matches:**
   - Like movies in dual mode
   - Verify mutual matches are detected
   - Check Firestore collections update

## Migration Status

✅ Firebase SDK installed
✅ Firebase client created (`lib/firebase.ts`)
✅ Session service migrated
✅ Likes service migrated
✅ Matches service migrated
✅ Movie cards service migrated
✅ IMDb service migrated
✅ Store updated to use Firebase
✅ Components updated (SessionScreen, ReadyScreen, SwipeDeck)
⚠️ Real-time subscriptions need comprehensive update (channels → Firestore)

## Notes

- Supabase real-time channels are replaced with Firestore onSnapshot
- Broadcasting uses Firestore documents instead of channels
- Mutual match detection is now client-side (was database trigger)
- All interfaces remain compatible for easier migration

## Troubleshooting

### "Firebase configuration is missing"
- Check `.env.local` has all required Firebase env vars
- Restart dev server after updating `.env.local`

### "Permission denied" errors
- Check Firestore security rules
- Verify rules allow read/write for the collections

### Real-time updates not working
- Check Firestore is enabled
- Verify security rules allow read access
- Check browser console for errors



