import type { Movie } from './store';
import { convertTMDBMovie } from './tmdb';
import { supabaseImdb } from './supabase';

// Log Supabase configuration for debugging
if (typeof window !== 'undefined') {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_IMDB_URL || 'https://xzlgttxargsptzeghppo.supabase.co';
  console.log('🔧 IMDb Supabase Config:', {
    url: supabaseUrl,
    hasEnvVar: !!process.env.NEXT_PUBLIC_SUPABASE_IMDB_URL,
    clientInitialized: !!supabaseImdb,
    purpose: 'IMDb Top 250 movies'
  });
}

// Fetch IMDb Top 250 Movies with full TMDB data
// First tries Supabase (fast, pre-mapped), falls back to API scraping if needed
export async function fetchIMDBTop250Movies(): Promise<Movie[]> {
  try {
    console.log('🎬 ========== Starting IMDb Top 250 Movies fetch ==========');
    
    // Check if Supabase IMDb client is configured
    if (!supabaseImdb) {
      console.error('❌ Supabase IMDb client is NULL/UNDEFINED');
      console.error('   Set NEXT_PUBLIC_SUPABASE_IMDB_URL and NEXT_PUBLIC_SUPABASE_IMDB_ANON_KEY');
      return [];
    }
    console.log('✅ Supabase IMDb client exists:', typeof supabaseImdb);
    
    // ONLY use Supabase - no API fallback
    // If Supabase is empty, user needs to run the populate script
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_IMDB_URL || 'https://xzlgttxargsptzeghppo.supabase.co';
    console.log('🔍 Querying Supabase (supa2) for imdb_top250_movies table...');
    console.log('🔍 Using Supabase project URL:', supabaseUrl);
    console.log('🔍 Environment variable NEXT_PUBLIC_SUPABASE_IMDB_URL set:', !!process.env.NEXT_PUBLIC_SUPABASE_IMDB_URL);
    console.log('🔍 Supabase client type:', typeof supabaseImdb);
    console.log('🔍 Supabase client has "from" method:', typeof supabaseImdb.from === 'function');
    
    console.log('🔍 About to execute Supabase query...');
    const queryStartTime = Date.now();
    const { data: supabaseMovies, error, status, statusText, count } = await supabaseImdb
      .from('imdb_top250_movies')
      .select('*', { count: 'exact' })
      .limit(250)
      .order('rank', { ascending: true });
    const queryDuration = Date.now() - queryStartTime;
    console.log(`🔍 Supabase query completed in ${queryDuration}ms`);
    
    console.log('🔍 ========== Supabase Query Result ==========');
    console.log('🔍 Has data:', !!supabaseMovies);
    console.log('🔍 Data length:', supabaseMovies?.length || 0);
    console.log('🔍 Total count:', count);
    console.log('🔍 Has error:', !!error);
    console.log('🔍 Error type:', error ? typeof error : 'none');
    console.log('🔍 Error keys:', error ? Object.keys(error) : []);
    console.log('🔍 Error code:', error?.code);
    console.log('🔍 Error message:', error?.message);
    console.log('🔍 Error details:', error?.details);
    console.log('🔍 Error hint:', error?.hint);
    console.log('🔍 Full error object:', error);
    console.log('🔍 Status:', status);
    console.log('🔍 Status text:', statusText);
    console.log('🔍 ===========================================');
    
    // Log first movie if available for debugging
    if (supabaseMovies && supabaseMovies.length > 0) {
      console.log('🔍 First movie sample:', {
        id: supabaseMovies[0].id,
        imdb_id: supabaseMovies[0].imdb_id,
        rank: supabaseMovies[0].rank,
        has_tmdb_data: !!supabaseMovies[0].tmdb_data,
        tmdb_data_type: typeof supabaseMovies[0].tmdb_data,
        tmdb_data_keys: supabaseMovies[0].tmdb_data ? Object.keys(supabaseMovies[0].tmdb_data) : []
      });
    }
    
    if (error) {
      // Check if error object is empty or has no meaningful information
      const errorCode = error.code || '';
      const errorMessage = error.message || '';
      const errorDetails = error.details || '';
      const errorHint = error.hint || '';
      const errorKeys = Object.keys(error || {});
      
      // Check if error object is completely empty (common when table doesn't exist)
      const isEmptyError = errorKeys.length === 0 || 
                          (!errorCode && !errorMessage && !errorDetails && !errorHint);
      
      // If error object is completely empty (common when table doesn't exist)
      if (isEmptyError) {
        const currentUrl = process.env.NEXT_PUBLIC_SUPABASE_IMDB_URL || 'https://xzlgttxargsptzeghppo.supabase.co';
        console.warn('⚠️ IMDb Top 250 table query failed (empty error object)');
        console.warn('🔍 Current Supabase URL (supa2):', currentUrl);
        console.warn('💡 Possible issues:');
        console.warn('   1. Wrong Supabase project - check NEXT_PUBLIC_SUPABASE_IMDB_URL in .env.local');
        console.warn('   2. Table doesn\'t exist in this project');
        console.warn('   3. Network/permission issue');
        console.warn('💡 To fix:');
        console.warn('   1. Check your .env.local file has the correct NEXT_PUBLIC_SUPABASE_IMDB_URL');
        console.warn('   2. Verify the table exists in supa2 (xzlgttxargsptzeghppo)');
        console.warn('   3. Run: npx tsx scripts/populate-imdb-top250-complete.ts');
        return [];
      }
      
      // If table doesn't exist or permission denied, log helpful message
      if (errorCode === 'PGRST116' || 
          (errorMessage && (errorMessage.includes('does not exist') || 
                            errorMessage.includes('permission denied') ||
                            (errorMessage.includes('relation') && errorMessage.includes('does not exist'))))) {
        console.warn('⚠️ IMDb Top 250 table does not exist or permission denied');
        if (errorMessage) console.warn('   Error:', errorMessage);
        console.warn('💡 To fix:');
        console.warn('   1. Create the table using supabase-schema-imdb.sql in Supabase SQL Editor');
        console.warn('   2. Run: npx tsx scripts/populate-imdb-top250-complete.ts');
        return [];
      }
      
      // For other errors with meaningful details, log them as warnings (not errors)
      if (errorMessage && errorMessage.trim()) {
        console.warn('⚠️ Supabase query issue:', errorMessage);
        if (errorDetails) console.warn('   Details:', errorDetails);
        if (errorHint) console.warn('   Hint:', errorHint);
      } else if (errorCode && errorCode.trim()) {
        console.warn('⚠️ Supabase query issue (code):', errorCode);
      }
      
      // Return empty array - don't throw, just fail gracefully
      return [];
    }
    
    if (!supabaseMovies || supabaseMovies.length === 0) {
      console.warn('⚠️ Supabase returned empty array - table exists but has no data');
      console.warn('💡 To fix: Run the populate script to populate the table');
      return [];
    }
    
    console.log(`✅ Found ${supabaseMovies.length} movies in Supabase`);
    
    // Check how many have tmdb_data
    const withTmdbData = supabaseMovies.filter((item: any) => item.tmdb_data && typeof item.tmdb_data === 'object');
    console.log(`📊 Movies with tmdb_data: ${withTmdbData.length} out of ${supabaseMovies.length}`);
    
    if (withTmdbData.length === 0) {
      console.warn('⚠️ No movies have tmdb_data - table exists but data is incomplete');
      console.warn('💡 To fix: Run the populate script to fetch and store TMDB data');
      return [];
    }
    
    // Convert TMDB data to Movie format
    let conversionErrors = 0;
    const allMovies: Movie[] = supabaseMovies
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
    const rankMap = new Map(supabaseMovies.map((item: any) => [item.tmdb_id, item.rank]));
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
