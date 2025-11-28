/**
 * Check if movie_cards table exists in Supabase
 * 
 * Usage:
 *   npm run check-tables
 */

// Load environment variables from .env.local FIRST
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { supabase } from '../lib/supabase';

async function checkTables() {
  console.log('🔍 Checking Supabase tables...\n');
  
  // Check movie_cards table
  try {
    console.log('Checking movie_cards table...');
    const { data, error } = await supabase
      .from('movie_cards')
      .select('card_id, card_type, updated_at')
      .limit(10);
    
    if (error) {
      if (error.code === '42P01') {
        console.error('❌ movie_cards table does NOT exist!');
        console.error('   Error:', error.message);
        console.error('\n💡 Solution: Run the schema file in Supabase SQL Editor:');
        console.error('   1. Go to: https://supabase.com/dashboard/project/qvoqnaqyqsnpydmtskoz/sql/new');
        console.error('   2. Copy contents of supabase-schema-movies.sql');
        console.error('   3. Paste and execute');
      } else {
        console.error('❌ Error querying movie_cards:', error.message);
        console.error('   Code:', error.code);
      }
    } else {
      console.log(`✅ movie_cards table exists!`);
      console.log(`   Found ${data?.length || 0} cards`);
      if (data && data.length > 0) {
        console.log('   Sample cards:');
        data.forEach(card => {
          console.log(`     - ${card.card_id} (${card.card_type}) - Updated: ${card.updated_at}`);
        });
      }
    }
  } catch (err: any) {
    console.error('❌ Exception checking movie_cards:', err.message);
  }
  
  console.log('\n');
  
  // Check sessions table
  try {
    console.log('Checking sessions table...');
    const { data, error } = await supabase
      .from('sessions')
      .select('id, code, mode')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.error('❌ sessions table does NOT exist!');
        console.error('   Error:', error.message);
        console.error('\n💡 Solution: Run supabase-schema.sql in Supabase SQL Editor');
      } else {
        console.error('❌ Error querying sessions:', error.message);
      }
    } else {
      console.log(`✅ sessions table exists!`);
    }
  } catch (err: any) {
    console.error('❌ Exception checking sessions:', err.message);
  }
  
  console.log('\n');
  
  // Check movie_likes table
  try {
    console.log('Checking movie_likes table...');
    const { data, error } = await supabase
      .from('movie_likes')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.error('❌ movie_likes table does NOT exist!');
        console.error('   Error:', error.message);
        console.error('\n💡 Solution: Run supabase-schema.sql in Supabase SQL Editor');
      } else {
        console.error('❌ Error querying movie_likes:', error.message);
      }
    } else {
      console.log(`✅ movie_likes table exists!`);
    }
  } catch (err: any) {
    console.error('❌ Exception checking movie_likes:', err.message);
  }
  
  console.log('\n✅ Table check complete!');
}

checkTables().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});



