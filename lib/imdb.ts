import type { Movie } from './store';
import { convertTMDBMovie } from './tmdb';
import { supabase } from './supabase';

// Helper to convert timestamp to ISO string
function timestampToISO(timestamp: any): string {
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  return new Date().toISOString();
}

// Fetch IMDb Top 250 Movies with full TMDB data
// Uses Supabase (fast, pre-mapped), falls back gracefully if data not available
export async function fetchIMDBTop250Movies(): Promise<Movie[]> {
  try {
    console.log('🎬 ========== Starting IMDb Top 250 Movies fetch ==========');
    
    // Query Supabase for IMDb Top 250 movies
    console.log('🔍 Querying Supabase for imdb_top250_movies table...');
    
    const queryStartTime = Date.now();
    const { data: supabaseMovies, error } = await supabase
      .from('imdb_top250_movies')
      .select('*')
      .order('rank', { ascending: true })
      .limit(250);
    
    const queryDuration = Date.now() - queryStartTime;
    console.log(`🔍 Supabase query completed in ${queryDuration}ms`);
    
    if (error) {
      console.error('❌ Supabase query error:', error);
      console.warn('💡 To fix: Ensure imdb_top250_movies table exists in Supabase');
      return [];
    }
    
    console.log('🔍 ========== Supabase Query Result ==========');
    console.log('🔍 Query size:', supabaseMovies?.length || 0);
    console.log('🔍 Has data:', (supabaseMovies?.length || 0) > 0);
    console.log('🔍 ===========================================');
    
    if (!supabaseMovies || supabaseMovies.length === 0) {
      console.warn('⚠️ Supabase returned empty table - table exists but has no data');
      console.warn('💡 To fix: Run the populate script to populate the table');
      return [];
    }
    
    // Convert Supabase rows to array
    const dbMovies = supabaseMovies.map((row: any) => {
      return {
        id: row.id?.toString() || row.tmdb_id?.toString() || '',
        imdb_id: row.imdb_id || '',
        rank: row.rank || 999,
        tmdb_id: row.tmdb_id || null,
        tmdb_data: row.tmdb_data || null,
        title: row.title || '',
        year: row.year || null,
        updated_at: timestampToISO(row.updated_at),
        created_at: timestampToISO(row.created_at),
      };
    });
    
    console.log(`✅ Found ${dbMovies.length} movies in Supabase`);
    
    // Log first movie if available for debugging
    if (dbMovies.length > 0) {
      console.log('🔍 First movie sample:', {
        id: dbMovies[0].id,
        imdb_id: dbMovies[0].imdb_id,
        rank: dbMovies[0].rank,
        has_tmdb_data: !!dbMovies[0].tmdb_data,
        tmdb_data_type: typeof dbMovies[0].tmdb_data,
        tmdb_data_keys: dbMovies[0].tmdb_data ? Object.keys(dbMovies[0].tmdb_data) : []
      });
    }
    
    // Check how many have tmdb_data
    const withTmdbData = dbMovies.filter((item: any) => item.tmdb_data && typeof item.tmdb_data === 'object');
    console.log(`📊 Movies with tmdb_data: ${withTmdbData.length} out of ${dbMovies.length}`);
    
    if (withTmdbData.length === 0) {
      console.warn('⚠️ No movies have tmdb_data - table exists but data is incomplete');
      console.warn('💡 To fix: Run the populate script to fetch and store TMDB data');
      return [];
    }
    
    // Convert TMDB data to Movie format
    let conversionErrors = 0;
    const allMovies: Movie[] = dbMovies
      .filter((item: any) => item.tmdb_data && typeof item.tmdb_data === 'object')
      .map((item: any) => {
        try {
          // Validate that tmdb_data has required fields
          if (!item.tmdb_data || typeof item.tmdb_data !== 'object' || !item.tmdb_data.id) {
            console.warn('Invalid tmdb_data structure:', item.tmdb_data);
            conversionErrors++;
            return null;
          }
          const movie = convertTMDBMovie(item.tmdb_data);
          // Validate the converted movie has required fields
          if (!movie || !movie.id || !movie.title) {
            console.warn('Converted movie missing required fields:', movie);
            conversionErrors++;
            return null;
          }
          return movie;
        } catch (e) {
          console.error('Failed to convert TMDB movie:', e, item.tmdb_data);
          conversionErrors++;
          return null;
        }
      })
      .filter((m): m is Movie => m !== null);
    
    if (conversionErrors > 0) {
      console.warn(`⚠️ ${conversionErrors} movies failed to convert`);
    }
    
    // Deduplicate by movie ID (in case of duplicates in database)
    const seenIds = new Set<string>();
    const uniqueMovies: Movie[] = [];
    const duplicates: string[] = [];
    
    for (const movie of allMovies) {
      if (seenIds.has(movie.id)) {
        duplicates.push(`${movie.title} (ID: ${movie.id})`);
        continue;
      }
      seenIds.add(movie.id);
      uniqueMovies.push(movie);
    }
    
    if (duplicates.length > 0) {
      console.warn(`⚠️ Found ${duplicates.length} duplicate movies, removing them:`, duplicates.slice(0, 5));
    }
    
    // Sort by rank (preserve IMDb ranking)
    const rankMap = new Map(dbMovies.map((item: any) => [item.tmdb_id, item.rank]));
    uniqueMovies.sort((a, b) => {
      const rankA = rankMap.get(parseInt(a.id)) || 999;
      const rankB = rankMap.get(parseInt(b.id)) || 999;
      return rankA - rankB;
    });
    
    console.log(`🎉 Returning ${uniqueMovies.length} unique IMDb Top 250 movies from Supabase`);
    return uniqueMovies;
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
