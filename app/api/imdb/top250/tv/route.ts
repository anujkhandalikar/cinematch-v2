import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Server-side file cache for IMDb Top 250 TV Shows
const CACHE_DIR = path.join(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'imdb_top250_tv.json');
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Ensure cache directory exists
async function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
  }
}

// Read from file cache
async function readCache(): Promise<{ data: Array<IMDBListItem & { tmdbData?: any }>; timestamp: number } | null> {
  try {
    await ensureCacheDir();
    if (!existsSync(CACHE_FILE)) {
      return null;
    }
    const content = await readFile(CACHE_FILE, 'utf-8');
    const cached = JSON.parse(content);
    return cached;
  } catch (e) {
    return null;
  }
}

// Write to file cache
async function writeCache(data: Array<IMDBListItem & { tmdbData?: any }>, timestamp: number) {
  try {
    await ensureCacheDir();
    await writeFile(CACHE_FILE, JSON.stringify({ data, timestamp }), 'utf-8');
  } catch (e) {
    console.warn('Failed to write cache:', e);
  }
}

interface IMDBListItem {
  id: string; // IMDb ID (e.g., "tt0944947")
  rank: number;
  title: string;
  year: number;
}

// Scrape IMDb Top 250 TV shows page
async function scrapeIMDBTop250TV(): Promise<IMDBListItem[]> {
  try {
    const response = await fetch('https://www.imdb.com/chart/toptv/?ref_=chttp_ql_6', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`IMDb fetch failed: ${response.status}`);
    }
    
    const html = await response.text();
    const shows: IMDBListItem[] = [];
    
    // Strategy 1: Try to extract JSON-LD structured data (most reliable)
    const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    for (const jsonLdMatch of jsonLdMatches) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd.itemListElement && Array.isArray(jsonLd.itemListElement)) {
          jsonLd.itemListElement.forEach((item: any) => {
            if (item.item && item.item['@id']) {
              const imdbIdMatch = item.item['@id'].match(/\/title\/(tt\d+)/);
              if (imdbIdMatch && item.position) {
                shows.push({
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
        // Continue to next JSON-LD block
      }
    }
    
    // Strategy 2: Parse HTML table structure (multiple patterns)
    if (shows.length === 0) {
      // Pattern 1: Standard titleColumn structure
      const patterns = [
        /<td[^>]*class="[^"]*titleColumn[^"]*"[^>]*>\s*<a[^>]*href="\/title\/(tt\d+)\/[^"]*"[^>]*>([^<]+)<\/a>\s*<span[^>]*>\((\d{4})\)<\/span>/gi,
        /<td[^>]*class="[^"]*titleColumn[^"]*"[^>]*>[\s\S]*?href="\/title\/(tt\d+)\/[^"]*"[^>]*>([^<]+)<\/a>[\s\S]*?\((\d{4})\)/gi,
      ];
      
      for (const pattern of patterns) {
        let match;
        let rank = 1;
        const seenIds = new Set<string>();
        pattern.lastIndex = 0; // Reset regex
        
        while ((match = pattern.exec(html)) !== null && rank <= 250) {
          const imdbId = match[1];
          if (!seenIds.has(imdbId)) {
            seenIds.add(imdbId);
            shows.push({
              id: imdbId,
              rank: rank++,
              title: match[2].trim(),
              year: parseInt(match[3], 10)
            });
          }
        }
        
        if (shows.length > 0) break;
      }
    }
    
    // Strategy 3: More flexible regex patterns if still empty
    if (shows.length === 0) {
      // Pattern 2: Any href with /title/tt followed by title and year
      const titleRegex2 = /href="\/title\/(tt\d+)\/[^"]*"[^>]*>([^<]+)<\/a>[\s\S]*?\((\d{4})\)/gi;
      let match;
      let rank = 1;
      const seenIds = new Set<string>();
      
      while ((match = titleRegex2.exec(html)) !== null && rank <= 250) {
        const imdbId = match[1];
        if (!seenIds.has(imdbId) && match[2].trim().length > 0) {
          seenIds.add(imdbId);
          shows.push({
            id: imdbId,
            rank: rank++,
            title: match[2].trim(),
            year: parseInt(match[3], 10)
          });
        }
      }
    }
    
    // Strategy 4: Extract all IMDb IDs from hrefs and rank by order (fallback)
    if (shows.length === 0) {
      // Try to find the chart table or list
      const chartSection = html.match(/<tbody[^>]*>([\s\S]{100000,500000})<\/tbody>/i);
      const searchHtml = chartSection ? chartSection[1] : html;
      
      const allImdbIds = [...searchHtml.matchAll(/href="\/title\/(tt\d+)\/[^"]*"/gi)];
      const seenIds = new Set<string>();
      let rank = 1;
      
      for (const match of allImdbIds) {
        if (rank > 250) break;
        
        const imdbId = match[1];
        if (!seenIds.has(imdbId)) {
          seenIds.add(imdbId);
          
          // Try multiple patterns to extract title
          const contextStart = Math.max(0, match.index! - 300);
          const contextEnd = Math.min(searchHtml.length, match.index! + 500);
          const context = searchHtml.slice(contextStart, contextEnd);
          
          // Pattern 1: Title after href in <a> tag
          let titleMatch = context.match(/href="\/title\/tt\d+\/[^"]*">([^<]+)<\/a>/);
          // Pattern 2: Title in any <a> tag near the href
          if (!titleMatch) {
            titleMatch = context.match(/href="\/title\/tt\d+\/[^"]*"[\s\S]{0,100}>([^<]{3,100})<\/a>/);
          }
          // Pattern 3: Any text between > and </a> after the href
          if (!titleMatch) {
            titleMatch = context.match(/href="\/title\/tt\d+\/[^"]*"[^>]*>([^<]{3,100})/);
          }
          
          const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : `TV Show ${rank}`;
          
          // Try to extract year
          const yearMatch = context.match(/\((\d{4})\)/);
          const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;
          
          shows.push({
            id: imdbId,
            rank: rank++,
            title: title,
            year: year
          });
        }
      }
    }
    
    if (shows.length === 0) {
      console.error('HTML sample:', html.substring(0, 2000));
      throw new Error('Failed to parse IMDb Top 250 TV page - no shows found. Check IMDb page structure.');
    }
    
    console.log(`✅ Successfully parsed ${shows.length} TV shows from IMDb`);
    
    return shows.slice(0, 250); // Ensure max 250
  } catch (error) {
    console.error('❌ Error scraping IMDb Top 250 TV:', error);
    throw error;
  }
}

// Map IMDb ID to TMDB TV ID and fetch full TV show data
async function mapIMDBToTMDBTV(imdbId: string): Promise<any | null> {
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
      return null;
    }
    
    const findData = await findResponse.json();
    // Get first TV result
    if (!findData.tv_results || findData.tv_results.length === 0) {
      return null;
    }
    
    const tmdbId = findData.tv_results[0].id;
    
    // Fetch full TV show details
    let tvUrl = `https://api.themoviedb.org/3/tv/${tmdbId}`;
    if (!TMDB_BEARER && TMDB_API_KEY) {
      tvUrl += `?api_key=${TMDB_API_KEY}`;
    }
    
    const tvResponse = await fetch(tvUrl, { headers });
    if (!tvResponse.ok) {
      return null;
    }
    
    const tvData = await tvResponse.json();
    return tvData;
  } catch (error) {
    console.error(`Failed to map IMDb ${imdbId} to TMDB TV:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 IMDb Top 250 TV Shows API called');
    
    // Check cache first
    const cached = await readCache();
    if (cached && cached.timestamp && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('✅ Serving cached IMDb Top 250 TV Shows');
      
      // If cache has full TMDB data, return it
      if (cached.data && cached.data[0] && cached.data[0].tmdbData) {
        console.log(`📦 Returning ${cached.data.length} cached TV shows`);
        return NextResponse.json({
          source: 'cache',
          shows: cached.data,
          count: cached.data.length,
          cachedAt: cached.timestamp
        });
      }
      
      // Cache has only IDs, need to fetch fresh data
      console.log('⚠️ Cache has IDs only, fetching fresh data...');
    }
    
    // Scrape IMDb Top 250
    console.log('🔍 Scraping IMDb Top 250 TV Shows...');
    const imdbShows = await scrapeIMDBTop250TV();
    
    // Map to TMDB and fetch full TV show data (batch process with rate limiting)
    console.log('🔗 Mapping IMDb IDs to TMDB and fetching TV show data...');
    const mappedShows: Array<IMDBListItem & { tmdbData: any }> = [];
    let successCount = 0;
    
    // Process in smaller batches (5) since we're making 2 API calls per show (find + TV details)
    const batchSize = 5;
    for (let i = 0; i < imdbShows.length; i += batchSize) {
      const batch = imdbShows.slice(i, i + batchSize);
      const batchPromises = batch.map(async (show) => {
        const tmdbData = await mapIMDBToTMDBTV(show.id);
        if (tmdbData) {
          successCount++;
          return { ...show, tmdbData };
        }
        return null;
      });
      
      const batchResults = await Promise.all(batchPromises);
      mappedShows.push(...batchResults.filter((m): m is IMDBListItem & { tmdbData: any } => m !== null));
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < imdbShows.length) {
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }
    
    const result = {
      source: 'fresh',
      shows: mappedShows.map(m => ({
        id: m.id,
        rank: m.rank,
        title: m.title,
        year: m.year,
        tmdbData: m.tmdbData
      })),
      count: mappedShows.length,
      mappedCount: successCount,
      totalCount: imdbShows.length,
      timestamp: Date.now()
    };
    
    // Cache the full result (including TMDB data) for performance
    await writeCache(
      mappedShows.map(m => ({ 
        id: m.id, 
        rank: m.rank, 
        title: m.title, 
        year: m.year, 
        tmdbData: m.tmdbData 
      })),
      Date.now()
    );
    
    console.log(`✅ Mapped ${successCount}/${imdbShows.length} IMDb TV shows to TMDB`);
    
    if (result.count === 0) {
      console.warn('⚠️ Warning: No TV shows were successfully mapped to TMDB');
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Error fetching IMDb Top 250 TV Shows:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    
    return NextResponse.json(
      { 
        error: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}

