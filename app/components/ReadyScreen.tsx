'use client';

import { useStore } from '@/lib/store';

export default function ReadyScreen() {
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-white mb-4">Ready Screen</h1>
        <p className="text-gray-300 mb-8">Ready functionality coming soon!</p>
        <button
          onClick={() => setCurrentScreen('mode')}
          className="bg-red-600 text-white font-bold py-3 px-6 rounded-full hover:bg-red-700 transition-all"
        >
          Back to Mode Selection
        </button>
      </div>
    </div>
  );
}
