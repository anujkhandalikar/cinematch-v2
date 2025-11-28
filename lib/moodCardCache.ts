/**
 * In-memory cache for mood cards
 * Caches mood cards after first fetch to enable instant subsequent loads
 */

import type { MovieCard } from './supabase';
import type { Movie } from './store';

interface CachedCard {
  card: MovieCard;
  timestamp: number;
}

// Cache with 1 hour expiration (3600000 ms)
const CACHE_EXPIRY_MS = 60 * 60 * 1000;

// In-memory cache: Map<cardId, CachedCard>
const cache = new Map<string, CachedCard>();

/**
 * Get a mood card from cache if available and not expired
 */
export function getCachedMoodCard(cardId: string): MovieCard | null {
  const cached = cache.get(cardId);
  
  if (!cached) {
    return null;
  }
  
  const age = Date.now() - cached.timestamp;
  if (age > CACHE_EXPIRY_MS) {
    // Cache expired, remove it
    cache.delete(cardId);
    console.log(`🗑️ Cache expired for ${cardId} (age: ${Math.round(age / 1000)}s)`);
    return null;
  }
  
  console.log(`⚡ Cache hit for ${cardId} (age: ${Math.round(age / 1000)}s)`);
  return cached.card;
}

/**
 * Store a mood card in cache
 */
export function setCachedMoodCard(cardId: string, card: MovieCard): void {
  cache.set(cardId, {
    card,
    timestamp: Date.now()
  });
  console.log(`💾 Cached ${cardId} (${Array.isArray(card.movies) ? card.movies.length : 0} movies)`);
}

/**
 * Clear cache for a specific card or all cards
 */
export function clearMoodCardCache(cardId?: string): void {
  if (cardId) {
    cache.delete(cardId);
    console.log(`🗑️ Cleared cache for ${cardId}`);
  } else {
    cache.clear();
    console.log(`🗑️ Cleared all mood card cache`);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; cards: string[] } {
  return {
    size: cache.size,
    cards: Array.from(cache.keys())
  };
}



