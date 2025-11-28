'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { trackEvent } from '@/lib/tracking';

export default function ModeSelectionScreen() {
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);
  const setSelectedMode = useStore((state) => (state as any).setSelectedMode);
  const [selectedMode, setLocalSelectedMode] = useState<'single' | 'dual'>('dual');

  // Initialize with partner mode preselected
  useEffect(() => {
    setSelectedMode && setSelectedMode('dual');
  }, [setSelectedMode]);

  const handleModeSelect = (mode: 'single' | 'dual') => {
    setLocalSelectedMode(mode);
    setSelectedMode && setSelectedMode(mode);
    if (mode === 'single') {
      trackEvent({ event: 'Solo_Mode_Selected' });
    } else {
      trackEvent({ event: 'Partner_Mode_Selected' });
    }
  };

  const handleContinue = useCallback(() => {
    setCurrentScreen('preferences');
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
        handleContinue();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleContinue]);

  // SVG Icons
  const PartnerModeIcon = () => (
    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );

  const SoloModeIcon = () => (
    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );

  return (
    <main className="min-h-screen bg-[#0a0a0a] pb-32 relative">
      {/* Subtle radial gradient for depth */}
      <div 
        className="fixed inset-0 pointer-events-none z-0" 
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(239, 68, 68, 0.03) 0%, transparent 50%)',
        }}
      />
      <div className="max-w-4xl mx-auto p-4 sm:p-6 relative z-10">
        {/* Back Button */}
        <button 
          onClick={() => setCurrentScreen('home')}
          className="mb-6 text-gray-500 hover:text-red-400 transition-colors text-sm font-light"
        >
          ← Back
        </button>

        {/* Header */}
        <div className="text-center mb-10 sm:mb-12 pt-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-white tracking-tight mb-3" style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.1)' }}>
            Choose Your Mode
          </h1>
          <p className="text-gray-400 text-sm sm:text-base font-light italic">
            Choose between 'me time' and 'we time.'
          </p>
        </div>

        {/* Mode Cards - Stack vertically on mobile, horizontal on desktop */}
        <div className="flex flex-col sm:flex-col md:flex-row gap-4 sm:gap-6 md:gap-8 w-full">
        {/* Partner Mode */}
        <div 
          onClick={() => handleModeSelect('dual')}
          className={`flex-1 group relative bg-[#121212] rounded-2xl p-8 sm:p-10 border transition-all duration-300 cursor-pointer ${
            selectedMode === 'dual' 
              ? 'border-red-500 shadow-[0_0_25px_rgba(255,0,0,0.25)]' 
              : 'border-transparent hover:border-red-500 hover:shadow-[0_0_25px_rgba(255,0,0,0.15)]'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1a1a1a] rounded-2xl"></div>
          <div className="relative z-10 text-center">
            <div className={`mb-4 transition-colors ${
              selectedMode === 'dual' ? 'text-red-400' : 'text-gray-400 group-hover:text-red-400'
            }`}>
              <PartnerModeIcon />
            </div>
            <h2 className={`text-xl sm:text-2xl font-light mb-3 transition-colors ${
              selectedMode === 'dual' ? 'text-red-400' : 'text-white group-hover:text-red-400'
            }`}>
              Partner Mode
            </h2>
            <p className="text-gray-400 text-sm">
              Swipe together, find matches
            </p>
          </div>
        </div>

        {/* Solo Mode */}
        <div 
          onClick={() => handleModeSelect('single')}
          className={`flex-1 group relative bg-[#121212] rounded-2xl p-8 sm:p-10 border transition-all duration-300 cursor-pointer ${
            selectedMode === 'single' 
              ? 'border-red-500 shadow-[0_0_25px_rgba(255,0,0,0.25)]' 
              : 'border-transparent hover:border-red-500 hover:shadow-[0_0_25px_rgba(255,0,0,0.15)]'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1a1a1a] rounded-2xl"></div>
          <div className="relative z-10 text-center">
            <div className={`mb-4 transition-colors ${
              selectedMode === 'single' ? 'text-red-400' : 'text-gray-400 group-hover:text-red-400'
            }`}>
              <SoloModeIcon />
            </div>
            <h2 className={`text-xl sm:text-2xl font-light mb-3 transition-colors ${
              selectedMode === 'single' ? 'text-red-400' : 'text-white group-hover:text-red-400'
            }`}>
              Solo Mode
            </h2>
            <p className="text-gray-400 text-sm">
              Quick, personal picks
            </p>
          </div>
        </div>
        </div>
      </div>

      {/* Persistent Floating Continue Button */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/70 to-transparent px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur">
        <div className="mx-auto max-w-5xl">
          <button
            onClick={handleContinue}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-lg font-medium transition-colors duration-300 border border-red-600/70 bg-red-600/10 text-white shadow-[0_0_12px_rgba(255,0,0,0.35)] hover:bg-red-600/20"
          >
            <span className="italic">Continue</span>
            <span className="text-base">→</span>
          </button>
        </div>
      </div>
    </main>
  );
}
