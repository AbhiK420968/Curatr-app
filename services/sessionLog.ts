/**
 * Session Log — Storage Layer
 *
 * Records generation events: timestamp, destination, model, duration, regenerations, ratings.
 * This data is how you improve the product over time without fine-tuning.
 *
 * Rolling log capped at MAX_ENTRIES to keep storage bounded.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_LOG_KEY = '@curatr:session_log';
const MAX_ENTRIES = 100;

export interface SessionEntry {
    id: string;
    type: 'generation' | 'regeneration' | 'rating' | 'cache_hit';
    destination: string;
    duration?: number;          // trip days
    model?: string;             // e.g. 'gemini-1.5-flash'
    generationMs?: number;      // ms taken to generate
    rating?: number;            // 1–5 stars
    fromCache?: boolean;
    timestamp: string;          // ISO
}

async function readLog(): Promise<SessionEntry[]> {
    try {
        const raw = await AsyncStorage.getItem(SESSION_LOG_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

async function writeLog(entries: SessionEntry[]): Promise<void> {
    try {
        // Keep only the most recent MAX_ENTRIES
        const trimmed = entries.slice(-MAX_ENTRIES);
        await AsyncStorage.setItem(SESSION_LOG_KEY, JSON.stringify(trimmed));
    } catch (err) {
        console.warn('[SessionLog] Write error:', err);
    }
}

function makeId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Log a new itinerary generation */
export async function logGeneration(params: {
    destination: string;
    duration: number;
    model: string;
    generationMs: number;
    fromCache?: boolean;
}): Promise<void> {
    const entries = await readLog();
    entries.push({
        id: makeId(),
        type: params.fromCache ? 'cache_hit' : 'generation',
        destination: params.destination,
        duration: params.duration,
        model: params.model,
        generationMs: params.generationMs,
        fromCache: params.fromCache ?? false,
        timestamp: new Date().toISOString(),
    });
    await writeLog(entries);
}

/** Log when user hits "Regenerate" */
export async function logRegeneration(destination: string): Promise<void> {
    const entries = await readLog();
    entries.push({
        id: makeId(),
        type: 'regeneration',
        destination,
        timestamp: new Date().toISOString(),
    });
    await writeLog(entries);
}

/** Log a user star rating for a generated itinerary */
export async function logRating(destination: string, rating: number): Promise<void> {
    const entries = await readLog();
    entries.push({
        id: makeId(),
        type: 'rating',
        destination,
        rating,
        timestamp: new Date().toISOString(),
    });
    await writeLog(entries);
}

/** Retrieve the full session log (for a debug/analytics screen) */
export async function getSessions(): Promise<SessionEntry[]> {
    return readLog();
}

/** Clear all session logs */
export async function clearSessions(): Promise<void> {
    try {
        await AsyncStorage.removeItem(SESSION_LOG_KEY);
    } catch (err) {
        console.warn('[SessionLog] Clear error:', err);
    }
}
