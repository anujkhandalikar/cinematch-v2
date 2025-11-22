'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { trackEvent } from '@/lib/tracking';

export default function ModeSelectionScreen() {
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);
  const setSelectedMode = useStore((state) => (state as any).setSelectedMode);
  const [selectedMode, setLocalSelectedMode] = useState<'single' | 'dual'>('single');

  // Initialize with solo mode preselected
  useEffect(() => {
    setSelectedMode && setSelectedMode('single');
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
            <div className="text-4xl mb-4">🎬</div>
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

        {/* Partner Mode */}
        <div 
          className={`flex-1 group relative bg-[#151515] rounded-2xl p-8 sm:p-10 border border-[#1f1f1f] transition-all duration-300 cursor-not-allowed opacity-60 grayscale ${
            selectedMode === 'dual' 
              ? 'border-red-500 shadow-[0_0_25px_rgba(255,0,0,0.25)]' 
              : ''
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1a1a1a] rounded-2xl"></div>
          <div className="relative z-10 text-center">
            <div className="text-4xl mb-4 text-gray-500">👥</div>
            <h2 className="text-xl sm:text-2xl font-light mb-3 text-gray-500">
              Partner Mode
            </h2>
            <p className="text-gray-600 text-sm">
              Swipe together, find matches
            </p>
            <p className="text-gray-500 text-xs sm:text-sm mt-3">
              🚧 Editing in progress — love takes time you know.
            </p>
          </div>
        </div>
        </div>
      </div>

      {/* Persistent Floating Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0a0a0a]/95 backdrop-blur-sm border-t border-[#1a1a1a] z-20">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleContinue}
            className="group relative w-full overflow-hidden rounded-[24px] text-lg sm:text-xl font-medium tracking-[0.02em] text-[#F5F5F5] py-3 px-8 border-2 border-[#E50914]/60 transition-all duration-300 touch-manipulation flex items-center justify-center"
          >
            <span className="absolute inset-0 rounded-[24px] bg-gradient-to-b from-[#111111] to-[#1a1a1a] transition-colors duration-300 group-hover:from-[#E50914] group-hover:to-[#B00610]" />
            <span className="absolute inset-0 rounded-[24px] shadow-[inset_0_1px_6px_rgba(0,0,0,0.6)] pointer-events-none" />
            <span className="relative z-10 flex items-center gap-1 transition-colors duration-300 group-hover:text-white">
              <span className="italic">Continue</span>
              <span className="text-base transition-transform duration-300 group-hover:translate-x-1">→</span>
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}
