import type { UserPreferences, MoodPreset } from './store';

/**
 * Get mood card ID from preferences
 * Only returns a card ID if a mood preset is selected
 * Returns null if no mood preset (no pre-stored movies available)
 */
export function getMoodCardId(preferences: UserPreferences): string | null {
  if (!preferences.moodPreset) {
    return null;
  }
  
  // Return the mood preset name as the card ID
  // Valid values: 'Bollywood', 'LightFun', 'CriticallyAcclaimed', 'NewPopular'
  return preferences.moodPreset;
}

/**
 * Check if a mood preset is valid
 */
export function isValidMoodPreset(mood: string | null | undefined): mood is MoodPreset {
  return mood === 'Bollywood' || mood === 'LightFun' || mood === 'CriticallyAcclaimed' || mood === 'NewPopular';
}



