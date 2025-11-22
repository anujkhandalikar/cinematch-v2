import { NextRequest, NextResponse } from 'next/server';

// TMDB credentials
// Prefer v4 Bearer token when available; fall back to v3 API key
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BEARER = process.env.TMDB_BEARER_TOKEN || process.env.NEXT_PUBLIC_TMDB_BEARER_TOKEN;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Fetch with timeout helper
// We keep this simple and localized to this route since the TMDB
// proxy is the only place we need a stricter timeout in the server.
async function fetchWithTimeout(url: string, timeoutMs: number = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// Allow up to 30 seconds for API routes (Vercel/Edge friendly)
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    // 1) Guard: ensure we have some credential configured
    if (!TMDB_API_KEY && !TMDB_BEARER) {
      return NextResponse.json(
        { error: 'TMDB credentials not configured. Set NEXT_PUBLIC_TMDB_API_KEY or TMDB_BEARER_TOKEN.' },
        { status: 500 }
      );
    }

    // 2) Parse the inbound request
    const { searchParams } = new URL(request.url);
    
    // Get all params except 'endpoint'
    const endpoint = searchParams.get('endpoint');
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint parameter required' },
        { status: 400 }
      );
    }

    // 3) Decode endpoint if it's encoded
    let decodedEndpoint = endpoint;
    try {
      decodedEndpoint = decodeURIComponent(endpoint);
    } catch (e) {
      // If decoding fails, use as-is
    }
    
    // 4) Extract path and existing query params from endpoint
    const endpointParts = decodedEndpoint.split('?');
    const path = endpointParts[0];
    const existingParams = endpointParts[1] || '';
    
    // 5) Combine query parameters from both caller and endpoint
    const allParams = new URLSearchParams();
    if (existingParams) {
      existingParams.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key && value) {
          allParams.set(key, value);
        }
      });
    }
    
    // 6) Add page if provided and not already present
    const page = searchParams.get('page');
    if (page && !allParams.has('page')) {
      allParams.set('page', page);
    }
    
    // 7) Build final TMDB URL and attach credentials appropriately
    if (TMDB_BEARER) {
      // With bearer tokens, do not add api_key query param
    } else if (TMDB_API_KEY) {
      allParams.set('api_key', TMDB_API_KEY);
    }
    const tmdbUrl = `${TMDB_BASE_URL}${path}?${allParams.toString()}`;

    // 8) Forward request to TMDB with retry logic
    console.log(`🌐 Fetching from TMDB: ${path}`);
    console.log(`   Full URL: ${tmdbUrl.substring(0, 100)}...`); // Log first 100 chars to avoid logging full URL with key
    
    let response: Response;
    let lastError: any = null;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await fetchWithTimeout(tmdbUrl, 20000); // 20 second timeout
        break; // Success, exit retry loop
      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️ Fetch attempt ${attempt}/${maxRetries} failed:`, error.message || error);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`   Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // All retries failed
          console.error(`❌ All ${maxRetries} fetch attempts failed`);
          throw new Error(`Failed to fetch from TMDB after ${maxRetries} attempts: ${error.message || 'Unknown error'}`);
        }
      }
    }
    
    // 9) Bubble up TMDB errors with context for easier debugging
    if (!response!.ok) {
      let body: any = null;
      try { body = await response!.json(); } catch {}
      console.error(`❌ TMDB API error: ${response!.status} ${response!.statusText}`, body || '');
      return NextResponse.json(
        { error: `TMDB API error: ${response!.status}`, details: body || null },
        { status: response!.status }
      );
    }

    // 10) Success — return JSON as-is
    const data = await response!.json();
    console.log(`✅ Fetched data from TMDB: ${path} (${data.results?.length || 0} results)`);
    return NextResponse.json(data);
  } catch (error: any) {
    // 11) Network/timeout/unknown failures
    console.error('❌ Error fetching from TMDB:', error);
    console.error('   Error type:', error.constructor?.name);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack?.substring(0, 200));
    
    // Provide more specific error messages
    if (error.message?.includes('timeout') || error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout. Please check your connection and try again.' },
        { status: 504 }
      );
    }
    
    if (error.message?.includes('fetch failed')) {
      return NextResponse.json(
        { error: 'Network error: Could not connect to TMDB API. Please check your internet connection.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error', type: error.constructor?.name },
      { status: 500 }
    );
  }
}

