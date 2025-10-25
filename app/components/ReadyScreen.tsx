'use client';

import { useStore } from '@/lib/store';

export default function ReadyScreen() {
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);
  const session = useStore((state) => state.session);

  const startSwiping = () => {
    setCurrentScreen('swipe');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-white mb-4">Ready to Swipe!</h1>
        
        {session && (
          <div className="bg-gray-900 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Session Code</h2>
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-3xl font-mono font-bold text-red-500">{session.code}</p>
            </div>
            <p className="text-gray-400 text-sm">
              Share this code with your friend so they can join the same session
            </p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={startSwiping}
            className="w-full bg-red-600 text-white font-bold py-4 px-8 rounded-full hover:bg-red-700 transition-all text-lg"
          >
            Start Swiping Together! 🎬
          </button>
          
          <button
            onClick={() => setCurrentScreen('mode')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Mode Selection
          </button>
        </div>
      </div>
    </div>
  );
}
