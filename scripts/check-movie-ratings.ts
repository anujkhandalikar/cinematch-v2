/**
 * Check how many movies in movie_cards have rating > 7
 * 
 * Usage:
 *   npm run check-ratings
 */

// Load environment variables from .env.local
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
// Also try .env as fallback
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                    'https://qvoqnaqyqsnpydmtskoz.supabase.co';

const getEnvKey = (key: string | undefined): string => {
  return key?.trim() || '';
};

const supabaseAnonKey = getEnvKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 
                        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2b3FuYXF5cXNucHlkbXRza296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4OTc2OTIsImV4cCI6MjA3OTQ3MzY5Mn0.GCRxhs45uZ8jz0UeT69SSfEB9WwpoU1qw2gTeeb_l5Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkMovieRatings() {
  console.log('🔍 Checking movie ratings in movie_cards...\n');
  
  try {
    // Fetch all movie cards
    const { data: cards, error } = await supabase
      .from('movie_cards')
      .select('card_id, card_type, movies')
      .order('card_id');
    
    if (error) {
      console.error('❌ Error fetching movie cards:', error);
      return;
    }
    
    if (!cards || cards.length === 0) {
      console.log('⚠️ No movie cards found in database');
      return;
    }
    
    console.log('📊 Rating Analysis by Card:\n');
    console.log('─'.repeat(80));
    
    let totalMovies = 0;
    let totalAbove7 = 0;
    let total7OrBelow = 0;
    let totalWithoutRating = 0;
    
    for (const card of cards) {
      const movies = card.movies as any[];
      if (!Array.isArray(movies)) {
        console.log(`⚠️ ${card.card_id}: Invalid movies data`);
        continue;
      }
      
      const above7 = movies.filter(m => {
        const rating = typeof m.rating === 'number' ? m.rating : parseFloat(m.rating);
        return rating > 7;
      });
      
      const sevenOrBelow = movies.filter(m => {
        const rating = typeof m.rating === 'number' ? m.rating : parseFloat(m.rating);
        return rating !== undefined && rating !== null && rating <= 7;
      });
      
      const withoutRating = movies.filter(m => {
        return m.rating === undefined || m.rating === null || m.rating === '';
      });
      
      totalMovies += movies.length;
      totalAbove7 += above7.length;
      total7OrBelow += sevenOrBelow.length;
      totalWithoutRating += withoutRating.length;
      
      console.log(`\n🎬 ${card.card_id} (${card.card_type}):`);
      console.log(`   Total movies: ${movies.length}`);
      console.log(`   ✅ Rating > 7: ${above7.length} (${((above7.length / movies.length) * 100).toFixed(1)}%)`);
      console.log(`   ⚠️  Rating ≤ 7: ${sevenOrBelow.length} (${((sevenOrBelow.length / movies.length) * 100).toFixed(1)}%)`);
      console.log(`   ❌ No rating: ${withoutRating.length} (${((withoutRating.length / movies.length) * 100).toFixed(1)}%)`);
      
      // Show some examples of low-rated movies
      if (sevenOrBelow.length > 0) {
        const lowRated = movies
          .filter(m => {
            const rating = typeof m.rating === 'number' ? m.rating : parseFloat(m.rating);
            return rating !== undefined && rating !== null && rating <= 7;
          })
          .slice(0, 5)
          .map(m => `      - ${m.title} (${m.rating})`)
          .join('\n');
        if (lowRated) {
          console.log(`   Examples of movies with rating ≤ 7:`);
          console.log(lowRated);
        }
      }
    }
    
    console.log('\n' + '─'.repeat(80));
    console.log('\n📈 Overall Summary:');
    console.log(`   Total movies across all cards: ${totalMovies}`);
    console.log(`   ✅ Movies with rating > 7: ${totalAbove7} (${((totalAbove7 / totalMovies) * 100).toFixed(1)}%)`);
    console.log(`   ⚠️  Movies with rating ≤ 7: ${total7OrBelow} (${((total7OrBelow / totalMovies) * 100).toFixed(1)}%)`);
    console.log(`   ❌ Movies without rating: ${totalWithoutRating} (${((totalWithoutRating / totalMovies) * 100).toFixed(1)}%)`);
    
    if (total7OrBelow > 0 || totalWithoutRating > 0) {
      console.log('\n💡 Tip: Run `npm run filter-by-rating` to remove movies with rating ≤ 7');
    }
    
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    if (err.stack) {
      console.error('Stack:', err.stack);
    }
  }
}

// Run if called directly
if (require.main === module) {
  checkMovieRatings().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { checkMovieRatings };

