# TMDB API Setup Guide

This guide explains how to set up The Movie Database (TMDB) API integration for your Cinematch app.

## 1. Get TMDB API Key

1. Go to [TMDB API](https://www.themoviedb.org/settings/api)
2. Create an account or log in
3. Request an API key (it's free)
4. Copy your API key

## 2. Environment Variables

Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
```

## 3. Features

### What TMDB Provides:
- **Massive Database**: Access to thousands of movies and TV shows
- **Real-time Data**: Always up-to-date movie information
- **Rich Metadata**: Posters, ratings, genres, descriptions
- **Multiple Endpoints**: Popular, trending, search, by genre
- **Free Tier**: Generous rate limits for personal use

### Available Movie Sources:
- **Popular Movies**: Current trending films
- **Genre-based**: Movies filtered by specific genres
- **Search**: Find movies by title
- **Trending**: Daily/weekly trending movies

## 4. API Endpoints Used

### Popular Movies
```
GET /movie/popular
```
Returns currently popular movies with full metadata.

### Genre Discovery
```
GET /discover/movie?with_genres={genre_id}
```
Find movies by specific genres.

### Search
```
GET /search/movie?query={search_term}
```
Search movies by title.

### Trending
```
GET /trending/movie/{time_window}
```
Get trending movies (day/week).

## 5. Data Mapping

The app converts TMDB data to your internal format:

```typescript
// TMDB Response → App Format
{
  id: tmdbMovie.id.toString(),
  title: tmdbMovie.title,
  year: new Date(tmdbMovie.release_date).getFullYear(),
  rating: tmdbMovie.vote_average,
  genres: tmdbMovie.genre_ids.map(id => GENRE_MAP[id]),
  poster_url: `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`,
  synopsis: tmdbMovie.overview
}
```

## 6. Genre Mapping

TMDB genres are mapped to user-friendly names:

| TMDB ID | Genre |
|---------|-------|
| 28 | Action |
| 12 | Adventure |
| 16 | Animation |
| 35 | Comedy |
| 80 | Crime |
| 99 | Documentary |
| 18 | Drama |
| 10751 | Family |
| 14 | Fantasy |
| 36 | History |
| 27 | Horror |
| 10402 | Music |
| 9648 | Mystery |
| 10749 | Romance |
| 878 | Sci-Fi |
| 10770 | TV Movie |
| 53 | Thriller |
| 10752 | War |
| 37 | Western |

## 7. Benefits Over Supabase

### Scale
- **Supabase**: Limited to manually added movies
- **TMDB**: Access to 500,000+ movies and TV shows

### Data Quality
- **Supabase**: Manual data entry prone to errors
- **TMDB**: Professional, curated, and maintained data

### Real-time Updates
- **Supabase**: Static data requiring manual updates
- **TMDB**: Always current with latest releases

### Rich Metadata
- **Supabase**: Basic movie information
- **TMDB**: Posters, backdrops, cast, crew, reviews, ratings

## 8. Rate Limits

TMDB API has generous rate limits:
- **Free Tier**: 1,000 requests per day
- **Paid Tier**: Higher limits available

For most personal projects, the free tier is sufficient.

## 9. Image URLs

TMDB provides images in various sizes:
- **Poster**: `https://image.tmdb.org/t/p/w500{poster_path}`
- **Backdrop**: `https://image.tmdb.org/t/p/w1280{backdrop_path}`
- **Thumbnail**: `https://image.tmdb.org/t/p/w92{poster_path}`

## 10. Testing

1. Start your development server:
```bash
npm run dev
```

2. Navigate through the app:
   - Home → Preferences → Mode Selection
   - Select genres and platforms
   - Start swiping to see TMDB movies

## 11. Troubleshooting

### Common Issues:

1. **No movies loading**: Check your API key in `.env.local`
2. **Rate limit exceeded**: Wait for the daily limit to reset
3. **Images not loading**: Check if poster_path is null
4. **Genres not matching**: Verify genre mapping in `lib/tmdb.ts`

### Debug Queries:

```typescript
// Test API connection
const movies = await fetchPopularMovies();
console.log('Movies loaded:', movies.length);

// Test genre filtering
const actionMovies = await fetchMoviesByGenre(28);
console.log('Action movies:', actionMovies.length);
```

## 12. Production Considerations

1. **API Key Security**: Never expose your API key in client-side code
2. **Caching**: Implement caching to reduce API calls
3. **Error Handling**: Add proper error handling for API failures
4. **Rate Limiting**: Implement client-side rate limiting
5. **Fallbacks**: Provide fallback content when API is unavailable

## 13. Advanced Features

### Search Implementation
```typescript
const searchResults = await searchMovies('inception');
```

### Trending Movies
```typescript
const trending = await fetchTrendingMovies('week');
```

### Genre-specific Discovery
```typescript
const horrorMovies = await fetchMoviesByGenre(27); // Horror
```

This TMDB integration gives you access to a massive, constantly updated database of movies and TV shows, making your Cinematch app much more powerful and engaging!
