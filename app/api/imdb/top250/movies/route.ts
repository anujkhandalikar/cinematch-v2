import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Server-side file cache for IMDb Top 250 Movies
const CACHE_DIR = path.join(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'imdb_top250_movies.json');
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
  id: string; // IMDb ID (e.g., "tt0111161")
  rank: number;
  title: string;
  year: number;
}

// Scrape IMDb Top 250 movies page
async function scrapeIMDBTop250(): Promise<IMDBListItem[]> {
  try {
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
    
    // Log HTML size for debugging
    console.log(`📄 HTML size: ${html.length} bytes`);
    
    // Check if page loaded properly (IMDb should be ~500KB+)
    if (html.length < 100000) {
      console.warn('⚠️ HTML seems too small - might be blocked or incomplete');
    }
    
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
        // Continue to next JSON-LD block
      }
    }
    
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
      
      console.log(`Strategy 2: Added ${movies.length - (rank - (movies.length + 1))} movies`);
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
      // Find ALL /title/tt patterns in the entire HTML
      const allImdbMatches = [...html.matchAll(/href="\/title\/(tt\d+)\//gi)];
      const seenIds = new Set<string>();
      let rank = movies.length + 1; // Continue from where previous strategies left off
      
      console.log(`Strategy 4: Found ${allImdbMatches.length} IMDb ID patterns in HTML`);
      
      for (const match of allImdbMatches) {
        if (rank > 250) break;
        
        const imdbId = match[1];
        if (!seenIds.has(imdbId)) {
          seenIds.add(imdbId);
          
          // Get larger context window for better title/year extraction
          const matchIndex = match.index || 0;
          const contextStart = Math.max(0, matchIndex - 600);
          const contextEnd = Math.min(html.length, matchIndex + 1000);
          const context = html.slice(contextStart, contextEnd);
          
          // Multiple title extraction patterns
          let titleMatch = context.match(/href="\/title\/tt\d+\/[^"]*"[^>]*>([^<]{3,200})</);
          if (!titleMatch) {
            titleMatch = context.match(/>([^<]{3,200})<\/a>/);
          }
          if (!titleMatch) {
            titleMatch = context.match(/title="([^"]{3,200})"/);
          }
          
          const title = titleMatch 
            ? titleMatch[1].trim().replace(/\s+/g, ' ').substring(0, 150)
            : `Movie ${rank}`;
          
          // Year extraction - multiple patterns
          let yearMatch = context.match(/\((\d{4})\)/);
          if (!yearMatch) {
            yearMatch = context.match(/<span[^>]*>\((\d{4})\)<\/span>/);
          }
          const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;
          
          movies.push({
            id: imdbId,
            rank: rank++,
            title: title,
            year: year
          });
        }
      }
      
      // Deduplicate and ensure we have exactly 250
      const uniqueMovies = movies.filter((movie, index, self) => 
        index === self.findIndex(m => m.id === movie.id)
      );
      
      // Re-rank to ensure sequential ranks
      uniqueMovies.forEach((movie, index) => {
        movie.rank = index + 1;
      });
      
      movies.length = 0;
      movies.push(...uniqueMovies.slice(0, 250));
      
      console.log(`Strategy 4: Extracted ${movies.length} unique movies`);
    }
    
    if (movies.length === 0) {
      console.error('HTML sample:', html.substring(0, 2000));
      throw new Error('Failed to parse IMDb Top 250 page - no movies found. Check IMDb page structure.');
    }
    
    console.log(`✅ Successfully parsed ${movies.length} movies from IMDb`);
    
    return movies.slice(0, 250); // Ensure max 250
  } catch (error) {
    console.error('❌ Error scraping IMDb Top 250:', error);
    throw error;
  }
}

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
      return null;
    }
    
    const findData = await findResponse.json();
    // Get first movie result
    if (!findData.movie_results || findData.movie_results.length === 0) {
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
      return null;
    }
    
    const movieData = await movieResponse.json();
    return movieData;
  } catch (error) {
    console.error(`Failed to map IMDb ${imdbId} to TMDB:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 IMDb Top 250 Movies API called');
    
    // Check for force refresh parameter
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await readCache();
      if (cached && cached.timestamp && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        // Only serve cache if it has sufficient movies (>= 200)
        // This prevents serving incomplete caches with only 20-25 movies
        if (cached.data && cached.data.length >= 200 && cached.data[0] && cached.data[0].tmdbData) {
          console.log(`✅ Serving cached IMDb Top 250 Movies (${cached.data.length} movies)`);
          return NextResponse.json({
            source: 'cache',
            movies: cached.data,
            count: cached.data.length,
            cachedAt: cached.timestamp
          });
        }
        
        // Cache has insufficient movies - ignore it and fetch fresh
        if (cached.data && cached.data.length > 0 && cached.data.length < 200) {
          console.log(`⚠️ Cache only has ${cached.data.length} movies (need 250), ignoring cache and fetching fresh...`);
        } else {
          console.log('⚠️ Cache incomplete, fetching fresh...');
        }
      }
    } else {
      console.log('🔄 Force refresh requested, bypassing cache');
    }
    
    // Scrape IMDb Top 250
    console.log('🔍 Scraping IMDb Top 250 Movies...');
    const imdbMovies = await scrapeIMDBTop250();
    
    // Map to TMDB and fetch full movie data (batch process with rate limiting)
    console.log('🔗 Mapping IMDb IDs to TMDB and fetching movie data...');
    const mappedMovies: Array<IMDBListItem & { tmdbData: any }> = [];
    let successCount = 0;
    
    // Process in smaller batches (5) since we're making 2 API calls per movie (find + movie details)
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
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < imdbMovies.length) {
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }
    
    const result = {
      source: 'fresh',
      movies: mappedMovies.map(m => ({
        id: m.id,
        rank: m.rank,
        title: m.title,
        year: m.year,
        tmdbData: m.tmdbData
      })),
      count: mappedMovies.length,
      mappedCount: successCount,
      totalCount: imdbMovies.length,
      timestamp: Date.now()
    };
    
    // Cache the full result (including TMDB data) for performance
    await writeCache(
      mappedMovies.map(m => ({ 
        id: m.id, 
        rank: m.rank, 
        title: m.title, 
        year: m.year, 
        tmdbData: m.tmdbData 
      })),
      Date.now()
    );
    
    console.log(`✅ Mapped ${successCount}/${imdbMovies.length} IMDb movies to TMDB`);
    
    if (result.count === 0) {
      console.warn('⚠️ Warning: No movies were successfully mapped to TMDB');
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Error fetching IMDb Top 250 Movies:', error);
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

