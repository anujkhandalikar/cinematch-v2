/**
 * Date Filter Logic Tests
 * 
 * Tests the strict date filtering logic:
 * - 2025: Only movies released in 2025 (year === 2025)
 * - 2000s: Movies from 2000 to 2024 inclusive (year >= 2000 && year <= 2024)
 * - older: Movies older than 2000 (year < 2000)
 */

// Test helper function matching the logic in movies.ts and movieCache.ts
const matchesRelease = (year: number, filter: number | '2025' | '2000s' | 'older' | null | undefined): boolean => {
  if (filter === null || filter === undefined) return true;
  if (typeof filter === 'number') return year >= filter;
  if (filter === '2025') return year === 2025; // Strictly 2025 only
  if (filter === '2000s') return year >= 2000 && year <= 2024; // 2000 to 2024 inclusive
  if (filter === 'older') return year < 2000; // Strictly before 2000
  return true;
};

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('Running date filter tests...\n');
  
  let passed = 0;
  let failed = 0;

  const test = (name: string, fn: () => void) => {
    try {
      fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error: any) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
  };

  // 2025 tests
  test('2025 filter includes 2025', () => {
    if (!matchesRelease(2025, '2025')) throw new Error('Expected 2025 to match');
  });
  test('2025 filter excludes 2024', () => {
    if (matchesRelease(2024, '2025')) throw new Error('Expected 2024 to not match');
  });
  test('2025 filter excludes 2026', () => {
    if (matchesRelease(2026, '2025')) throw new Error('Expected 2026 to not match');
  });

  // 2000s tests
  test('2000s filter includes 2000', () => {
    if (!matchesRelease(2000, '2000s')) throw new Error('Expected 2000 to match');
  });
  test('2000s filter includes 2024', () => {
    if (!matchesRelease(2024, '2000s')) throw new Error('Expected 2024 to match');
  });
  test('2000s filter includes 2010', () => {
    if (!matchesRelease(2010, '2000s')) throw new Error('Expected 2010 to match');
  });
  test('2000s filter excludes 1999', () => {
    if (matchesRelease(1999, '2000s')) throw new Error('Expected 1999 to not match');
  });
  test('2000s filter excludes 2025', () => {
    if (matchesRelease(2025, '2000s')) throw new Error('Expected 2025 to not match');
  });

  // older tests
  test('older filter includes 1999', () => {
    if (!matchesRelease(1999, 'older')) throw new Error('Expected 1999 to match');
  });
  test('older filter includes 1950', () => {
    if (!matchesRelease(1950, 'older')) throw new Error('Expected 1950 to match');
  });
  test('older filter excludes 2000', () => {
    if (matchesRelease(2000, 'older')) throw new Error('Expected 2000 to not match');
  });
  test('older filter excludes 2001', () => {
    if (matchesRelease(2001, 'older')) throw new Error('Expected 2001 to not match');
  });

  // Boundary tests
  test('Boundary: 2024 should not match 2025 filter', () => {
    if (matchesRelease(2024, '2025')) throw new Error('Boundary test failed');
  });
  test('Boundary: 2000 should match 2000s filter', () => {
    if (!matchesRelease(2000, '2000s')) throw new Error('Boundary test failed');
  });
  test('Boundary: 2024 should match 2000s filter', () => {
    if (!matchesRelease(2024, '2000s')) throw new Error('Boundary test failed');
  });
  test('Boundary: 1999 should match older filter', () => {
    if (!matchesRelease(1999, 'older')) throw new Error('Boundary test failed');
  });
  test('Boundary: 2000 should not match older filter', () => {
    if (matchesRelease(2000, 'older')) throw new Error('Boundary test failed');
  });

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

