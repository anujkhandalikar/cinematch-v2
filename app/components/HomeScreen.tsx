'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore, Movie } from '@/lib/store';
import Image from 'next/image';
import { trackEvent } from '@/lib/tracking';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { getCachedMovies } from '@/lib/movieCache';

// Movie Card Component with Swipe Functionality - Using same animations as SwipeDeck
const MovieCard = ({ movie, style, onSwipe, isActive }: { movie: Movie; style: React.CSSProperties; onSwipe: (direction: 'left' | 'right') => void; isActive: boolean }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [pendingSwipe, setPendingSwipe] = useState<'right' | 'left' | null>(null);
  const exitDirectionRef = useRef<'right' | 'left' | null>(null);
  
  // Framer Motion values for smooth animations (same as SwipeDeck)
  const x = useMotionValue(0);
  const rotate = useSpring(useTransform(x, [-300, 300], [-30, 30]), { stiffness: 300, damping: 30 });
  const cardOpacity = useMotionValue(1);
  
  // Calculate overlay opacity based on swipe distance (same as SwipeDeck)
  const likeOpacity = useTransform(x, [50, 100], [0, 1], { clamp: true });
  const nopeOpacity = useTransform(x, [-100, -50], [1, 0], { clamp: true });

  // Reset position when card becomes active
  useEffect(() => {
    if (isActive) {
      x.set(0);
      cardOpacity.set(1);
      setIsExiting(false);
      setPendingSwipe(null);
      exitDirectionRef.current = null;
      setIsDragging(false);
    }
  }, [isActive, x, cardOpacity]);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (isExiting || !isActive) return;
    
    setIsExiting(true);
    setPendingSwipe(direction);
    exitDirectionRef.current = direction;
    
    // Trigger swipe callback after a short delay to allow exit animation
    setTimeout(() => {
      onSwipe(direction);
    }, 100);
  };

  return (
    <motion.div
      className="absolute cursor-grab active:cursor-grabbing"
      style={{
        ...style,
        x,
        rotate,
        opacity: cardOpacity,
        zIndex: style.zIndex || 1,
      }}
      drag={isExiting || !isActive ? false : "x"}
      dragConstraints={{ left: -300, right: 300 }}
      dragElastic={0.2}
      whileDrag={{ cursor: 'grabbing' }}
      onDragStart={() => {
        if (isActive) setIsDragging(true);
      }}
      onDragEnd={(event, info) => {
        if (isExiting || !isActive) return;
        
        setIsDragging(false);
        const threshold = 100;
        
        // If drag didn't move much, just reset
        if (Math.abs(info.offset.x) < 10) {
          x.set(0);
          return;
        }
        
        if (info.offset.x > threshold) {
          // Swipe right - like
          handleSwipe('right');
        } else if (info.offset.x < -threshold) {
          // Swipe left - skip
          handleSwipe('left');
        } else {
          // Spring back to center
          x.set(0);
        }
      }}
      initial={{ opacity: 0, scale: 0.95, y: 20, rotate: 0 }}
      animate={{ 
        scale: 1, 
        y: 0,
        opacity: 1,
        rotate: 0
      }}
      exit={{ 
        opacity: 0, 
        scale: 0.8,
        x: exitDirectionRef.current === 'right' ? 1000 : exitDirectionRef.current === 'left' ? -1000 : 0,
        rotate: exitDirectionRef.current === 'right' ? 30 : exitDirectionRef.current === 'left' ? -30 : 0,
        transition: { duration: 0.3, ease: "easeInOut" }
      }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-72 h-96 rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-red-600/30">
        {/* Movie Poster */}
        <div className="h-3/5 bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center relative overflow-hidden">
          {movie.poster_url ? (
            <Image
              src={movie.poster_url}
              alt={movie.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="text-6xl">🎬</div>
          )}
        </div>
        <div className="h-2/5 p-4 bg-black/40 backdrop-blur">
          <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{movie.title}</h3>
          <div className="flex gap-2 mb-2 flex-wrap">
            {movie.genres.slice(0, 3).map((genre, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-red-500/30 rounded-full text-red-200">
                {genre}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">⭐ {movie.rating.toFixed(1)}</span>
            {movie.ott && movie.ott.length > 0 && (
              <span className="text-gray-400 text-sm">• {movie.ott[0]}</span>
            )}
          </div>
        </div>
      </div>
      
      {/* LIKE Overlay - same style as SwipeDeck */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        style={{
          opacity: likeOpacity,
          rotate,
        }}
      >
        <div
          className="text-6xl font-bold border-4 border-green-500 text-green-500 px-8 py-4 rounded-2xl"
          style={{
            textShadow: '0 0 20px rgba(34, 197, 94, 0.5)',
            WebkitTextStroke: '2px rgba(34, 197, 94, 0.8)',
          }}
        >
          LIKE
        </div>
      </motion.div>

      {/* NOPE Overlay - same style as SwipeDeck */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        style={{
          opacity: nopeOpacity,
          rotate,
        }}
      >
        <div
          className="text-6xl font-bold border-4 border-red-500 text-red-500 px-8 py-4 rounded-2xl"
          style={{
            textShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
            WebkitTextStroke: '2px rgba(239, 68, 68, 0.8)',
          }}
        >
          NOPE
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function HomeScreen() {
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [demoMovies, setDemoMovies] = useState<Movie[]>([]);

  // Track page visit
  useEffect(() => {
    trackEvent({ event: 'Landing_Page_Visited' });
  }, []);

  // Hero animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setHeroLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Fetch demo movies - ensure we get different movies
  useEffect(() => {
    const movies = getCachedMovies({
      genres: [],
      ottPlatforms: [],
      adultContent: false,
    });
    // Shuffle and take first 4 different movies for demo
    const shuffled = [...movies].sort(() => Math.random() - 0.5);
    const uniqueMovies: Movie[] = [];
    const seenTitles = new Set<string>();
    
    for (const movie of shuffled) {
      if (uniqueMovies.length >= 4) break;
      if (!seenTitles.has(movie.title)) {
        seenTitles.add(movie.title);
        uniqueMovies.push(movie);
      }
    }
    
    // If we don't have 4 unique, fill with any movies
    if (uniqueMovies.length < 4) {
      for (const movie of shuffled) {
        if (uniqueMovies.length >= 4) break;
        if (!uniqueMovies.find(m => m.id === movie.id)) {
          uniqueMovies.push(movie);
        }
      }
    }
    
    setDemoMovies(uniqueMovies.slice(0, 4));
  }, []);

  // Smooth scroll tracking for parallax effects
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleStartClick = useCallback(() => {
    trackEvent({ event: 'Start_Button_Clicked' });
    setCurrentScreen('mode');
  }, [setCurrentScreen]);

  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    // Wait for exit animation to complete before moving to next card
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev + 1) % demoMovies.length);
    }, 300);
  }, [demoMovies.length]);

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
        handleStartClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleStartClick]);

  // SVG Icons
  const SparklesIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );

  const ZapIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );

  const PlayIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const SettingsIcon = () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  );

  const HeartMatchIcon = () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );

  const VideoIcon = () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-red-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Sticky Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrollY > 50 ? 'bg-black/80 backdrop-blur-lg border-b border-red-600/30' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
            Cinematch
          </div>
          <button 
            onClick={handleStartClick}
            className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 rounded-full font-semibold hover:scale-105 transition-transform shadow-lg shadow-red-500/50"
          >
            Start Swiping
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-full border border-red-600/30 mb-6">
              <SparklesIcon />
              <span className="text-sm text-red-300">Join 200+ happy matchers</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
              Stop arguing about
              <span className="bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent"> what to watch</span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Swipe through movies like dating apps. Match with friends in real-time. 
              Watch something you'll both love in under 3 minutes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button 
                onClick={handleStartClick}
                className="group px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 rounded-full font-bold text-lg hover:scale-105 transition-all shadow-2xl shadow-red-500/50 flex items-center justify-center gap-2"
              >
                Start Swiping
                <ZapIcon />
              </button>
              <button className="px-8 py-4 bg-white/10 backdrop-blur rounded-full font-semibold text-lg hover:bg-white/20 transition-all border border-white/20 flex items-center justify-center gap-2">
                <PlayIcon />
                Watch Demo
              </button>
            </div>
          </div>
          
          {/* Interactive Card Demo - Using AnimatePresence like SwipeDeck */}
          <div className="relative h-[500px] flex items-center justify-center">
            <div className="text-sm text-red-300 absolute top-0 left-1/2 -translate-x-1/2 bg-red-500/20 px-4 py-2 rounded-full border border-red-600/30 z-50">
              👆 Try swiping the card!
            </div>
            
            {/* Next Card Preview (Stacking Effect) - same as SwipeDeck */}
            {demoMovies[currentCardIndex + 1] && (
              <div
                className="absolute w-72 h-96"
                style={{
                  transform: 'scale(0.95) rotate(0deg) translateX(0) translateY(0)',
                  opacity: 0.6,
                  zIndex: 0,
                  pointerEvents: 'none',
                  transformOrigin: 'center center',
                }}
              >
                <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-red-600/30">
                  {/* Movie Poster */}
                  <div className="h-3/5 bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center relative overflow-hidden">
                    {demoMovies[currentCardIndex + 1].poster_url ? (
                      <Image
                        src={demoMovies[currentCardIndex + 1].poster_url}
                        alt={demoMovies[currentCardIndex + 1].title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="text-6xl">🎬</div>
                    )}
                  </div>
                  <div className="h-2/5 p-4 bg-black/40 backdrop-blur">
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{demoMovies[currentCardIndex + 1].title}</h3>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {demoMovies[currentCardIndex + 1].genres.slice(0, 3).map((genre, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-red-500/30 rounded-full text-red-200">
                          {genre}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400">⭐ {demoMovies[currentCardIndex + 1].rating.toFixed(1)}</span>
                      {demoMovies[currentCardIndex + 1].ott && demoMovies[currentCardIndex + 1].ott.length > 0 && (
                        <span className="text-gray-400 text-sm">• {demoMovies[currentCardIndex + 1].ott[0]}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Current Card with AnimatePresence - same as SwipeDeck */}
            <AnimatePresence mode="wait" initial={false}>
              {demoMovies[currentCardIndex] && (
                <MovieCard
                  key={`${demoMovies[currentCardIndex].id}-${currentCardIndex}`}
                  movie={demoMovies[currentCardIndex]}
                  style={{
                    zIndex: 1,
                  } as React.CSSProperties}
                  onSwipe={handleSwipe}
                  isActive={true}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-4">
            From bored to watching in
            <span className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent"> 3 minutes</span>
          </h2>
          <p className="text-xl text-gray-400 text-center mb-16">No more endless scrolling. No more arguments.</p>
          
          <div className="grid grid-cols-3 gap-8">
            {[
              {
                icon: <SettingsIcon />,
                title: "Set Your Vibe",
                description: "Pick genres, platforms, and mood. Solo browsing or invite a friend for dual mode."
              },
              {
                icon: <HeartMatchIcon />,
                title: "Swipe & Match",
                description: "Right for yes, left for nope. In dual mode, see what you both love in real-time."
              },
              {
                icon: <VideoIcon />,
                title: "Watch Together",
                description: "Get your matched picks with ratings and streaming links. Hit play and enjoy."
              }
            ].map((step, i) => (
              <div
                key={i}
                className="relative group"
              >
                <div className="bg-gradient-to-br from-red-900/50 to-red-800/50 backdrop-blur-xl rounded-2xl p-8 border border-red-500/30 hover:border-red-500/60 transition-all hover:scale-105 h-full">
                  <div className="mb-4 text-red-400">{step.icon}</div>
                  <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="relative py-24 px-6 bg-black/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4">
              Loved by movie fans
              <span className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent"> everywhere</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Priya & Rahul", text: "Used to spend 45 minutes deciding. Now it takes 2. Game changer!" },
              { name: "Arjun", text: "Finally, an app that understands decision fatigue. The filters are perfect." },
              { name: "Kavya & Vikram", text: "We match on a movie every Friday night. Makes date night so much easier!" }
            ].map((testimonial, i) => (
              <div key={i} className="bg-gradient-to-br from-red-900/30 to-red-800/30 backdrop-blur-xl rounded-xl p-6 border border-red-500/20 hover:border-red-500/40 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-2xl">
                    {testimonial.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                  </div>
                </div>
                <p className="text-gray-300 leading-relaxed">"{testimonial.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-6xl font-bold mb-6">
            Ready to end the
            <span className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent"> "what should we watch?" </span>
            debate?
          </h2>
          <p className="text-xl text-gray-300 mb-12">Join thousands finding their perfect match every day</p>
          <button 
            onClick={handleStartClick}
            className="group px-12 py-5 bg-gradient-to-r from-red-600 to-red-700 rounded-full font-bold text-xl hover:scale-105 transition-all shadow-2xl shadow-red-500/50 inline-flex items-center gap-3"
          >
            Start Swiping Now
            <ZapIcon />
          </button>
          <p className="mt-6 text-sm text-gray-400">3 min setup</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-6 border-t border-red-500/20">
        <div className="max-w-7xl mx-auto text-center text-gray-400">
          <p>Powered by passion for cinema and frustration with indecision</p>
          <p className="mt-2 text-xs">
            powered by{' '}
            <a 
              href="https://bit.ly/3L1EXNX" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-gray-400 hover:text-red-500 transition-colors underline underline-offset-2"
            >
              ganesh's apm flipkart deck
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
