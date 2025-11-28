/**
 * Display movie cards in a readable format
 * Shows all movies stored for each mood card
 * 
 * Usage:
 *   npm run display-cards
 *   npm run display-cards -- --mood=Bollywood  # Display specific mood card
 */

// Load environment variables from .env.local FIRST
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { movieCardService } from '../lib/supabase';
import type { MoodPreset, Movie } from '../lib/store';

const MOODS: MoodPreset[] = ['Bollywood', 'LightFun', 'CriticallyAcclaimed', 'NewPopular'];

function displayMovie(movie: Movie, index: number): void {
  console.log(`   ${index + 1}. ${movie.title} (${movie.year})`);
  console.log(`      Rating: ${movie.rating}/10 | Genres: ${movie.genres.join(', ') || 'N/A'}`);
  if (movie.ott && movie.ott.length > 0) {
    console.log(`      Platforms: ${movie.ott.join(', ')}`);
  }
}

async function displayMoodCard(mood: MoodPreset, showAll: boolean = false): Promise<void> {
  try {
    const card = await movieCardService.getMovieCard(mood);
    
    if (!card) {
      console.log(`❌ ${mood}: No card found\n`);
      return;
    }
    
    const movies = card.movies as Movie[];
    
    if (!Array.isArray(movies) || movies.length === 0) {
      console.log(`❌ ${mood}: No movies stored\n`);
      return;
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎬 ${mood} Card`);
    console.log(`${'='.repeat(80)}`);
    console.log(`📊 Total Movies: ${movies.length}`);
    console.log(`📅 Last Updated: ${new Date(card.updated_at).toLocaleString()}`);
    console.log(`🔧 Card Type: ${card.card_type}`);
    console.log(`\n📋 Movies List:`);
    console.log(`${'-'.repeat(80)}`);
    
    if (showAll || movies.length <= 20) {
      // Show all movies if requested or if there are 20 or fewer
      movies.forEach((movie, index) => {
        displayMovie(movie, index);
        console.log('');
      });
    } else {
      // Show first 10 and last 10, with summary
      console.log('   First 10 movies:');
      movies.slice(0, 10).forEach((movie, index) => {
        displayMovie(movie, index);
        console.log('');
      });
      
      console.log(`   ... (${movies.length - 20} more movies) ...\n`);
      
      console.log('   Last 10 movies:');
      movies.slice(-10).forEach((movie, index) => {
        displayMovie(movie, movies.length - 10 + index);
        console.log('');
      });
      
      console.log(`\n💡 Tip: Use --all flag to see all ${movies.length} movies`);
    }
    
    // Summary statistics
    const years = movies.map(m => m.year).filter(Boolean);
    const ratings = movies.map(m => m.rating).filter(Boolean);
    const allGenres = movies.flatMap(m => m.genres || []);
    const genreCounts = allGenres.reduce((acc, genre) => {
      acc[genre] = (acc[genre] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`${'-'.repeat(80)}`);
    console.log(`📈 Statistics:`);
    if (years.length > 0) {
      const minYear = Math.min(...years);
      const maxYear = Math.max(...years);
      console.log(`   Year Range: ${minYear} - ${maxYear}`);
    }
    if (ratings.length > 0) {
      const avgRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
      const minRating = Math.min(...ratings).toFixed(1);
      const maxRating = Math.max(...ratings).toFixed(1);
      console.log(`   Rating: Avg ${avgRating}/10 (Range: ${minRating} - ${maxRating})`);
    }
    if (Object.keys(genreCounts).length > 0) {
      const topGenres = Object.entries(genreCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([genre, count]) => `${genre} (${count})`)
        .join(', ');
      console.log(`   Top Genres: ${topGenres}`);
    }
    console.log(`${'='.repeat(80)}\n`);
    
  } catch (error: any) {
    console.error(`❌ Error displaying ${mood}:`, error.message);
    console.log('');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const moodArg = args.find(arg => arg.startsWith('--mood='));
  const showAll = args.includes('--all');
  const specificMood = moodArg ? moodArg.split('=')[1] as MoodPreset : null;
  
  const moodsToDisplay: MoodPreset[] = specificMood 
    ? [specificMood]
    : MOODS;
  
  console.log('🎬 Displaying Movie Cards from Supabase\n');
  console.log(`   Cards to display: ${moodsToDisplay.join(', ')}`);
  if (showAll) {
    console.log('   Mode: Showing ALL movies for each card\n');
  } else {
    console.log('   Mode: Showing first 10 and last 10 (use --all to see everything)\n');
  }
  
  for (const mood of moodsToDisplay) {
    await displayMoodCard(mood, showAll);
  }
  
  console.log('✅ Display complete!');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});



