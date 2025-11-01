import type { Movie } from './store';
import { convertTMDBMovie } from './tmdb';
import { supabase } from './supabase';

// Fetch IMDb Top 250 Movies with full TMDB data
// First tries Supabase (fast, pre-mapped), falls back to API scraping if needed
export async function fetchIMDBTop250Movies(): Promise<Movie[]> {
  try {
    console.log('🎬 Starting IMDb Top 250 Movies fetch...');
    
    // ONLY use Supabase - no API fallback
    // If Supabase is empty, user needs to run the populate script
    const { data: supabaseMovies, error } = await supabase
      .from('imdb_top250_movies')
      .select('*')
      .order('rank', { ascending: true })
      .limit(250);
    
    if (error) {
      console.error('❌ Supabase query error:', error);
      console.error('💡 Make sure the table "imdb_top250_movies" exists in Supabase.');
      console.error('💡 Run: npx tsx scripts/populate-imdb-top250-complete.ts');
      return [];
    }
    
    if (!supabaseMovies || supabaseMovies.length === 0) {
      console.warn('⚠️ Supabase table is empty!');
      console.warn('💡 Run the populate script: npx tsx scripts/populate-imdb-top250-complete.ts');
      return [];
    }
    
    console.log(`✅ Found ${supabaseMovies.length} movies in Supabase`);
    
    // Convert TMDB data to Movie format
    const movies: Movie[] = supabaseMovies
      .filter((item: any) => item.tmdb_data)
      .map((item: any) => {
        try {
          const movie = convertTMDBMovie(item.tmdb_data);
          return movie;
        } catch (e) {
          console.error('Failed to convert TMDB movie:', e);
          return null;
        }
      })
      .filter((m): m is Movie => m !== null);
    
    // Sort by rank
    const rankMap = new Map(supabaseMovies.map((item: any) => [item.tmdb_id, item.rank]));
    movies.sort((a, b) => {
      const rankA = rankMap.get(parseInt(a.id)) || 999;
      const rankB = rankMap.get(parseInt(b.id)) || 999;
      return rankA - rankB;
    });
    
    console.log(`🎉 Returning ${movies.length} IMDb Top 250 movies from Supabase`);
    return movies;
  } catch (error) {
    console.error('Error fetching IMDb Top 250 Movies:', error);
    return [];
  }
}

// Fetch IMDb Top 250 TV Shows with full TMDB data
// Note: TV shows can't be converted to Movie format yet, so we return empty for now
export async function fetchIMDBTop250TV(): Promise<Movie[]> {
  try {
    console.log('📺 Starting IMDb Top 250 TV Shows fetch...');
    const response = await fetch('/api/imdb/top250/tv');
    console.log('📡 IMDb TV API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ IMDb TV API error response:', errorText);
      throw new Error(`Failed to fetch IMDb Top 250 TV: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('📦 IMDb TV API data received:', { 
      source: data.source, 
      count: data.count 
    });
    
    // TODO: TV shows need separate conversion logic - TMDB TV shows have different structure than movies
    // For now, return empty array gracefully since TV shows can't be converted to Movie format
    console.log('⚠️ TV shows not yet supported - returning empty array');
    return [];
  } catch (error) {
    console.error('Error fetching IMDb Top 250 TV Shows:', error);
    return [];
  }
}
