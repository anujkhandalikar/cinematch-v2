/**
 * Verify movie cards in Supabase
 * Shows how many movies are stored for each mood card
 * 
 * Usage:
 *   npm run verify-cards
 */

// Load environment variables from .env.local FIRST
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { movieCardService } from '../lib/supabase';
import type { MoodPreset } from '../lib/store';

const MOODS: MoodPreset[] = ['Bollywood', 'LightFun', 'CriticallyAcclaimed', 'NewPopular'];

async function verifyCards() {
  console.log('🔍 Verifying movie cards in Supabase...\n');
  
  for (const mood of MOODS) {
    try {
      const card = await movieCardService.getMovieCard(mood);
      if (card && Array.isArray(card.movies)) {
        console.log(`✅ ${mood}:`);
        console.log(`   Movies stored: ${card.movies.length}`);
        console.log(`   Card type: ${card.card_type}`);
        console.log(`   Updated at: ${card.updated_at}`);
        if (card.movies.length > 0) {
          console.log(`   First movie: ${card.movies[0]?.title || 'N/A'}`);
        }
        console.log('');
      } else {
        console.log(`❌ ${mood}: No card found or empty movies array\n`);
      }
    } catch (error: any) {
      console.error(`❌ ${mood}: Error - ${error.message}\n`);
    }
  }
  
  console.log('✅ Verification complete!');
}

verifyCards().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});



