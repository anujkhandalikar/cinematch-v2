'use client';

import { useStore } from '@/lib/store';

export default function ModeSelectionScreen() {
  const setCurrentScreen = useStore((state) => state.setCurrentScreen);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Choose Your Mode
          </h1>
          <p className="text-xl text-gray-300">
            How would you like to discover movies?
          </p>
        </div>

        {/* Mode Options */}
        <div className="space-y-6 mb-12">
          {/* Single Mode */}
          <button
            onClick={() => setCurrentScreen('swipe')}
            className="w-full p-8 bg-gray-900 rounded-2xl text-left hover:bg-gray-800 transition-all group"
          >
            <div className="flex items-center gap-6">
              <div className="text-4xl">🎬</div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Solo Mode</h2>
                <p className="text-gray-400">
                  Discover movies on your own. Perfect for personal recommendations.
                </p>
                <div className="mt-3 text-sm text-gray-500">
                  • Personalized movie suggestions<br/>
                  • 3-minute swiping session<br/>
                  • Your personal shortlist
                </div>
              </div>
            </div>
          </button>

          {/* Dual Mode */}
          <button
            onClick={() => setCurrentScreen('session')}
            className="w-full p-8 bg-gray-900 rounded-2xl text-left hover:bg-gray-800 transition-all group"
          >
            <div className="flex items-center gap-6">
              <div className="text-4xl">👥</div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Dual Mode</h2>
                <p className="text-gray-400">
                  Match with a friend and find movies you both love.
                </p>
                <div className="mt-3 text-sm text-gray-500">
                  • Create or join a session<br/>
                  • Swipe together in real-time<br/>
                  • Discover mutual matches
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Back Button */}
        <button
          onClick={() => setCurrentScreen('preferences')}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Back to Preferences
        </button>
      </div>
    </div>
  );
}
