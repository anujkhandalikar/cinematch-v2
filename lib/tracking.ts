// lib/tracking.ts
import mixpanel from 'mixpanel-browser';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

// Initialize Mixpanel (call this once in your app)
export function initTracking(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (isInitialized) {
    return Promise.resolve();
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise((resolve) => {
    const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
    if (token) {
      try {
        mixpanel.init(token, {
          debug: process.env.NODE_ENV === 'development',
          track_pageview: false, // We'll track pageviews manually
          persistence: 'localStorage',
          loaded: (mixpanelInstance) => {
            isInitialized = true;
            if (process.env.NODE_ENV === 'development') {
              console.log('Mixpanel initialized');
            }
            resolve();
          }
        });
        // Set a timeout fallback in case loaded callback doesn't fire
        setTimeout(() => {
          if (!isInitialized) {
            isInitialized = true;
            resolve();
          }
        }, 100);
      } catch (error) {
        console.error('Failed to initialize Mixpanel:', error);
        resolve();
      }
    } else {
      console.warn('Mixpanel token not found');
      resolve();
    }
  });

  return initPromise;
    }3456787654321234
type TrackingEvent = 
  | 'Landing_Page_Visited'
  | 'Preferences_Page_Visited'
  | 'Preferences_Manual_Reveal'
  | 'Deck_Page_Visited'
  | 'Shortlist_Page_Visited'
  | 'Start_Button_Clicked'
  | 'Solo_Mode_Selected'
  | 'Partner_Mode_Selected'
  | 'Preference_Selected'
  | 'Mood_Selected'
  | 'Deck_Loaded'
  | 'Movie_Swiped'
  | 'Shortlist_Opened'
  | 'My_Pick_Viewed'
  | 'Share_Clicked'
  | 'Session_Completed';

interface TrackingData {
  event: TrackingEvent;
  category?: string;
  option?: string;
  direction?: 'left' | 'right';
  title?: string;
  [key: string]: any;
}

export function trackEvent(data: TrackingData) {
  if (typeof window === 'undefined') return;
  
  // Ensure Mixpanel is initialized before tracking
  if (!isInitialized) {
    initTracking().then(() => {
      // Retry tracking after initialization
      if (isInitialized && process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
        try {
          const { event, ...properties } = data;
          mixpanel.track(event, properties);
          if (process.env.NODE_ENV === 'development') {
            console.log('[TRACKING]', event, properties);
          }
        } catch (error) {
          console.error('Failed to track event:', error);
        }
      } else {
        // No token, just log in dev mode
        if (process.env.NODE_ENV === 'development') {
          console.log('[TRACKING] (not sent - no token)', data.event, data);
        }
      }
    });
    return;
  }
  
  // Mixpanel is initialized, track immediately
  try {
    const { event, ...properties } = data;
    
    // Check if Mixpanel is actually ready and has the necessary internal state
    if (mixpanel && 
        typeof mixpanel.track === 'function' && 
        mixpanel.get_config && 
        mixpanel.get_config()) {
      mixpanel.track(event, properties);
      
      // Also log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[TRACKING]', event, properties);
      }
    } else {
      // Mixpanel not fully ready, queue for later
      if (process.env.NODE_ENV === 'development') {
        console.log('[TRACKING] (Mixpanel not ready, will retry)', data.event, data);
      }
      // Retry after a short delay
      setTimeout(() => {
        if (mixpanel && typeof mixpanel.track === 'function') {
          try {
            mixpanel.track(event, properties);
          } catch (err) {
            console.error('Failed to track event on retry:', err);
          }
        }
      }, 200);
    }
  } catch (error) {
    console.error('Failed to track event:', error);
    if (process.env.NODE_ENV === 'development') {
      console.log('[TRACKING] (failed)', data.event, data);
    }
  }
}

