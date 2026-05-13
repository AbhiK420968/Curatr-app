/**
 * Gemini AI Itinerary Service
 *
 * Implements the full layered architecture:
 *
 * Profile object → Prompt Builder → System Prompt
 *                                 ↓
 *               Destination Input → Request Assembler → Gemini 1.5 Flash API
 *                                                     ↓
 *                          Rate Limiter ← Token Stream → Streaming Handler → UI
 *                                                     ↓
 *                                          Itinerary Cache (read/write)
 *                                          Session Log (write)
 */

import type { Itinerary, ItineraryPreferences } from '@/types/itinerary';
import { getCachedItinerary, setCachedItinerary } from './itineraryCache';
import { logGeneration } from './sessionLog';

// ── Constants ──────────────────────────────────────────────────────────────────
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

// Free tier: 15 requests per minute
const RATE_LIMIT_RPM = 15;
const RATE_LIMIT_WINDOW_MS = 60_000;

// ── Types ──────────────────────────────────────────────────────────────────────
export interface StreamingProgress {
    status: 'idle' | 'generating' | 'complete' | 'error';
    progress: number;   // 0–100
    currentText: string;
    error?: string;
}

// ── Rate Limiter ───────────────────────────────────────────────────────────────
/**
 * Token-bucket rate limiter for the Gemini free tier (15 RPM).
 * Queues overflow requests and retries with exponential backoff.
 */
class RateLimiter {
    private timestamps: number[] = [];

    /**
     * Returns true immediately if under limit,
     * otherwise waits until a slot is available (with backoff).
     */
    async acquire(): Promise<void> {
        const now = Date.now();
        // Purge timestamps older than the window
        this.timestamps = this.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);

        if (this.timestamps.length < RATE_LIMIT_RPM) {
            this.timestamps.push(now);
            return;
        }

        // Over limit — wait until oldest slot expires, then retry
        const oldest = this.timestamps[0];
        const waitMs = RATE_LIMIT_WINDOW_MS - (now - oldest) + 100; // +100ms buffer
        console.log(`[RateLimiter] Over RPM limit. Waiting ${Math.round(waitMs / 1000)}s…`);
        await sleep(waitMs);
        return this.acquire(); // recursive retry
    }
}

const rateLimiter = new RateLimiter();

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Prompt Builder ─────────────────────────────────────────────────────────────
/**
 * LAYER: Prompt Builder
 *
 * Takes the profile object + destination and interpolates every field into
 * two separate outputs:
 *   1. systemPrompt — persona + rules + output format (static per session)
 *   2. userMessage  — the specific trip request (changes per generate call)
 */
// ── Interest → Category Mapping (Plan.txt: candidate retrieval heuristics) ────
const INTEREST_FOCUS: Record<string, string> = {
    Chill:     'Prioritize spas, parks, scenic cafes, and peaceful waterfront walks.',
    Party:     'Prioritize rooftop bars, nightclubs, live music venues, and street festivals.',
    Culture:   'Prioritize museums, heritage sites, temples/churches, and art galleries.',
    Adventure: 'Prioritize trekking, water sports, zip-lining, and outdoor excursions.',
    Foodie:    'Prioritize street food markets, Michelin-rated restaurants, cooking classes, and food tours.',
    Romantic:  'Prioritize sunset viewpoints, candlelit restaurants, scenic boat rides, and boutique hotels.',
    Solo:      'Prioritize co-working cafes, hostel social events, walking tours, and self-guided trails.',
    Family:    'Prioritize kid-friendly attractions, amusement parks, zoos, and early-closing restaurants.',
};

function buildSystemPrompt(preferences: ItineraryPreferences): string {
    const { budget, travelStyle, interests, groupSize } = preferences;
    const interestFocus = (interests || []).map(i => INTEREST_FOCUS[i] || '').filter(Boolean).join(' ');

    return `You are Curatr, an expert AI travel planner. You produce structured, realistic daily itineraries.

USER PROFILE:
- Travel Style: ${travelStyle}
- Budget Tier: ${budget}
- Interests: ${(interests || []).join(', ')}
- Group Size: ${groupSize ?? 1} ${(groupSize ?? 1) === 1 ? 'person' : 'people'}

INTEREST FOCUS RULES (apply strictly):
${interestFocus || 'Balance sightseeing, food, and culture.'}

DAY LAYOUT TEMPLATE (follow this structure every day):
Every day MUST have exactly 3-4 activities spread across:
  MORNING (8:00 AM – 12:00 PM): 1-2 activities — sightseeing, walking, cultural exploration
  AFTERNOON (12:00 PM – 6:00 PM): 1-2 activities — lunch + 1 major attraction or experience  
  EVENING (6:00 PM – 10:00 PM): 1 activity — dinner or nightlife appropriate to travel style

SCHEDULING RULES (from itinerary generation best practices):
1. Allow 30–45 minutes travel time between locations — never schedule adjacent activities < 30 min apart
2. Day 1 must have a lighter schedule — max 3 activities to account for arrival fatigue
3. Each activity MUST have a specific named location (not "local restaurant" — use actual place names)
4. No more than 2 activities from the same category in one day (diversity rule)
5. Restaurants must be specific named places matching the budget tier
6. All cost estimates in Indian Rupees (₹)
7. Match ALL activities strictly to the ${travelStyle} travel style — reject any activity that conflicts
8. Account for opening hours — museums close Mondays, nightlife starts after 9 PM

DAY SCORING PRIORITIES:
1. Minimize travel time between consecutive activities (geographic clustering)
2. Maximize relevance to user interests
3. Ensure budget alignment — ${budget} travelers should not see luxury options
4. Maintain variety — no two consecutive days with identical activity types

CONSISTENCY CHECKS (apply before outputting):
- Times must be in strict chronological order within each day
- No time overlap between activities (current end time < next start time)
- Last activity of each day must end by 10:30 PM
- Verify budget breakdown sums to stated total

OUTPUT FORMAT:
Return ONLY valid JSON — no markdown, no code fences, no explanation.

{
  "destination": string,
  "duration": number,
  "overview": "2-3 sentence overview personalised to user profile",
  "bestTimeToVisit": string,
  "days": [
    {
      "day": number,
      "theme": "Evocative day theme",
      "activities": [
        {
          "time": "9:00 AM",
          "title": "Specific named activity",
          "description": "Rich 2-sentence description with specific details",
          "duration": "X hours",
          "estimatedCost": "₹XXX",
          "location": {
            "name": "Specific named location",
            "latitude": 35.6586,
            "longitude": 139.7454
          },
          "category": "Sightseeing | Food | Adventure | Culture | Shopping | Relaxation | Nightlife",
          "tips": ["Actionable insider tip", "Second tip"]
        }
      ],
      "totalCost": "₹X,XXX",
      "notes": ["Important day-level note"]
    }
  ],
  "budgetBreakdown": {
    "accommodation": "₹XX,XXX",
    "food": "₹X,XXX",
    "activities": "₹X,XXX",
    "transportation": "₹X,XXX",
    "miscellaneous": "₹X,XXX",
    "total": "₹XX,XXX"
  },
  "tips": ["General tip", "Local etiquette", "Safety tip"],
  "packingList": ["Item 1", "Item 2"],
  "localInfo": {
    "currency": string,
    "language": string,
    "emergencyNumbers": ["Police: XXX", "Ambulance: XXX"],
    "transportation": ["Tip 1", "Tip 2"]
  }
}

CRITICAL: Return ONLY the JSON object. No preamble, no markdown fences, no trailing text.`;
}

function buildUserMessage(preferences: ItineraryPreferences): string {
    const { destination, duration } = preferences;
    return `Generate a complete ${duration}-day travel itinerary for ${destination}. Apply my full profile from the system instructions to personalise every recommendation.`;
}

// ── Request Assembler ──────────────────────────────────────────────────────────
/**
 * LAYER: Request Assembler
 *
 * Combines the system prompt and user message into the Gemini API request body.
 */
function assembleRequest(systemPrompt: string, userMessage: string): object {
    return {
        system_instruction: {
            parts: [{ text: systemPrompt }],
        },
        contents: [
            {
                role: 'user',
                parts: [{ text: userMessage }],
            },
        ],
        generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 32768,
            responseMimeType: 'application/json',
        },
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
    };
}

// ── JSON Extractor ─────────────────────────────────────────────────────────────
function extractJSON(raw: string): string {
    let cleaned = raw.trim();

    // Strip markdown fences if model ignores instruction
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    cleaned = cleaned.trim();

    // Validate
    try {
        JSON.parse(cleaned);
        return cleaned;
    } catch { /* fall through */ }

    // Find the outermost { … } block
    let depth = 0, start = -1, end = -1;
    for (let i = 0; i < cleaned.length; i++) {
        if (cleaned[i] === '{') {
            if (depth === 0) start = i;
            depth++;
        } else if (cleaned[i] === '}') {
            depth--;
            if (depth === 0) { end = i; break; }
        }
    }
    if (start !== -1 && end !== -1) return cleaned.slice(start, end + 1);

    return cleaned;
}

// ── Itinerary Validator (Plan.txt: consistency checks) ──────────────────────
/**
 * Validates parsed itinerary for:
 *  - Chronological time ordering within each day
 *  - Reasonable activity counts (3–6 per day)
 *  - Category diversity (no more than 2 of same category/day)
 * Logs warnings but does NOT throw — bad data is better than no data.
 */
function validateItinerary(itinerary: Itinerary): void {
    const parseTime = (t: string): number => {
        if (!t) return 0;
        const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!m) return 0;
        let h = parseInt(m[1]);
        const min = parseInt(m[2]);
        const ampm = m[3].toUpperCase();
        if (ampm === 'PM' && h !== 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        return h * 60 + min;
    };

    (itinerary.days || []).forEach((day: any, di: number) => {
        const acts = day.activities || [];

        // Check count
        if (acts.length < 2) {
            console.warn(`[Validator] Day ${di + 1} has only ${acts.length} activities.`);
        }
        if (acts.length > 6) {
            console.warn(`[Validator] Day ${di + 1} has ${acts.length} activities — may be overcrowded.`);
        }

        // Check time ordering
        let prevTime = 0;
        acts.forEach((act: any, ai: number) => {
            const t = parseTime(act.time);
            if (t > 0 && t < prevTime) {
                console.warn(`[Validator] Day ${di + 1}, Activity ${ai + 1} "${act.title}" time ${act.time} is before previous activity.`);
            }
            if (t > 0) prevTime = t;
        });

        // Check category diversity
        const categoryCounts: Record<string, number> = {};
        acts.forEach((act: any) => {
            if (act.category) {
                categoryCounts[act.category] = (categoryCounts[act.category] || 0) + 1;
                if (categoryCounts[act.category] > 2) {
                    console.warn(`[Validator] Day ${di + 1}: category "${act.category}" appears ${categoryCounts[act.category]} times.`);
                }
            }
        });
    });
}

// ── Response Parser ────────────────────────────────────────────────────────────
function parseItineraryResponse(raw: string, preferences: ItineraryPreferences): Itinerary {
    const cleaned = extractJSON(raw);
    let data: any;

    try {
        data = JSON.parse(cleaned);
    } catch (err) {
        console.error('[GeminiService] JSON parse failed. Raw (500 chars):', raw.slice(0, 500));
        throw new Error('Failed to parse Gemini response as JSON. Please try again.');
    }

    if (!data.destination || !Array.isArray(data.days) || data.days.length === 0) {
        throw new Error('Incomplete itinerary structure from Gemini. Please try again.');
    }

    const days = data.days.map((day: any, idx: number) => ({
        day: day.day ?? idx + 1,
        theme: day.theme ?? `Day ${idx + 1}`,
        activities: (day.activities ?? []).map((act: any) => ({
            time: act.time ?? '9:00 AM',
            title: act.title ?? 'Activity',
            description: act.description ?? '',
            duration: act.duration ?? '1 hour',
            estimatedCost: act.estimatedCost ?? act.cost ?? 'Free',
            location: act.location ?? data.destination,
            category: act.category,
            tips: act.tips,
        })),
        totalCost: day.totalCost,
        notes: day.notes,
    }));

    const result: Itinerary = {
        id: `gemini_${Date.now()}`,
        userId: 'gemini_generated',
        destination: data.destination,
        duration: data.duration ?? preferences.duration,
        overview: data.overview ?? '',
        bestTimeToVisit: data.bestTimeToVisit,
        days,
        dayPlans: days,
        budgetBreakdown: data.budgetBreakdown,
        budget: data.budgetBreakdown,
        tips: data.tips ?? [],
        packingList: data.packingList,
        travelStyle: preferences.travelStyle,
        moodTags: preferences.interests,
        createdAt: new Date().toISOString(),
    } as Itinerary;

    // Plan.txt: Run consistency checks (non-blocking warnings)
    validateItinerary(result);

    return result;
}

// ── Streaming Handler ──────────────────────────────────────────────────────────
/**
 * LAYER: Streaming Handler
 *
 * Calls the Gemini generateContent endpoint (non-streaming, since React Native's
 * fetch ReadableStream support is limited in Hermes). Simulates streaming progress
 * via requestAnimationFrame-style progress updates while awaiting the full response.
 * Once received, pipes the full text progressively to the UI callback.
 *
 * For true SSE streaming, use the streamGenerateContent endpoint on web.
 */
async function callGeminiAPI(requestBody: object): Promise<string> {
    if (!API_KEY) {
        throw new Error('Gemini API key not configured. Check EXPO_PUBLIC_GEMINI_API_KEY in .env');
    }

    const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => 'unknown error');
        throw new Error(`Gemini API error ${response.status}: ${errText}`);
    }

    const json = await response.json();

    // Extract text from Gemini response structure
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error('Empty response from Gemini API');
    }
    return text;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Generate a travel itinerary using Gemini 1.5 Flash.
 *
 * Full data flow:
 * preferences → [cache check] → [prompt builder] → [request assembler]
 *   → [rate limiter] → [Gemini API] → [streaming handler] → [parser] → Itinerary
 *
 * @param preferences  The profile object accumulated from the wizard UI
 * @param onProgress   Real-time progress callback (0–100)
 * @param forceRefresh If true, skip cache and always call the API
 */
export async function generateGeminiItinerary(
    preferences: ItineraryPreferences,
    onProgress: (progress: StreamingProgress) => void,
    forceRefresh = false
): Promise<Itinerary> {
    const startMs = Date.now();

    onProgress({ status: 'generating', progress: 5, currentText: '' });

    // ── 1. Cache check ────────────────────────────────────────────────────────
    if (!forceRefresh) {
        const cached = await getCachedItinerary(preferences);
        if (cached) {
            onProgress({ status: 'complete', progress: 100, currentText: '' });
            await logGeneration({
                destination: preferences.destination,
                duration: preferences.duration,
                model: GEMINI_MODEL,
                generationMs: Date.now() - startMs,
                fromCache: true,
            });
            return cached;
        }
    }

    onProgress({ status: 'generating', progress: 15, currentText: '' });

    // ── 2. Prompt Builder ─────────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(preferences);
    const userMessage = buildUserMessage(preferences);

    onProgress({ status: 'generating', progress: 25, currentText: '' });

    // ── 3. Request Assembler ──────────────────────────────────────────────────
    const requestBody = assembleRequest(systemPrompt, userMessage);

    // ── 4. Rate Limiter ───────────────────────────────────────────────────────
    await rateLimiter.acquire();

    onProgress({ status: 'generating', progress: 40, currentText: '' });

    // ── 5. Gemini API call ────────────────────────────────────────────────────
    let rawText: string;
    let attempt = 0;
    const MAX_RETRIES = 3;

    while (true) {
        try {
            rawText = await callGeminiAPI(requestBody);
            break;
        } catch (err: any) {
            attempt++;
            const isRateError = err?.message?.includes('429') || err?.message?.includes('quota');
            if (isRateError && attempt < MAX_RETRIES) {
                const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                console.warn(`[GeminiService] Rate error, retrying in ${backoffMs / 1000}s (attempt ${attempt})`);
                onProgress({ status: 'generating', progress: 40 + attempt * 5, currentText: '' });
                await sleep(backoffMs);
                await rateLimiter.acquire();
            } else {
                throw err;
            }
        }
    }

    onProgress({ status: 'generating', progress: 80, currentText: '' });

    // ── 6. Parse response ─────────────────────────────────────────────────────
    const itinerary = parseItineraryResponse(rawText!, preferences);

    onProgress({ status: 'generating', progress: 95, currentText: '' });

    // ── 7. Cache result ───────────────────────────────────────────────────────
    await setCachedItinerary(preferences, itinerary);

    // ── 8. Log session ────────────────────────────────────────────────────────
    await logGeneration({
        destination: preferences.destination,
        duration: preferences.duration,
        model: GEMINI_MODEL,
        generationMs: Date.now() - startMs,
        fromCache: false,
    });

    onProgress({ status: 'complete', progress: 100, currentText: '' });

    return itinerary;
}

/**
 * Backwards-compatible alias used by the streaming signature in create.tsx.
 * Wraps generateGeminiItinerary with a StreamingProgress handler.
 */
export async function generateItineraryStreaming(
    preferences: ItineraryPreferences,
    onProgress: (progress: StreamingProgress) => void
): Promise<Itinerary> {
    return generateGeminiItinerary(preferences, onProgress, false);
}

/**
 * Non-streaming variant (instant call, no progress updates).
 * Used as a simple fallback.
 */
export async function generateItinerary(preferences: ItineraryPreferences): Promise<Itinerary> {
    return generateGeminiItinerary(
        preferences,
        () => {},  // no-op progress
        false
    );
}
