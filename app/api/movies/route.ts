import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Fetch with timeout helper
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

export const maxDuration = 30; // Allow up to 30 seconds for API routes

export async function GET(request: NextRequest) {
  try {
    if (!TMDB_API_KEY) {
      return NextResponse.json(
        { error: 'TMDB API key not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Get all params except 'endpoint'
    const endpoint = searchParams.get('endpoint');
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint parameter required' },
        { status: 400 }
      );
    }

    // Decode endpoint if it's encoded
    let decodedEndpoint = endpoint;
    try {
      decodedEndpoint = decodeURIComponent(endpoint);
    } catch (e) {
      // If decoding fails, use as-is
    }
    
    // Extract path and existing query params from endpoint
    const endpointParts = decodedEndpoint.split('?');
    const path = endpointParts[0];
    const existingParams = endpointParts[1] || '';
    
    // Combine all query parameters
    const allParams = new URLSearchParams();
    if (existingParams) {
      existingParams.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key && value) {
          allParams.set(key, value);
        }
      });
    }
    
    // Add page if provided and not already present
    const page = searchParams.get('page');
    if (page && !allParams.has('page')) {
      allParams.set('page', page);
    }
    
    // Build final TMDB URL
    allParams.set('api_key', TMDB_API_KEY);
    const tmdbUrl = `${TMDB_BASE_URL}${path}?${allParams.toString()}`;

    console.log(`🌐 Fetching from TMDB: ${path}`);
    const response = await fetchWithTimeout(tmdbUrl, 20000);
    
    if (!response.ok) {
      console.error(`❌ TMDB API error: ${response.status}`);
      return NextResponse.json(
        { error: `TMDB API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`✅ Fetched data from TMDB: ${path}`);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ Error fetching from TMDB:', error);
    
    // Provide more specific error messages
    if (error.message?.includes('timeout')) {
      return NextResponse.json(
        { error: 'Request timeout. Please check your connection and try again.' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

