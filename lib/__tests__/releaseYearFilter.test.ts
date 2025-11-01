// Quick test to verify release year filter logic
import { filterMovies } from '../movies';
import type { Movie } from '../store';

// Mock movies with different years
const testMovies: Movie[] = [
  { id: '1', title: 'Movie 1987', year: 1987, rating: 9.5, runtime: 120, genres: ['Drama'], ott: ['Netflix'], poster_url: '', synopsis: '', adult: false },
  { id: '2', title: 'Movie 2000', year: 2000, rating: 8.5, runtime: 110, genres: ['Action'], ott: ['Netflix'], poster_url: '', synopsis: '', adult: false },
  { id: '3', title: 'Movie 2024', year: 2024, rating: 8.2, runtime: 105, genres: ['Comedy'], ott: ['Netflix'], poster_url: '', synopsis: '', adult: false },
  { id: '4', title: 'Movie 2025', year: 2025, rating: 8.8, runtime: 115, genres: ['Drama'], ott: ['Netflix'], poster_url: '', synopsis: '', adult: false },
  { id: '5', title: 'Movie 1999', year: 1999, rating: 7.5, runtime: 100, genres: ['Thriller'], ott: ['Netflix'], poster_url: '', synopsis: '', adult: false },
];

console.log('🧪 Testing release year filter...\n');

// Test 2025 filter - should only return movie from 2025
const filtered2025 = filterMovies(testMovies, {
  genres: [],
  ottPlatforms: [],
  languages: [],
  adultContent: false,
  releaseYear: '2025',
  highRatedOnly: false,
}, 123);
console.log('✅ 2025 filter:', filtered2025.map(m => `${m.title} (${m.year})`));
console.log('   Expected: Movie 2025 (2025)');
console.log('   Pass:', filtered2025.length === 1 && filtered2025[0].year === 2025);

// Test 2000s filter - should return 2000, 2001-2024
const filtered2000s = filterMovies(testMovies, {
  genres: [],
  ottPlatforms: [],
  languages: [],
  adultContent: false,
  releaseYear: '2000s',
  highRatedOnly: false,
}, 123);
console.log('\n✅ 2000s filter:', filtered2000s.map(m => `${m.title} (${m.year})`));
console.log('   Expected: Movie 2000 (2000), Movie 2024 (2024), Movie 2025 (2025)');
console.log('   Pass:', filtered2000s.length === 3 && 
  filtered2000s.some(m => m.year === 2000) && 
  filtered2000s.some(m => m.year === 2024) &&
  filtered2000s.some(m => m.year === 2025));

// Test older filter - should return movies before 2000
const filteredOlder = filterMovies(testMovies, {
  genres: [],
  ottPlatforms: [],
  languages: [],
  adultContent: false,
  releaseYear: 'older',
  highRatedOnly: false,
}, 123);
console.log('\n✅ older filter:', filteredOlder.map(m => `${m.title} (${m.year})`));
console.log('   Expected: Movie 1987 (1987), Movie 1999 (1999)');
console.log('   Pass:', filteredOlder.length === 2 && 
  filteredOlder.some(m => m.year === 1987) && 
  filteredOlder.some(m => m.year === 1999));

console.log('\n✅ All release year filter tests completed!');

