/**
 * Itinerary Cache — Storage Layer
 *
 * Caches generated itineraries keyed by a hash of: destination + duration + profile fields.
 * If the same user requests the same trip again within TTL, return instantly without an API call.
 *
 * Data flow: generateGeminiItinerary() → cache check → hit? return cached : call API → store result
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Itinerary, ItineraryPreferences } from '@/types/itinerary';

const CACHE_PREFIX = '@curatr:itinerary_cache:';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate a deterministic cache key from preferences.
 * Uses a simple string hash — no crypto dependency needed.
 */
export function buildCacheKey(prefs: ItineraryPreferences): string {
    const raw = [
        prefs.destination.toLowerCase().trim(),
        String(prefs.duration),
        prefs.budget,
        prefs.travelStyle,
        (prefs.interests || []).slice().sort().join(','),
        String(prefs.groupSize ?? 1),
    ].join('|');

    // Simple djb2 hash
    let hash = 5381;
    for (let i = 0; i < raw.length; i++) {
        hash = ((hash << 5) + hash) ^ raw.charCodeAt(i);
        hash = hash >>> 0; // keep unsigned 32-bit
    }
    return `${CACHE_PREFIX}${hash.toString(16)}`;
}

interface CacheEntry {
    itinerary: Itinerary;
    cachedAt: number; // epoch ms
}

/**
 * Retrieve a cached itinerary. Returns null on cache miss, expiry, or error.
 */
export async function getCachedItinerary(prefs: ItineraryPreferences): Promise<Itinerary | null> {
    try {
        const key = buildCacheKey(prefs);
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return null;

        const entry: CacheEntry = JSON.parse(raw);
        const age = Date.now() - entry.cachedAt;
        if (age > CACHE_TTL_MS) {
            // Expired — evict silently
            AsyncStorage.removeItem(key).catch(() => {});
            return null;
        }

        console.log('[ItineraryCache] Cache HIT for:', prefs.destination);
        return entry.itinerary;
    } catch (err) {
        console.warn('[ItineraryCache] Read error:', err);
        return null;
    }
}

/**
 * Store a generated itinerary in the cache.
 */
export async function setCachedItinerary(
    prefs: ItineraryPreferences,
    itinerary: Itinerary
): Promise<void> {
    try {
        const key = buildCacheKey(prefs);
        const entry: CacheEntry = { itinerary, cachedAt: Date.now() };
        await AsyncStorage.setItem(key, JSON.stringify(entry));
        console.log('[ItineraryCache] Cached itinerary for:', prefs.destination);
    } catch (err) {
        console.warn('[ItineraryCache] Write error:', err);
    }
}

/**
 * Clear all cached itineraries (e.g. from a settings screen).
 */
export async function clearItineraryCache(): Promise<void> {
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        const cacheKeys = allKeys.filter(k => k.startsWith(CACHE_PREFIX));
        if (cacheKeys.length > 0) {
            await AsyncStorage.multiRemove(cacheKeys);
        }
        console.log('[ItineraryCache] Cleared', cacheKeys.length, 'entries');
    } catch (err) {
        console.warn('[ItineraryCache] Clear error:', err);
    }
}
