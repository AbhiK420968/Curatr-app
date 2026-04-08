export { supabase } from './supabase';
export { authService } from './authService';
export { tripService } from './tripService';
export { default as api } from './api';
export * from './friendsService';

// ── AI Layer ───────────────────────────────────────────────────────────────────
// Gemini 1.5 Flash service (replaces Puter)
export {
    generateGeminiItinerary,
    generateItineraryStreaming,
    generateItinerary,
} from './geminiService';
export type { StreamingProgress } from './geminiService';

// ── Storage Layer ──────────────────────────────────────────────────────────────
export { saveProfile, loadProfile, clearProfile } from './profileStore';
export type { UserProfile } from './profileStore';

export { getCachedItinerary, setCachedItinerary, clearItineraryCache } from './itineraryCache';

export { logGeneration, logRegeneration, logRating, getSessions, clearSessions } from './sessionLog';
export type { SessionEntry } from './sessionLog';

export * from './integrationService';
