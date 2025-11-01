/**
 * Script to populate Supabase with complete IMDb Top 250 Movies
 * Fetches full list from IMDb, maps to TMDB, stores in Supabase
 * 
 * Usage: npx tsx scripts/populate-imdb-top250-complete.ts
 * 
 * Make sure you have these environment variables set:
 * - NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 * - SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)
 * - NEXT_PUBLIC_TMDB_API_KEY (or TMDB_BEARER_TOKEN)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local first, then .env
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config(); // Also try .env if it exists

// Get Supabase URL - try multiple env var names
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://xzlgttxargsptzeghppo.supabase.co'; // Fallback to your project

// Get Supabase key - prefer service role, fallback to anon key
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                             process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('');
  console.error('Please set these in your .env.local file:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL=https://xzlgttxargsptzeghppo.supabase.co');
  console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here');
  console.error('');
  console.error('Get your keys from: https://supabase.com/dashboard/project/xzlgttxargsptzeghppo/settings/api');
  console.error('');
  console.error('Current values:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL || '❌ NOT SET');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ SET' : '❌ NOT SET');
  console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ SET' : '❌ NOT SET');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface IMDBListItem {
  id: string;
  rank: number;
  title: string;
  year: number;
}

// Enhanced scraping with multiple strategies
async function scrapeIMDBTop250(): Promise<IMDBListItem[]> {
  console.log('🔍 Scraping IMDb Top 250 Movies...');
  const response = await fetch('https://www.imdb.com/chart/top/?ref_=hm_nv_menu', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`IMDb fetch failed: ${response.status}`);
  }
  
  const html = await response.text();
  console.log(`📄 HTML size: ${html.length} bytes`);
  
  const movies: IMDBListItem[] = [];
  
  // Strategy 1: JSON-LD structured data (most reliable - should find all 250!)
  const jsonLdMatches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  console.log(`Strategy 1: Found ${jsonLdMatches.length} JSON-LD script blocks`);
  
  for (const jsonLdMatch of jsonLdMatches) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      
      // Handle both array and single object formats
      const itemLists = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      
      for (const itemList of itemLists) {
        if (itemList.itemListElement && Array.isArray(itemList.itemListElement)) {
          itemList.itemListElement.forEach((item: any) => {
            // Handle different JSON-LD structures
            const itemObj = item.item || item;
            const itemId = itemObj?.['@id'] || itemObj?.url || itemObj?.identifier?.value;
            
            if (itemId) {
              const imdbIdMatch = String(itemId).match(/\/title\/(tt\d+)/);
              if (imdbIdMatch) {
                const rank = item.position || item.index || (movies.length + 1);
                const title = itemObj?.name || itemObj?.title || '';
                let year = 0;
                
                if (itemObj?.datePublished) {
                  year = new Date(itemObj.datePublished).getFullYear();
                } else if (itemObj?.dateCreated) {
                  year = new Date(itemObj.dateCreated).getFullYear();
                } else if (itemObj?.copyrightYear) {
                  year = parseInt(itemObj.copyrightYear, 10);
                }
                
                movies.push({
                  id: imdbIdMatch[1],
                  rank: rank,
                  title: title,
                  year: year || 0
                });
              }
            }
          });
        }
      }
    } catch (e) {
      // Continue to next JSON-LD block
      console.log(`  ⚠️  JSON-LD parse error (skipping block): ${(e as Error).message.substring(0, 50)}`);
    }
  }
  
  // Deduplicate Strategy 1 results by IMDb ID and sort by rank
  const strategy1Unique = movies.filter((m, i, self) => i === self.findIndex(m2 => m2.id === m.id));
  strategy1Unique.sort((a, b) => a.rank - b.rank);
  strategy1Unique.forEach((m, i) => m.rank = i + 1); // Re-rank sequentially
  movies.length = 0;
  movies.push(...strategy1Unique);
  
  console.log(`Strategy 1: Extracted ${movies.length} movies from JSON-LD`);
  
  // Strategy 2: Parse HTML table structure (multiple patterns)
  // Only use this if Strategy 1 didn't get enough movies
  if (movies.length < 200) {
    // Pattern 1: Standard titleColumn structure
    const titleRegex1 = /<td[^>]*class="titleColumn"[^>]*>\s*<a[^>]*href="\/title\/(tt\d+)\/[^"]*"[^>]*>([^<]+)<\/a>\s*<span[^>]*>\((\d{4})\)<\/span>/gi;
    let match;
    let rank = movies.length + 1; // Continue from where Strategy 1 left off
    const seenIds = new Set(movies.map(m => m.id)); // Track existing IDs
    
    while ((match = titleRegex1.exec(html)) !== null && rank <= 250) {
      const imdbId = match[1];
      if (!seenIds.has(imdbId)) {
        seenIds.add(imdbId);
        movies.push({
          id: imdbId,
          rank: rank++,
          title: match[2].trim(),
          year: parseInt(match[3], 10)
        });
      }
    }
    
    console.log(`Strategy 2: Total movies now: ${movies.length}`);
  }
  
  // Strategy 3: More flexible regex patterns if we still need more
  if (movies.length < 200) {
    // Pattern 2: Any href with /title/tt followed by title and year
    const titleRegex2 = /href="\/title\/(tt\d+)\/[^"]*"[^>]*>([^<]+)<\/a>[\s\S]*?\((\d{4})\)/gi;
    let match;
    let rank = movies.length + 1;
    const seenIds = new Set(movies.map(m => m.id));
    
    while ((match = titleRegex2.exec(html)) !== null && rank <= 250) {
      const imdbId = match[1];
      if (!seenIds.has(imdbId) && match[2].trim().length > 0) {
        seenIds.add(imdbId);
        movies.push({
          id: imdbId,
          rank: rank++,
          title: match[2].trim(),
          year: parseInt(match[3], 10)
        });
      }
    }
    
    console.log(`Strategy 3: Total movies now: ${movies.length}`);
  }
  
  // Strategy 4: Extract all IMDb IDs from hrefs (improved to get all 250)
  if (movies.length < 200) {
    const allMatches = [...html.matchAll(/href="\/title\/(tt\d+)\//gi)];
    const seenIds = new Set(movies.map(m => m.id));
    let rank = movies.length + 1;
    
    for (const match of allMatches) {
      if (rank > 250) break;
      
      const imdbId = match[1];
      if (!seenIds.has(imdbId)) {
        seenIds.add(imdbId);
        
        // Extract title and year from context with better patterns
        const matchIndex = match.index || 0;
        const context = html.slice(Math.max(0, matchIndex - 1000), Math.min(html.length, matchIndex + 1500));
        
        // Try multiple title extraction patterns
        let titleMatch = context.match(/href="\/title\/tt\d+\/[^"]*"[^>]*>([^<]{3,200})</);
        if (!titleMatch) {
          titleMatch = context.match(/>([^<]{10,200})<\/a>/);
        }
        if (!titleMatch) {
          titleMatch = context.match(/title="([^"]{3,200})"/);
        }
        
        const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ').substring(0, 150) : `Movie ${rank}`;
        
        // Try multiple year extraction patterns
        let yearMatch = context.match(/\((\d{4})\)/);
        if (!yearMatch) {
          yearMatch = context.match(/\b(19|20)\d{2}\b/);
        }
        const year = yearMatch ? parseInt(yearMatch[1] || yearMatch[0], 10) : 0;
        
        movies.push({
          id: imdbId,
          rank: rank++,
          title: title,
          year: year
        });
      }
    }
    
    console.log(`Strategy 4: Total movies now: ${movies.length}`);
    
    // Deduplicate and re-rank
    const unique = movies.filter((m, i, self) => i === self.findIndex(m2 => m2.id === m.id));
    unique.forEach((m, i) => m.rank = i + 1);
    movies.length = 0;
    movies.push(...unique.slice(0, 250));
  }
  
  // Final deduplication and ranking
  const unique = movies.filter((m, i, self) => i === self.findIndex(m2 => m2.id === m.id));
  unique.forEach((m, i) => m.rank = i + 1);
  
  console.log(`✅ Parsed ${unique.length} movies from IMDb`);
  
  if (unique.length < 200) {
    console.warn(`⚠️  Only found ${unique.length} movies. Expected ~250. This might not be complete.`);
    console.warn(`   The scraping may have been blocked or IMDb's page structure changed.`);
  }
  
  return unique.slice(0, 250);
}

// Map IMDb ID to TMDB movie data
async function mapIMDBToTMDBMovie(imdbId: string): Promise<any | null> {
  try {
    const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    const TMDB_BEARER = process.env.TMDB_BEARER_TOKEN || process.env.NEXT_PUBLIC_TMDB_BEARER_TOKEN;
    
    if (!TMDB_API_KEY && !TMDB_BEARER) {
      throw new Error('TMDB credentials not configured');
    }
    
    let url = `https://api.themoviedb.org/3/find/${imdbId}?external_source=imdb_id`;
    if (!TMDB_BEARER && TMDB_API_KEY) {
      url += `&api_key=${TMDB_API_KEY}`;
    }
    
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (TMDB_BEARER) {
      headers['Authorization'] = `Bearer ${TMDB_BEARER}`;
    }
    
    const findResponse = await fetch(url, { headers });
    if (!findResponse.ok) return null;
    
    const findData = await findResponse.json();
    if (!findData.movie_results || findData.movie_results.length === 0) {
      return null;
    }
    
    const tmdbId = findData.movie_results[0].id;
    
    let movieUrl = `https://api.themoviedb.org/3/movie/${tmdbId}`;
    if (!TMDB_BEARER && TMDB_API_KEY) {
      movieUrl += `?api_key=${TMDB_API_KEY}`;
    }
    
    const movieResponse = await fetch(movieUrl, { headers });
    if (!movieResponse.ok) return null;
    
    return await movieResponse.json();
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('🚀 Starting IMDb Top 250 Movies population...\n');
  
  try {
    // Step 1: Scrape IMDb
    const imdbMovies = await scrapeIMDBTop250();
    
    if (imdbMovies.length < 200) {
      console.warn(`⚠️  Only found ${imdbMovies.length} movies. This might not be complete.`);
    }
    
    // Step 2: Map to TMDB and fetch full data
    console.log(`\n🔗 Mapping to TMDB (this will take ~5-10 minutes)...\n`);
    const records: any[] = [];
    let successCount = 0;
    
    const batchSize = 5;
    for (let i = 0; i < imdbMovies.length; i += batchSize) {
      const batch = imdbMovies.slice(i, i + batchSize);
      console.log(`📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(imdbMovies.length / batchSize)} (movies ${i + 1}-${Math.min(i + batchSize, imdbMovies.length)})...`);
      
      const batchPromises = batch.map(async (movie) => {
        const tmdbData = await mapIMDBToTMDBMovie(movie.id);
        if (tmdbData) {
          records.push({
            imdb_id: movie.id,
            rank: movie.rank,
            tmdb_id: tmdbData.id,
            tmdb_data: tmdbData,
            title: movie.title,
            year: movie.year
          });
          successCount++;
          console.log(`  ✅ ${movie.rank}. ${movie.title}`);
          return true;
        } else {
          console.log(`  ❌ Failed: ${movie.rank}. ${movie.title}`);
          return false;
        }
      });
      
      await Promise.all(batchPromises);
      
      if (i + batchSize < imdbMovies.length) {
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }
    
    console.log(`\n📊 Mapped ${successCount}/${imdbMovies.length} movies to TMDB\n`);
    
    if (records.length === 0) {
      console.error('❌ No records to insert!');
      process.exit(1);
    }
    
    // Step 3: Clear and populate Supabase
    console.log('\n🗑️  Clearing existing Supabase data...');
    const { error: deleteError, count: deleteCount } = await supabase
      .from('imdb_top250_movies')
      .delete()
      .neq('id', 0)
      .select(undefined, { count: 'exact', head: true });
    
    if (deleteError && deleteError.code !== 'PGRST116') { // PGRST116 = no rows to delete
      console.warn('⚠️  Could not clear:', deleteError.message);
      console.warn('   (Continuing anyway - might be empty table)');
    } else {
      console.log(`   ✅ Cleared ${deleteCount || 0} existing records`);
    }
    
    console.log(`\n📤 Uploading ${records.length} records to Supabase...`);
    console.log(`   Table: imdb_top250_movies`);
    console.log(`   URL: ${SUPABASE_URL}`);
    
    const insertBatchSize = 20;
    let uploadedCount = 0;
    let failedBatches = 0;
    
    for (let i = 0; i < records.length; i += insertBatchSize) {
      const batch = records.slice(i, i + insertBatchSize);
      const batchNum = Math.floor(i / insertBatchSize) + 1;
      const totalBatches = Math.ceil(records.length / insertBatchSize);
      
      console.log(`   📦 Batch ${batchNum}/${totalBatches} (${batch.length} records)...`);
      
      const { data, error } = await supabase
        .from('imdb_top250_movies')
        .upsert(batch, { onConflict: 'imdb_id' })
        .select();
      
      if (error) {
        failedBatches++;
        console.error(`   ❌ Batch ${batchNum} FAILED:`, error.message);
        console.error(`      Code: ${error.code}`);
        console.error(`      Details:`, JSON.stringify(error, null, 2));
        
        // If batch fails, try individual inserts to identify problem records
        if (batch.length > 1) {
          console.log(`      Trying individual inserts...`);
          for (const record of batch) {
            const { error: singleError } = await supabase
              .from('imdb_top250_movies')
              .upsert(record, { onConflict: 'imdb_id' });
            
            if (singleError) {
              console.error(`        ❌ ${record.title || record.imdb_id}: ${singleError.message}`);
            } else {
              uploadedCount++;
              console.log(`        ✅ ${record.title || record.imdb_id}`);
            }
          }
        }
      } else {
        uploadedCount += batch.length;
        console.log(`   ✅ Batch ${batchNum}: Uploaded ${batch.length} records`);
      }
    }
    
    console.log(`\n✅ Upload complete!`);
    console.log(`   • Total records attempted: ${records.length}`);
    console.log(`   • Successfully uploaded: ${uploadedCount}`);
    console.log(`   • Failed batches: ${failedBatches}`);
    
    if (uploadedCount === 0) {
      console.error(`\n❌ ERROR: No records were uploaded to Supabase!`);
      console.error(`   Possible issues:`);
      console.error(`   1. Supabase credentials incorrect`);
      console.error(`   2. Table doesn't exist or has wrong schema`);
      console.error(`   3. Row Level Security (RLS) enabled - disable it for this table`);
      console.error(`   4. Network/permissions error`);
      console.error(`\n   Check:`);
      console.error(`   • Table exists: https://supabase.com/dashboard/project/xzlgttxargsptzeghppo/editor`);
      console.error(`   • RLS disabled: https://supabase.com/dashboard/project/xzlgttxargsptzeghppo/auth/policies`);
      console.error(`   • API keys: https://supabase.com/dashboard/project/xzlgttxargsptzeghppo/settings/api`);
      process.exit(1);
    }
    
    if (uploadedCount < records.length) {
      console.warn(`\n⚠️  WARNING: Only ${uploadedCount}/${records.length} records uploaded.`);
    }
    
    console.log(`\n📍 View in Supabase:`);
    console.log(`   🔗 https://supabase.com/dashboard/project/xzlgttxargsptzeghppo/editor`);
    console.log(`   📊 Table: imdb_top250_movies`);
    console.log(`\n💡 The app will now load all ${uploadedCount} movies instantly!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

