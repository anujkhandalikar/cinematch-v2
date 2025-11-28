'use client';

import { useEffect, useState, useRef } from 'react';
import { useStore, Genre, OTTPlatform, Language, UserPreferences, MoodPreset } from '@/lib/store';
import { trackEvent } from '@/lib/tracking';
import { getMoodCardId } from '@/lib/movieCards';
import { movieCardService } from '@/lib/supabase';
import { getCachedMoodCard, setCachedMoodCard } from '@/lib/moodCardCache';

const GENRES: Genre[] = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery',
  'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'
];

const OTT_PLATFORMS: OTTPlatform[] = [
  'Netflix', 'Prime Video', 'Disney+', 'HBO Max', 'Hulu',
  'Apple TV+', 'Paramount+', 'Peacock'
];

interface MoodCard {
  key: MoodPreset | 'FineTuneInfo';
  title: string;
  subtitle: string;
  image: string;
  gradient: string;
  isInfoCard?: boolean;
}

const MOOD_CARDS: MoodCard[] = [
  {
    key: 'Bollywood',
    title: 'Bollywood',
    subtitle: 'Hindi crowd-pleasers from 2000 through today.',
    image: '/saiyara.jpeg',
    gradient: 'linear-gradient(200deg, rgba(240, 98, 146, 0.82) 0%, rgba(74, 20, 140, 0.8) 55%, rgba(10,10,10,0.95) 100%)'
  },
  {
    key: 'LightFun',
    title: 'Something Light & Fun',
    subtitle: 'Feel-good stories, laughter, and comfort.',
    image: '/rat.jpg',
    gradient: 'linear-gradient(200deg, rgba(255,170,180,0.85) 0%, rgba(30,30,30,0.75) 55%, rgba(10,10,10,0.95) 100%)'
  },
  {
    key: 'NewPopular',
    title: 'New & Popular',
    subtitle: 'Fresh releases buzzing with energy right now.',
    image: '/demonslayer.jpg',
    gradient: 'linear-gradient(200deg, rgba(255,90,50,0.78) 0%, rgba(130,20,10,0.85) 45%, rgba(10,10,10,0.95) 100%)'
  },
  {
    key: 'CriticallyAcclaimed',
    title: 'Critically Acclaimed',
    subtitle: 'Award-winning cinema with prestige and polish.',
    image: '/dark%20knight.jpg',
    gradient: 'linear-gradient(200deg, rgba(10,12,26,0.85) 0%, rgba(5,5,10,0.88) 60%, rgba(0,0,0,0.96) 100%)'
  },
  {
    key: 'FineTuneInfo',
    title: 'Want something more finetuned?',
    subtitle: 'Scroll below',
    image: '/3 idiots.jpg',
    gradient: 'linear-gradient(200deg, rgba(20,20,30,0.85) 0%, rgba(10,10,20,0.88) 60%, rgba(0,0,0,0.96) 100%)',
    isInfoCard: true
  }
];

const getMoodFilters = (mood: MoodPreset): Partial<UserPreferences> => {
  const base: Partial<UserPreferences> = {
    genres: [],
    ottPlatforms: [],
    languages: [],
    adultContent: false,
    releaseYear: null,
    highRatedOnly: false,
    imdbTop250Movies: false,
    releaseAfterMonths: null,
    moodIncludeGenres: [],
    moodExcludeGenres: [],
    moodPreset: mood,
  };

  switch (mood) {
    case 'LightFun':
      return {
        ...base,
        moodIncludeGenres: ['Comedy', 'Romance', 'Drama', 'Family', 'Animation'],
        moodExcludeGenres: ['Horror', 'Thriller', 'War', 'Crime'],
      };
    case 'CriticallyAcclaimed':
      return {
        ...base,
        imdbTop250Movies: true,
      };
    case 'NewPopular': {
      return {
        ...base,
        moodIncludeGenres: ['Action', 'Comedy', 'Drama', 'Thriller', 'Romance'],
        releaseAfterMonths: 24,
      };
    }
    case 'Bollywood':
      return {
        ...base,
        languages: ['Hindi'],
        releaseYear: 2000,
      };
    default:
      return base;
  }
};

export default function PreferencesScreen() {
  const preferences = useStore((state) => state.preferences);
  const setPreferences = useStore((state) => state.setPreferences);
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);

  const [selectedGenres, setSelectedGenres] = useState<Genre[]>(preferences.genres);
  const [selectedPlatforms, setSelectedPlatforms] = useState<OTTPlatform[]>(preferences.ottPlatforms);
  const [adultContent, setAdultContent] = useState(preferences.adultContent);
  const [highRatedOnly, setHighRatedOnly] = useState(preferences.highRatedOnly || false);
  const [selectedLanguages, setSelectedLanguages] = useState<Language[]>(preferences.languages || []);
  const [releaseYear, setReleaseYear] = useState<UserPreferences['releaseYear']>(preferences.releaseYear);
  const initialImdbTop250 = preferences.moodPreset ? preferences.imdbTop250Movies || false : false;
  const [imdbTop250Movies, setImdbTop250Movies] = useState(initialImdbTop250);

  const totalMoodCards = MOOD_CARDS.length;
  // Always start with Bollywood (index 0) preselected
  const initialMoodIndex = 0;

  const [selectedMood, setSelectedMood] = useState<MoodPreset | null>(preferences.moodPreset ?? 'Bollywood');
  const [activeMoodIndex, setActiveMoodIndex] = useState(initialMoodIndex);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [isFineTuneOpen, setIsFineTuneOpen] = useState(false);
  const [hasManualAdjustments, setHasManualAdjustments] = useState(false);
  const [cardsBlurred, setCardsBlurred] = useState(false);
  const [filtersBlurred, setFiltersBlurred] = useState(true);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackEvent({ event: 'Preferences_Page_Visited' });
    // Preselect Bollywood on initial load if no preset exists
    if (!preferences.moodPreset) {
      setSelectedMood('Bollywood');
      setActiveMoodIndex(0);
    }
  }, []);

  // Handle scroll to detect when a card is swiped to center and auto-select it
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      const cards = carousel.querySelectorAll<HTMLElement>('[data-mood-card]');
      const containerRect = carousel.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;

      let closestIndex = 0;
      let closestDistance = Infinity;

      cards.forEach((card, index) => {
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const distance = Math.abs(cardCenter - containerCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveMoodIndex((prevIndex) => {
        if (closestIndex !== prevIndex) {
          const card = MOOD_CARDS[closestIndex];
          // Auto-select the card if it's not an info card
          if (card && !card.isInfoCard && card.key !== 'FineTuneInfo') {
            const moodKey = card.key as MoodPreset;
            setSelectedMood(moodKey);
            setCardsBlurred(false);
            setFiltersBlurred(true);
            setHasManualAdjustments(false);
            setIsFineTuneOpen(false);
            setSelectedGenres([]);
            setSelectedPlatforms([]);
            setSelectedLanguages([]);
            setReleaseYear(null);
            setHighRatedOnly(false);
            setAdultContent(false);
            setImdbTop250Movies(false);
            trackEvent({
              event: 'Mood_Selected',
              category: 'mood',
              option: moodKey,
            });
          }
          return closestIndex;
        }
        return prevIndex;
      });
    };

    // Use requestAnimationFrame for smooth, responsive updates
    let rafId: number | null = null;
    const rafHandleScroll = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(handleScroll);
    };

    carousel.addEventListener('scroll', rafHandleScroll, { passive: true });
    
    // Also check on mount to set initial state
    handleScroll();

    return () => {
      carousel.removeEventListener('scroll', rafHandleScroll);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  useEffect(() => {
    if (preferences.moodPreset) {
      setCardsBlurred(false);
      setFiltersBlurred(true);
    }
  }, [preferences.moodPreset]);

  // Preload mood card when selected (background fetch for instant load later)
  useEffect(() => {
    if (selectedMood) {
      const cardId = getMoodCardId({ moodPreset: selectedMood } as UserPreferences);
      if (cardId) {
        // Check if already cached
        const cached = getCachedMoodCard(cardId);
        if (!cached) {
          // Preload in background - don't await, just start the fetch
          console.log(`🚀 Preloading mood card: ${cardId}`);
          movieCardService.getMovieCard(cardId)
            .then((movieCard) => {
              if (movieCard) {
                setCachedMoodCard(cardId, movieCard);
                console.log(`✅ Preloaded ${cardId} (${Array.isArray(movieCard.movies) ? movieCard.movies.length : 0} movies)`);
              }
            })
            .catch((error) => {
              console.warn(`⚠️ Failed to preload ${cardId}:`, error);
            });
        } else {
          console.log(`⚡ ${cardId} already cached, skipping preload`);
        }
      }
    }
  }, [selectedMood]);

  const resetManualFilters = () => {
    setSelectedGenres([]);
    setSelectedPlatforms([]);
    setSelectedLanguages([]);
    setReleaseYear(null);
    setHighRatedOnly(false);
    setAdultContent(false);
    setImdbTop250Movies(false);
  };

  const handleMoodSelect = (mood: MoodPreset) => {
    const targetIndex = MOOD_CARDS.findIndex((card) => card.key === mood);
    const normalizedIndex = targetIndex >= 0 ? targetIndex : 0;
    setActiveMoodIndex(normalizedIndex);
    setSelectedMood(mood);
    setCardsBlurred(false);
    setFiltersBlurred(true);
    setHasManualAdjustments(false);
    setIsFineTuneOpen(false);
    setSelectedGenres([]);
    setSelectedPlatforms([]);
    setSelectedLanguages([]);
    setReleaseYear(null);
    setHighRatedOnly(false);
    setAdultContent(false);
    setImdbTop250Movies(false);
    trackEvent({
      event: 'Mood_Selected',
      category: 'mood',
      option: mood,
    });
    
    // Scroll to the selected card
    requestAnimationFrame(() => {
      const scrollContainer = carouselRef.current;
      if (scrollContainer) {
        const cards = scrollContainer.querySelectorAll<HTMLButtonElement>('[data-mood-card]');
        const targetCard = cards[normalizedIndex]?.parentElement as HTMLElement | undefined;
        targetCard?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    });
  };

  const engageManualFilters = () => {
    setIsFineTuneOpen(true);
    setHasManualAdjustments(true);
    setSelectedMood(null);
    setCardsBlurred(true);
    setFiltersBlurred(false);
  };

  const handleFineTuneToggle = () => {
    setIsFineTuneOpen((prev) => {
      const next = !prev;
      if (next) {
        setSelectedMood(null);
        setHasManualAdjustments(true);
        setCardsBlurred(true);
        setFiltersBlurred(false);
        // Scroll to fine-tune button and ensure it's at the top of viewport
        setTimeout(() => {
          if (filtersRef.current) {
            const elementTop = filtersRef.current.getBoundingClientRect().top + window.pageYOffset;
            window.scrollTo({ top: elementTop - 20, behavior: 'smooth' });
          }
        }, 100);
      } else {
        if (!selectedMood) {
          setSelectedMood(MOOD_CARDS[activeMoodIndex].key);
        }
        setCardsBlurred(false);
        setFiltersBlurred(true);
        // Scroll back to top to show mood cards
        window.scrollTo({ top: 0, behavior: 'smooth' });
        requestAnimationFrame(() => {
          const scrollContainer = carouselRef.current;
          if (scrollContainer) {
            const cards = scrollContainer.querySelectorAll<HTMLButtonElement>('[data-mood-card]');
            const targetCard = cards[activeMoodIndex]?.parentElement as HTMLElement | undefined;
            targetCard?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }
        });
      }
      return next;
    });
  };

  const cardWidthClass = 'w-[65vw] sm:w-[45vw] md:w-[35vw] max-w-[300px]';
  const peekGapClass = 'px-[18vw] sm:px-[12vw] md:px-[10vw]';

  const activeMood = MOOD_CARDS[activeMoodIndex];
  const selectedMoodCard = selectedMood ? MOOD_CARDS.find((card) => card.key === selectedMood) ?? null : null;
  const canContinue = Boolean(selectedMood || hasManualAdjustments);
  const handleGenreToggle = (genre: Genre) => {
    engageManualFilters();
    if (imdbTop250Movies) {
      setImdbTop250Movies(false);
    }
    trackEvent({
      event: 'Preference_Selected',
      category: 'genre',
      option: genre,
    });
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre],
    );
  };

  const handlePlatformToggle = (platform: OTTPlatform) => {
    engageManualFilters();
    if (imdbTop250Movies) {
      setImdbTop250Movies(false);
    }
    trackEvent({
      event: 'Preference_Selected',
      category: 'platform',
      option: platform,
    });
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    );
  };

  const handleContinue = () => {
    let finalPreferences: UserPreferences;

    if (selectedMood) {
      const moodFilters = getMoodFilters(selectedMood);
      const base: UserPreferences = {
        genres: [],
        ottPlatforms: [],
        languages: [],
        adultContent: false,
        releaseYear: null,
        highRatedOnly: false,
        imdbTop250Movies: false,
        releaseAfterMonths: null,
        moodPreset: null,
        moodIncludeGenres: [],
        moodExcludeGenres: [],
      };

      finalPreferences = {
        ...base,
        ...moodFilters,
      } as UserPreferences;
      console.log('=== SAVING MOOD PREFERENCES ===');
      console.log('Selected mood:', selectedMood);
      console.log('Final mood preferences:', finalPreferences);
    } else {
      finalPreferences = {
        genres: selectedGenres,
        ottPlatforms: selectedPlatforms,
        languages: selectedLanguages,
        adultContent,
        releaseYear,
        highRatedOnly,
        imdbTop250Movies: false,
        releaseAfterMonths: null,
        moodPreset: null,
        moodIncludeGenres: [],
        moodExcludeGenres: [],
      };
      console.log('=== SAVING MANUAL PREFERENCES ===');
      console.log('Full preferences being saved:', finalPreferences);
    }

    setPreferences(finalPreferences);
    const { selectedMode } = useStore.getState();
    if (selectedMode === 'single') {
      setCurrentScreen('swipe');
    } else if (selectedMode === 'dual') {
      setCurrentScreen('session');
    } else {
      setCurrentScreen('mode');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const activeTag = activeElement?.tagName.toLowerCase();

      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || activeElement?.hasAttribute('contenteditable')) {
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        handleContinue();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleContinue]);


  return (
    <>
      <div className="relative min-h-screen bg-[#050505] pb-28">
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(229, 9, 20, 0.08) 0%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,1) 100%)',
          }}
        />

        <div className={`relative z-10 mx-auto max-w-4xl transition-all duration-300 ${isFineTuneOpen ? 'px-4 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6' : 'px-4 pt-2 pb-4 sm:px-6 sm:pt-4 sm:pb-6'}`}>
          <header className={`mb-6 sm:mb-8 relative transition-all duration-300 ${isFineTuneOpen ? 'max-h-0 overflow-hidden opacity-0 mb-0' : ''}`}>
            <button
              onClick={() => setCurrentScreen('mode')}
              className="absolute left-0 top-0 text-gray-400 hover:text-red-400 transition-colors text-lg font-light"
            >
              ←
            </button>
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl" style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.1)' }}>
                Pick a mood?
              </h1>
              <p className="text-base font-light italic text-white/70 md:text-lg mt-1">
                We'll find the perfect movie for it.
              </p>
            </div>
          </header>

          <section
            className={`relative transition-all duration-200 ${
              isFineTuneOpen 
                ? 'max-h-0 overflow-hidden opacity-0 pointer-events-none' 
                : cardsBlurred 
                  ? 'scale-[0.98] blur-[1.5px]' 
                  : 'scale-100 blur-0'
            }`}
          >
            <div className="-mx-4 sm:-mx-6">
              <div
                ref={carouselRef}
                className={`flex snap-x snap-mandatory gap-3 overflow-x-auto pb-6 px-4 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 md:gap-6 ${peekGapClass}`}
                style={{ scrollPaddingInline: 'clamp(8vw, 15vw, 18vw)' }}
              >
                {MOOD_CARDS.map((card, index) => {
                  const isCentered = index === activeMoodIndex;
                  const isSelected = selectedMood === card.key;
                  const isInfoCard = card.isInfoCard || card.key === 'FineTuneInfo';
                  
                  // For info card, make it clickable to scroll to fine-tune section
                  const handleCardClick = () => {
                    if (isInfoCard) {
                      setIsFineTuneOpen(true);
                      setSelectedMood(null);
                      setHasManualAdjustments(true);
                      setCardsBlurred(true);
                      setFiltersBlurred(false);
                      setTimeout(() => {
                        // Find the fine-tune button container
                        const fineTuneContainer = document.querySelector('[data-fine-tune-container]') as HTMLElement;
                        if (fineTuneContainer) {
                          const elementTop = fineTuneContainer.getBoundingClientRect().top + window.pageYOffset;
                          window.scrollTo({ top: elementTop - 20, behavior: 'smooth' });
                        }
                      }, 100);
                    } else {
                      handleMoodSelect(card.key as MoodPreset);
                    }
                  };
                  
                  return (
                    <button
                      key={card.key}
                      type="button"
                      onClick={handleCardClick}
                      aria-pressed={!isInfoCard && selectedMood === card.key}
                      className={`group relative flex snap-center flex-col overflow-visible rounded-3xl p-3 transition-transform duration-200 ease-in-out active:scale-[0.99] md:p-4 ${
                        isCentered ? 'scale-100 opacity-100' : 'scale-[0.88] opacity-60'
                      }`}
                      style={{ scrollSnapAlign: 'center' }}
                    >
                      <div
                        data-mood-card
                        className={`relative flex aspect-[3/4] min-w-[220px] flex-col justify-end overflow-visible rounded-2xl border transition-all duration-200 ease-in-out ${cardWidthClass} ${
                          !isInfoCard && isSelected
                            ? 'border-red-600/80 shadow-[0_0_12px_rgba(255,0,0,0.55)]'
                            : 'border-white/10 hover:border-white/20 hover:shadow-[0_0_14px_rgba(255,0,0,0.2)]'
                        }`}
                      >
                        <img
                          src={card.image}
                          alt={`${card.title} artwork`}
                          className="absolute inset-0 h-full w-full rounded-2xl object-cover"
                        />
                        <div
                          className="absolute inset-0 rounded-2xl opacity-90"
                          style={{ background: card.gradient }}
                        />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/85 via-black/20 to-black/60" />
                        <div className="relative z-10 flex h-full w-full flex-col justify-end rounded-2xl p-6 text-left sm:p-7 md:p-8">
                          <h3 className="mb-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                            {card.title}
                          </h3>
                          <p className="text-sm text-gray-200/90 sm:text-base">
                            {card.subtitle}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-black via-black/60 to-transparent" />
          </section>

          <div className="mt-6" ref={filtersRef} data-fine-tune-container>
            <button
              type="button"
              onClick={handleFineTuneToggle}
              className={`group flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left transition ${
                isFineTuneOpen
                  ? 'border border-red-600/70 bg-red-600/10 shadow-[0_0_12px_rgba(255,0,0,0.35)]'
                  : 'border border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-white">Fine-tune manually</p>
                <p className="text-xs text-white/50">Adjust rating, platform, or language.</p>
              </div>
              <span className={`text-sm text-white/60 transition-transform ${isFineTuneOpen ? 'rotate-180' : ''}`}>
                ⌄
              </span>
            </button>

            <div
              className={`transform transition-all duration-500 ease-out overflow-hidden ${
                isFineTuneOpen
                  ? 'pointer-events-auto mt-6 max-h-[4000px] opacity-100 translate-y-0'
                  : 'pointer-events-none max-h-0 mt-0 opacity-0 -translate-y-4'
              }`}
            >
              <div className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_45px_-25px_rgba(0,0,0,0.6)] backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-light text-white">Show only 8+ Rated</h3>
                    <p className="text-sm text-white/50">Surface only highly rated movies (≥ 8.0)</p>
                  </div>
                  <button
                    onClick={() => {
                      engageManualFilters();
                      const newValue = !highRatedOnly;
                      trackEvent({
                        event: 'Preference_Selected',
                        category: 'highRatedOnly',
                        option: newValue ? 'enabled' : 'disabled',
                      });
                      setHighRatedOnly(newValue);
                    }}
                    className={`w-16 h-8 rounded-full transition-all duration-300 flex items-center px-1 ${
                      highRatedOnly
                        ? 'bg-red-600 shadow-[0_0_25px_rgba(229,9,20,0.45)]'
                        : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
                        highRatedOnly ? 'translate-x-7' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] transition">
                  <h3 className="text-xl font-light text-white mb-4">Streaming Platforms</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {OTT_PLATFORMS.map((platform) => (
                      <button
                        key={platform}
                        onClick={() => handlePlatformToggle(platform)}
                        className={`px-4 py-3 rounded-full text-sm font-light transition-all duration-300 ${
                          selectedPlatforms.includes(platform)
                            ? 'bg-red-600 text-white border border-red-500 shadow-[0_0_25px_rgba(229,9,20,0.45)]'
                            : 'bg-[#111111] border border-[#1a1a1a] text-gray-400 hover:border-red-500/50 hover:text-white'
                        }`}
                      >
                        {platform}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] transition">
                  <h3 className="text-xl font-light text-white mb-4">Language</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {(['English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Bengali'] as Language[]).map((language) => (
                      <button
                        key={language}
                        onClick={() => {
                          engageManualFilters();
                          if (imdbTop250Movies) {
                            setImdbTop250Movies(false);
                          }
                          setSelectedLanguages((prev) =>
                            prev.includes(language)
                              ? prev.filter((l) => l !== language)
                              : [...prev, language],
                          );
                        }}
                        className={`px-4 py-3 rounded-full text-sm font-light transition-all duration-300 ${
                          selectedLanguages.includes(language)
                            ? 'bg-red-600 text-white border border-red-500 shadow-[0_0_25px_rgba(229,9,20,0.45)]'
                            : 'bg-[#111111] border border-[#1a1a1a] text-gray-400 hover:border-red-500/50 hover:text-white'
                        }`}
                      >
                        {language}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] transition">
                  <h3 className="text-xl font-light text-white mb-4">Favorite Genres</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {GENRES.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => handleGenreToggle(genre)}
                        className={`px-4 py-3 rounded-full text-sm font-light transition-all duration-300 ${
                          selectedGenres.includes(genre)
                            ? 'bg-red-600 text-white border border-red-500 shadow-[0_0_25px_rgba(229,9,20,0.45)]'
                            : 'bg-[#111111] border border-[#1a1a1a] text-gray-400 hover:border-red-500/50 hover:text-white'
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] transition">
                  <h3 className="text-xl font-light text-white mb-4">Release Year</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { value: '2025' as const, label: '2025' },
                      { value: '2000s' as const, label: '2000s' },
                      { value: 'older' as const, label: 'Older' },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => {
                          engageManualFilters();
                          if (imdbTop250Movies) {
                            setImdbTop250Movies(false);
                          }
                          const newValue = releaseYear === value ? null : value;
                          trackEvent({
                            event: 'Preference_Selected',
                            category: 'releaseYear',
                            option: newValue ?? 'none',
                          });
                          setReleaseYear(newValue);
                        }}
                        className={`px-4 py-3 rounded-full text-sm font-light transition-all duration-300 ${
                          releaseYear === value
                            ? 'bg-red-600 text-white border border-red-500 shadow-[0_0_25px_rgba(229,9,20,0.45)]'
                            : 'bg-[#111111] border border-[#1a1a1a] text-gray-400 hover:border-red-500/50 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        engageManualFilters();
                        if (imdbTop250Movies) {
                          setImdbTop250Movies(false);
                        }
                        const recentThreshold = new Date().getFullYear() - 2;
                        const newValue = typeof releaseYear === 'number' ? null : recentThreshold;
                        trackEvent({
                          event: 'Preference_Selected',
                          category: 'releaseYear',
                          option: newValue ? `after_${newValue}` : 'none',
                        });
                        setReleaseYear(newValue);
                      }}
                      className={`px-4 py-3 rounded-full text-sm font-light transition-all duration-300 ${
                        typeof releaseYear === 'number'
                          ? 'bg-red-600 text-white border border-red-500 shadow-[0_0_25px_rgba(229,9,20,0.45)]'
                          : 'bg-[#111111] border border-[#1a1a1a] text-gray-400 hover:border-red-500/50 hover:text-white'
                      }`}
                    >
                      Recent (2 yrs)
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] transition">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-light text-white">Include Adult Content</h3>
                      <p className="text-sm text-gray-500">Show R-rated movies and mature content</p>
                    </div>
                    <button
                      onClick={() => {
                        engageManualFilters();
                        const newValue = !adultContent;
                        trackEvent({
                          event: 'Preference_Selected',
                          category: 'adultContent',
                          option: newValue ? 'enabled' : 'disabled',
                        });
                        setAdultContent(newValue);
                      }}
                      className={`w-16 h-8 rounded-full transition-all duration-300 flex items-center px-1 ${
                        adultContent
                          ? 'bg-red-600 shadow-[0_0_25px_rgba(229,9,20,0.45)]'
                          : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
                          adultContent ? 'translate-x-7' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/70 to-transparent px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur">
        <div className="mx-auto max-w-5xl">
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-lg font-medium transition-colors duration-300 ${
              canContinue
                ? 'border border-red-600/70 bg-red-600/10 text-white shadow-[0_0_12px_rgba(255,0,0,0.35)] hover:bg-red-600/20'
                : 'cursor-not-allowed border border-white/10 bg-white/[0.02] text-white/40'
            }`}
          >
            <span className="italic">Continue</span>
            <span className="text-base">→</span>
          </button>
        </div>
      </div>
    </>
  );
}
