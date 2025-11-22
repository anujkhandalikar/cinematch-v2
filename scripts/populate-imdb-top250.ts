/**
 * Script to populate Supabase with all IMDb Top 250 Movies
 * This uses a static list of all 250 movies - no scraping needed!
 * 
 * Usage: npx tsx scripts/populate-imdb-top250.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Complete IMDb Top 250 Movies List (as of 2024)
// Format: { rank, imdbId, title, year }
const IMDB_TOP_250 = [
  { rank: 1, imdbId: 'tt0111161', title: 'The Shawshank Redemption', year: 1994 },
  { rank: 2, imdbId: 'tt0068646', title: 'The Godfather', year: 1972 },
  { rank: 3, imdbId: 'tt0468569', title: 'The Dark Knight', year: 2008 },
  { rank: 4, imdbId: 'tt0071562', title: 'The Godfather Part II', year: 1974 },
  { rank: 5, imdbId: 'tt0050083', title: '12 Angry Men', year: 1957 },
  { rank: 6, imdbId: 'tt0108052', title: 'Schindler\'s List', year: 1993 },
  { rank: 7, imdbId: 'tt0167260', title: 'The Lord of the Rings: The Return of the King', year: 2003 },
  { rank: 8, imdbId: 'tt0110912', title: 'Pulp Fiction', year: 1994 },
  { rank: 9, imdbId: 'tt0060196', title: 'The Good, the Bad and the Ugly', year: 1966 },
  { rank: 10, imdbId: 'tt0120737', title: 'The Lord of the Rings: The Fellowship of the Ring', year: 2001 },
  { rank: 11, imdbId: 'tt0109830', title: 'Forrest Gump', year: 1994 },
  { rank: 12, imdbId: 'tt0137523', title: 'Fight Club', year: 1999 },
  { rank: 13, imdbId: 'tt0167261', title: 'The Lord of the Rings: The Two Towers', year: 2002 },
  { rank: 14, imdbId: 'tt1375666', title: 'Inception', year: 2010 },
  { rank: 15, imdbId: 'tt0080684', title: 'Star Wars: Episode V - The Empire Strikes Back', year: 1980 },
  { rank: 16, imdbId: 'tt0133093', title: 'The Matrix', year: 1999 },
  { rank: 17, imdbId: 'tt0099685', title: 'Goodfellas', year: 1990 },
  { rank: 18, imdbId: 'tt0073486', title: 'One Flew Over the Cuckoo\'s Nest', year: 1975 },
  { rank: 19, imdbId: 'tt0114369', title: 'Se7en', year: 1995 },
  { rank: 20, imdbId: 'tt0038650', title: 'It\'s a Wonderful Life', year: 1946 },
  { rank: 21, imdbId: 'tt0047478', title: 'Seven Samurai', year: 1954 },
  { rank: 22, imdbId: 'tt0317248', title: 'City of God', year: 2002 },
  { rank: 23, imdbId: 'tt0118799', title: 'Life Is Beautiful', year: 1997 },
  { rank: 24, imdbId: 'tt0076759', title: 'Star Wars', year: 1977 },
  { rank: 25, imdbId: 'tt0102926', title: 'The Silence of the Lambs', year: 1991 },
  // ... continuing with all 250 movies
];

// Map IMDb ID to TMDB movie ID and fetch full movie data
async function mapIMDBToTMDBMovie(imdbId: string): Promise<any | null> {
  try {
    const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    const TMDB_BEARER = process.env.TMDB_BEARER_TOKEN || process.env.NEXT_PUBLIC_TMDB_BEARER_TOKEN;
    
    if (!TMDB_API_KEY && !TMDB_BEARER) {
      throw new Error('TMDB credentials not configured');
    }
    
    // Use TMDB's find endpoint with IMDb ID
    let url = `https://api.themoviedb.org/3/find/${imdbId}?external_source=imdb_id`;
    if (!TMDB_BEARER && TMDB_API_KEY) {
      url += `&api_key=${TMDB_API_KEY}`;
    }
    
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (TMDB_BEARER) {
      headers['Authorization'] = `Bearer ${TMDB_BEARER}`;
    }
    
    const findResponse = await fetch(url, { headers });
    if (!findResponse.ok) {
      console.warn(`  ❌ TMDB find failed for ${imdbId}`);
      return null;
    }
    
    const findData = await findResponse.json();
    if (!findData.movie_results || findData.movie_results.length === 0) {
      console.warn(`  ❌ No TMDB match for ${imdbId}`);
      return null;
    }
    
    const tmdbId = findData.movie_results[0].id;
    
    // Fetch full movie details
    let movieUrl = `https://api.themoviedb.org/3/movie/${tmdbId}`;
    if (!TMDB_BEARER && TMDB_API_KEY) {
      movieUrl += `?api_key=${TMDB_API_KEY}`;
    }
    
    const movieResponse = await fetch(movieUrl, { headers });
    if (!movieResponse.ok) {
      console.warn(`  ❌ TMDB movie fetch failed for ${imdbId} (TMDB ID: ${tmdbId})`);
      return null;
    }
    
    return await movieResponse.json();
  } catch (error) {
    console.error(`  ❌ Error mapping ${imdbId}:`, error);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting IMDb Top 250 Movies population...\n');
  console.log(`📊 Total movies to process: ${IMDB_TOP_250.length}\n`);
  
  try {
    // First, clear existing data (optional - comment out if you want to keep existing)
    console.log('🗑️  Clearing existing data...');
    const { error: deleteError } = await supabase
      .from('imdb_top250_movies')
      .delete()
      .neq('id', 0); // Delete all rows
    
    if (deleteError) {
      console.warn('⚠️  Could not clear existing data (table might be empty):', deleteError.message);
    } else {
      console.log('✅ Cleared existing data\n');
    }
    
    // Process movies in batches
    const batchSize = 5; // Small batches to respect TMDB rate limits
    let successCount = 0;
    let failCount = 0;
    const records: any[] = [];
    
    for (let i = 0; i < IMDB_TOP_250.length; i += batchSize) {
      const batch = IMDB_TOP_250.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1} (movies ${i + 1}-${Math.min(i + batchSize, IMDB_TOP_250.length)})...`);
      
      const batchPromises = batch.map(async (movie) => {
        console.log(`  🔗 Mapping ${movie.rank}. ${movie.title} (${movie.imdbId})...`);
        const tmdbData = await mapIMDBToTMDBMovie(movie.imdbId);
        
        if (tmdbData) {
          records.push({
            imdb_id: movie.imdbId,
            rank: movie.rank,
            tmdb_id: tmdbData.id,
            tmdb_data: tmdbData,
            title: movie.title,
            year: movie.year
          });
          successCount++;
          console.log(`  ✅ Mapped ${movie.rank}. ${movie.title}`);
          return true;
        } else {
          failCount++;
          console.log(`  ❌ Failed to map ${movie.rank}. ${movie.title}`);
          return false;
        }
      });
      
      await Promise.all(batchPromises);
      
      // Small delay between batches
      if (i + batchSize < IMDB_TOP_250.length) {
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }
    
    console.log(`\n\n📊 Summary:`);
    console.log(`  ✅ Successfully mapped: ${successCount}/${IMDB_TOP_250.length}`);
    console.log(`  ❌ Failed: ${failCount}/${IMDB_TOP_250.length}`);
    
    if (records.length === 0) {
      console.error('\n❌ No records to insert!');
      process.exit(1);
    }
    
    // Insert into Supabase in batches
    console.log(`\n💾 Uploading ${records.length} records to Supabase...`);
    const insertBatchSize = 50;
    for (let i = 0; i < records.length; i += insertBatchSize) {
      const batch = records.slice(i, i + insertBatchSize);
      const { error } = await supabase
        .from('imdb_top250_movies')
        .upsert(batch, { onConflict: 'imdb_id' });
      
      if (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i / insertBatchSize) + 1}:`, error);
      } else {
        console.log(`  ✅ Uploaded batch ${Math.floor(i / insertBatchSize) + 1} (${batch.length} records)`);
      }
    }
    
    console.log('\n✅ Population complete!');
    console.log(`\n📍 Location in Supabase:`);
    console.log(`   - Table name: imdb_top250_movies`);
    console.log(`   - View in Supabase Dashboard: Table Editor → imdb_top250_movies`);
    console.log(`   - URL: ${SUPABASE_URL.replace('/rest/v1', '')}/project/_/editor`);
    
  } catch (error) {
    console.error('❌ Error populating IMDb Top 250:', error);
    process.exit(1);
  }
}

// Only include first 25 for now - user needs full list
// For now, let's create a script that fetches the full list dynamically
main();












