'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import Image from 'next/image';
import { trackEvent } from '@/lib/tracking';
import { motion } from 'framer-motion';

export default function HomeScreen() {
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [watchingMode, setWatchingMode] = useState<'alone' | 'together'>('alone');

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

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      {/* Hero Section - Optimized Whitespace */}
      <div className="relative min-h-[68vh] sm:min-h-[72vh] flex flex-col items-center justify-center px-4 sm:px-6 pt-10 sm:pt-12 pb-2 sm:pb-4">
        {/* Subtle gradient background with red accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-transparent" />
        <div 
          className="absolute top-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-red-500/5 rounded-full blur-3xl transition-transform duration-300"
          style={{ transform: `translateY(${scrollY * 0.3}px)` }}
        />
        <div 
          className="absolute bottom-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-red-500/5 rounded-full blur-3xl transition-transform duration-300"
          style={{ transform: `translateY(${-scrollY * 0.3}px)` }}
        />
        
        <div className="text-center max-w-2xl w-full relative z-10 -translate-y-6 sm:-translate-y-10">
          {/* Logo/Icon - Much Bigger */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={heroLoaded ? { opacity: 1, scale: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mb-2 sm:mb-3"
          >
            <Image
              src="/cinematch_title logo.png"
              alt="Cinematch Logo"
              width={400}
              height={400}
              className="w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 mx-auto"
              priority
            />
          </motion.div>

          {/* Title - Much Bigger */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={heroLoaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-light text-white mb-1 tracking-[-0.04em]"
            style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.1)' }}
          >
            <span className="inline-block tracking-[-0.04em]">Cine</span>
            <motion.span 
              className="text-red-500 inline-block tracking-[-0.045em] -ml-1"
              animate={heroLoaded ? { 
                textShadow: [
                  '0 0 20px rgba(239, 68, 68, 0.5)',
                  '0 0 30px rgba(239, 68, 68, 0.7)',
                  '0 0 20px rgba(239, 68, 68, 0.5)'
                ]
              } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              match
            </motion.span>
          </motion.h1>

          {/* Tagline - Matched to Preferences Screen Subheading */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={heroLoaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-xs sm:text-sm text-gray-400 font-light mb-3 sm:mb-4 tracking-[0.14em]"
          >
            Start. Match. Watch.
          </motion.p>

        </div>
      </div>

      {/* Explanation Section - Problem & Solution */}
      <div className="relative py-16 sm:py-20 px-4 sm:px-6 pb-32 sm:pb-40">
        <div className="max-w-4xl mx-auto">
          {/* Problem Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mb-16 sm:mb-20"
          >
              <div className="text-center mb-8 sm:mb-12">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-2xl sm:text-3xl md:text-4xl font-light text-white mb-4 sm:mb-6"
              >
                Problem
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-base sm:text-lg md:text-xl text-gray-300 font-light leading-relaxed max-w-2xl mx-auto"
              >
                Too many choices. Endless Scrolling.
                <br className="hidden sm:block" />
                <span className="text-gray-400">Especially when watching with others.</span>
              </motion.p>
            </div>

            {/* Problem Visual - Simple Cards */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-wrap justify-center gap-3 sm:gap-4"
            >
              {[
                { 
                  icon: (
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  ),
                  text: 'Too many choices' 
                },
                { 
                  icon: (
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  ),
                  text: 'Different tastes' 
                },
                { 
                  icon: (
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  ),
                  text: 'Decision fatigue' 
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                  className="bg-gray-900/50 border border-gray-800/50 rounded-2xl px-4 sm:px-6 py-4 sm:py-5 backdrop-blur-sm flex flex-col items-center gap-2 sm:gap-3"
                >
                  <div className="text-gray-400">{item.icon}</div>
                  <div className="text-xs sm:text-sm text-gray-400 font-light text-center">{item.text}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* How Cinematch Helps Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 sm:mb-12"
          >
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-white mb-3 sm:mb-4">
                How Cinematch Helps
              </h2>
            </div>

            {/* Toggle Section */}
            <div className="flex justify-center mb-8 sm:mb-12">
              <div className="bg-gray-900/50 border border-gray-800/50 rounded-full p-1 backdrop-blur-sm">
                <button
                  onClick={() => setWatchingMode('alone')}
                  className={`px-6 sm:px-8 py-2 sm:py-3 rounded-full text-sm sm:text-base font-light transition-all duration-300 ${
                    watchingMode === 'alone'
                      ? 'bg-red-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Watching Alone
                </button>
                <button
                  onClick={() => setWatchingMode('together')}
                  className={`px-6 sm:px-8 py-2 sm:py-3 rounded-full text-sm sm:text-base font-light transition-all duration-300 ${
                    watchingMode === 'together'
                      ? 'bg-red-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Watching Together
                </button>
              </div>
            </div>

            {/* Solution Section - Dynamic based on toggle */}
            <motion.div
              key={watchingMode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-8 sm:mb-12">
                <p className="text-base sm:text-lg md:text-xl text-gray-300 font-light leading-relaxed max-w-2xl mx-auto">
                  {watchingMode === 'alone' 
                    ? 'Set your preferences, swipe through movies, and find your perfect match. No more endless scrolling.'
                    : 'Both set your preferences. We combine them and show only movies you\'ll both enjoy. No more debates.'}
                </p>
              </div>

              {/* Solution Visual - Simple Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto">
                {(watchingMode === 'alone' ? [
                  { 
                    title: 'Set Your Preferences', 
                    desc: 'Choose languages, genres, OTT platforms, and more',
                    icon: (
                      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )
                  },
                  { 
                    title: 'Swipe Through Movies', 
                    desc: 'See personalized recommendations based on your taste',
                    icon: (
                      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                      </svg>
                    )
                  },
                  { 
                    title: 'Build Your Shortlist', 
                    desc: 'Save movies you want to watch later',
                    icon: (
                      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    )
                  }
                ] : [
                  { 
                    title: 'Both Set Preferences', 
                    desc: 'Each person chooses their languages, genres, and preferences',
                    icon: (
                      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    )
                  },
                  { 
                    title: 'We Find Matches', 
                    desc: 'We combine both preferences and show only mutual matches',
                    icon: (
                      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )
                  },
                  { 
                    title: 'Swipe Together', 
                    desc: 'Both see the same deck and swipe to find what you\'ll both enjoy',
                    icon: (
                      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    )
                  }
                ]).map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="bg-gradient-to-b from-gray-900/60 to-gray-900/30 border border-red-500/20 rounded-2xl p-6 sm:p-8 backdrop-blur-sm text-center flex flex-col items-center"
                  >
                    <div className="mb-4 sm:mb-6 text-gray-400">
                      {step.icon}
                    </div>
                    <h3 className="text-lg sm:text-xl font-medium text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400 font-light">
                      {step.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
      
      {/* Start Button - Fixed at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/95 to-transparent pb-6 sm:pb-8 pt-8 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={heroLoaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.button
              onClick={handleStartClick}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative w-full overflow-hidden rounded-[24px] text-lg sm:text-xl font-medium tracking-[0.02em] text-[#F5F5F5] py-3 px-8 border-2 border-[#E50914]/60 transition-all duration-300 touch-manipulation flex items-center justify-center"
            >
              <span className="absolute inset-0 rounded-[24px] bg-gradient-to-b from-[#111111] to-[#1a1a1a] transition-colors duration-300 group-hover:from-[#E50914] group-hover:to-[#B00610]" />
              <span className="absolute inset-0 rounded-[24px] shadow-[inset_0_1px_6px_rgba(0,0,0,0.6)] pointer-events-none" />
              <span className="relative z-10 flex items-center gap-1 transition-colors duration-300 group-hover:text-white">
                <span className="italic">Start</span>
                <span className="text-base transition-transform duration-300 group-hover:translate-x-1">→</span>
              </span>
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Minimal Footer - With padding for fixed button */}
      <motion.footer 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
        className="text-center py-6 sm:py-8 px-4 border-t border-white/5 pb-20 sm:pb-24"
      >
        <p className="text-xs sm:text-sm text-gray-500 font-light">
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
      </motion.footer>
    </div>
  );
}
