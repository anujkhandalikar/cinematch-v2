/**
 * Script to update IMDb Top 250 Movies in Supabase
 * Run this manually every 3 months or when IMDb Top 250 changes
 * 
 * Usage: npx tsx scripts/update-imdb-top250.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface IMDBListItem {
  id: string;
  rank: number;
  title: string;
  year: number;
  tmdbData?: any;
}

// Reuse the scraping logic from the API route
async function scrapeIMDBTop250(): Promise<IMDBListItem[]> {
  console.log('🔍 Scraping IMDb Top 250 Movies...');
  const response = await fetch('https://www.imdb.com/chart/top/?ref_=hm_nv_menu', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`IMDb fetch failed: ${response.status}`);
  }
  
  const html = await response.text();
  const movies: IMDBListItem[] = [];
  
  // Strategy 1: JSON-LD
  const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const jsonLdMatch of jsonLdMatches) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      if (jsonLd.itemListElement && Array.isArray(jsonLd.itemListElement)) {
        jsonLd.itemListElement.forEach((item: any) => {
          if (item.item && item.item['@id']) {
            const imdbIdMatch = item.item['@id'].match(/\/title\/(tt\d+)/);
            if (imdbIdMatch && item.position) {
              movies.push({
                id: imdbIdMatch[1],
                rank: item.position,
                title: item.item.name || '',
                year: item.item.datePublished ? new Date(item.item.datePublished).getFullYear() : 0
              });
            }
          }
        });
      }
    } catch (e) {
      // Continue
    }
  }
  
  // Strategy 2-4: HTML parsing (simplified - reuse full logic from API if needed)
  if (movies.length === 0) {
    const titleRegex = /<td[^>]*class="[^"]*titleColumn[^"]*"[^>]*>\s*<a[^>]*href="\/title\/(tt\d+)\/[^"]*"[^>]*>([^<]+)<\/a>\s*<span[^>]*>\((\d{4})\)<\/span>/gi;
    let match;
    let rank = 1;
    const seenIds = new Set<string>();
    
    while ((match = titleRegex.exec(html)) !== null && rank <= 250) {
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
  }
  
  if (movies.length === 0) {
    throw new Error('Failed to parse IMDb Top 250');
  }
  
  console.log(`✅ Parsed ${movies.length} movies from IMDb`);
  return movies.slice(0, 250);
}

// Map IMDb ID to TMDB movie data
async function mapIMDBToTMDBMovie(imdbId: string): Promise<any | null> {
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
}

async function main() {
  console.log('🚀 Starting IMDb Top 250 Movies update...\n');
  
  try {
    // Step 1: Scrape IMDb
    const imdbMovies = await scrapeIMDBTop250();
    
    // Step 2: Map to TMDB (with rate limiting)
    console.log('🔗 Mapping to TMDB...');
    const mappedMovies: Array<IMDBListItem & { tmdbData: any }> = [];
    let successCount = 0;
    
    const batchSize = 5;
    for (let i = 0; i < imdbMovies.length; i += batchSize) {
      const batch = imdbMovies.slice(i, i + batchSize);
      const batchPromises = batch.map(async (movie) => {
        const tmdbData = await mapIMDBToTMDBMovie(movie.id);
        if (tmdbData) {
          successCount++;
          return { ...movie, tmdbData };
        }
        return null;
      });
      
      const batchResults = await Promise.all(batchPromises);
      mappedMovies.push(...batchResults.filter((m): m is IMDBListItem & { tmdbData: any } => m !== null));
      
      console.log(`   Mapped ${successCount}/${imdbMovies.length}...`);
      
      if (i + batchSize < imdbMovies.length) {
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }
    
    console.log(`✅ Mapped ${successCount}/${imdbMovies.length} movies to TMDB\n`);
    
    // Step 3: Upsert to Supabase
    console.log('💾 Uploading to Supabase...');
    const records = mappedMovies.map(m => ({
      imdb_id: m.id,
      rank: m.rank,
      tmdb_id: m.tmdbData?.id || null,
      tmdb_data: m.tmdbData || null,
      title: m.title,
      year: m.year
    }));
    
    // Upsert in batches
    const upsertBatchSize = 50;
    for (let i = 0; i < records.length; i += upsertBatchSize) {
      const batch = records.slice(i, i + upsertBatchSize);
      const { error } = await supabase
        .from('imdb_top250_movies')
        .upsert(batch, { onConflict: 'imdb_id' });
      
      if (error) {
        console.error(`❌ Error upserting batch ${i / upsertBatchSize + 1}:`, error);
      } else {
        console.log(`   Uploaded batch ${i / upsertBatchSize + 1} (${batch.length} records)...`);
      }
    }
    
    console.log('\n✅ Update complete!');
    console.log(`📊 Total records in database: ${records.length}`);
    
  } catch (error) {
    console.error('❌ Error updating IMDb Top 250:', error);
    process.exit(1);
  }
}

main();










