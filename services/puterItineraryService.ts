// Puter.js AI Itinerary Generation Service
// Provides free AI-powered travel itinerary generation via Puter + Gemini/Claude
// Falls back to backend API when Puter is unavailable (e.g. on native)

import type { ItineraryPreferences } from '@/types/itinerary';
import type { Itinerary } from '@/types/itinerary';

export interface StreamingProgress {
    status: 'generating' | 'complete' | 'error';
    progress: number; // 0-100
    currentText: string;
    error?: string;
}

/** Check if puter.js is available (web only) */
function isPuterAvailable(): boolean {
    return typeof window !== 'undefined' && typeof (window as any).puter !== 'undefined';
}

/** Models to try in order of preference */
const PUTER_MODELS = [
    'claude-sonnet-4-5',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gpt-4o-mini',
];

/** Try generating with multiple model fallbacks */
async function tryPuterAI(prompt: string): Promise<string> {
    const puter = (window as any).puter;
    let lastError: Error | null = null;

    for (const model of PUTER_MODELS) {
        try {
            const response = await puter.ai.chat(prompt, {
                model,
                stream: false,
            });

            // Puter can return raw string or an object with .message.content
            if (typeof response === 'string' && response.trim().length > 50) {
                return response;
            }
            if (response?.message?.content) {
                return typeof response.message.content === 'string'
                    ? response.message.content
                    : response.message.content?.[0]?.text || '';
            }
            if (response?.text) return response.text;

            // Try JSON stringify and look for content
            const str = JSON.stringify(response);
            if (str && str.length > 50) return str;

        } catch (err: any) {
            lastError = err;
            console.warn(`Puter model ${model} failed:`, err?.message);
            // If it's an auth error, don't try other models
            if (err?.message?.includes('auth') || err?.message?.includes('login') || err?.message?.includes('unauthorized')) {
                throw new Error('Please sign in with Puter to use AI features.');
            }
            // Continue to next model
        }
    }

    throw lastError || new Error('All Puter AI models failed. Please try again.');
}

/**
 * Extract JSON from a potentially messy AI response (with markdown code blocks, preamble text, etc.)
 */
function extractJSON(raw: string): string {
    // Remove markdown code fences
    let cleaned = raw.trim();
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    cleaned = cleaned.trim();

    // Try direct parse first
    try {
        JSON.parse(cleaned);
        return cleaned;
    } catch {
        // Fall through to regex extraction
    }

    // Find the first { ... } block that contains "destination"
    const match = cleaned.match(/\{[\s\S]*"destination"[\s\S]*\}/);
    if (match) {
        try {
            JSON.parse(match[0]);
            return match[0];
        } catch {
            // Try to find the outermost valid JSON object
        }
    }

    // Last resort: find the largest { } block
    let depth = 0;
    let start = -1;
    let end = -1;
    for (let i = 0; i < cleaned.length; i++) {
        if (cleaned[i] === '{') {
            if (depth === 0) start = i;
            depth++;
        } else if (cleaned[i] === '}') {
            depth--;
            if (depth === 0) {
                end = i;
                break;
            }
        }
    }
    if (start !== -1 && end !== -1) {
        return cleaned.slice(start, end + 1);
    }

    return cleaned;
}

/**
 * Generate a complete travel itinerary using Puter.js AI (Gemini/Claude)
 * Falls back gracefully when Puter is not loaded.
 */
export async function generateItineraryWithPuter(preferences: ItineraryPreferences): Promise<Itinerary> {
    if (!isPuterAvailable()) {
        throw new Error('PUTER_UNAVAILABLE');
    }

    const prompt = buildItineraryPrompt(preferences);

    try {
        const responseText = await tryPuterAI(prompt);
        return parseItineraryResponse(responseText, preferences);
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('PUTER_UNAVAILABLE')) throw error;
            if (error.message.includes('Please sign in')) throw error;
            throw new Error(`AI generation failed: ${error.message}`);
        }
        throw new Error('AI generation failed. Please try again.');
    }
}

/**
 * Generate itinerary with streaming for real-time progress updates.
 */
export async function generateItineraryStreaming(
    preferences: ItineraryPreferences,
    onProgress: (progress: StreamingProgress) => void
): Promise<Itinerary> {
    if (!isPuterAvailable()) {
        throw new Error('PUTER_UNAVAILABLE');
    }

    const prompt = buildItineraryPrompt(preferences);
    const puter = (window as any).puter;
    let fullResponse = '';
    let progress = 0;

    try {
        onProgress({ status: 'generating', progress: 0, currentText: '' });

        // Try streaming with primary model, fall back to non-streaming if needed
        let streamed = false;
        for (const model of PUTER_MODELS) {
            try {
                const response = await puter.ai.chat(prompt, {
                    model,
                    stream: true,
                });

                for await (const part of response as AsyncIterable<any>) {
                    const text = part?.text || part?.message?.content || '';
                    if (text) {
                        fullResponse += text;
                        progress = Math.min(progress + 3, 95);
                        onProgress({ status: 'generating', progress, currentText: fullResponse });
                    }
                }
                streamed = true;
                break;
            } catch (err: any) {
                console.warn(`Streaming with ${model} failed:`, err?.message);
                if (err?.message?.includes('auth') || err?.message?.includes('login')) {
                    throw new Error('Please sign in with Puter to use AI features');
                }
            }
        }

        if (!streamed || !fullResponse) {
            throw new Error('All streaming models failed');
        }

        const itinerary = parseItineraryResponse(fullResponse, preferences);
        onProgress({ status: 'complete', progress: 100, currentText: fullResponse });
        return itinerary;
    } catch (error) {
        let errorMessage = 'Failed to generate itinerary';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        onProgress({ status: 'error', progress: 0, currentText: '', error: errorMessage });
        throw new Error(errorMessage);
    }
}

/**
 * Build the AI prompt for itinerary generation
 */
function buildItineraryPrompt(preferences: ItineraryPreferences): string {
    const { destination, duration, budget, travelStyle, interests, groupSize } = preferences;

    return `You are an expert travel planner. Generate a detailed ${duration}-day itinerary for ${destination}.

USER PROFILE:
- Budget: ${budget}
- Travel Style: ${travelStyle}
- Interests: ${interests.join(', ')}
${groupSize ? `- Group Size: ${groupSize} people` : ''}

REQUIREMENTS:
1. Create realistic daily schedules (8:00 AM - 10:00 PM)
2. Include specific times for each activity
3. Allow time for meals, rest, and travel between locations
4. Provide accurate cost estimates in Indian Rupees (₹)
5. Consider local customs, weather, and peak visiting times
6. Include insider tips and local recommendations
7. Suggest specific restaurants, attractions, and hidden gems
8. Account for travel time between locations
9. Balance activities with rest periods

OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure (no markdown, no code blocks, just pure JSON):

{
  "destination": "${destination}",
  "duration": ${duration},
  "overview": "Brief 2-3 sentence overview of the trip",
  "bestTimeToVisit": "Best months to visit",
  "days": [
    {
      "day": 1,
      "theme": "Day theme (e.g., 'Iconic Landmarks')",
      "activities": [
        {
          "time": "9:00 AM",
          "title": "Activity name",
          "description": "Detailed description",
          "duration": "2 hours",
          "estimatedCost": "₹500",
          "location": "Specific location/address",
          "category": "Sightseeing",
          "tips": ["Helpful tip 1", "Helpful tip 2"]
        }
      ],
      "totalCost": "₹2,500",
      "notes": ["Important notes for the day"]
    }
  ],
  "budgetBreakdown": {
    "accommodation": "₹15,000",
    "food": "₹8,000",
    "activities": "₹12,000",
    "transportation": "₹5,000",
    "miscellaneous": "₹3,000",
    "total": "₹43,000"
  },
  "tips": [
    "General travel tip 1",
    "General travel tip 2",
    "Local custom or etiquette tip"
  ],
  "packingList": ["Item 1", "Item 2", "Item 3"],
  "localInfo": {
    "currency": "Currency name",
    "language": "Primary language",
    "emergencyNumbers": ["Police: XXX", "Ambulance: XXX"],
    "transportation": ["How to get around tip 1", "Tip 2"]
  }
}

IMPORTANT: Return ONLY the JSON object. No explanations, no markdown formatting, no code blocks.`;
}

/**
 * Parse and validate the AI response, adapting it to the mobile Itinerary type
 */
function parseItineraryResponse(
    response: string,
    preferences: ItineraryPreferences
): Itinerary {
    try {
        const cleaned = extractJSON(response);
        const raw = JSON.parse(cleaned);

        if (!raw.destination || !raw.days || raw.days.length === 0) {
            throw new Error('Invalid itinerary structure from AI');
        }

        // Ensure activities have required fields
        const days = raw.days.map((day: any, idx: number) => ({
            ...day,
            day: day.day || idx + 1,
            theme: day.theme || `Day ${idx + 1}`,
            activities: (day.activities || []).map((act: any) => ({
                time: act.time || '9:00 AM',
                title: act.title || 'Activity',
                description: act.description || '',
                duration: act.duration || '1 hour',
                estimatedCost: act.estimatedCost || act.cost || 'Free',
                location: act.location || raw.destination,
                category: act.category,
                tips: act.tips,
            })),
        }));

        return {
            id: `puter_${Date.now()}`,
            userId: 'puter_generated',
            destination: raw.destination,
            duration: raw.duration || preferences.duration,
            overview: raw.overview || '',
            bestTimeToVisit: raw.bestTimeToVisit,
            days,
            dayPlans: days, // alias
            budgetBreakdown: raw.budgetBreakdown,
            budget: raw.budgetBreakdown,
            tips: raw.tips || [],
            packingList: raw.packingList,
            travelStyle: preferences.travelStyle,
            moodTags: preferences.interests,
            createdAt: new Date().toISOString(),
        } as Itinerary;
    } catch (error) {
        console.error('Error parsing itinerary response:', error);
        console.error('Raw response (first 500 chars):', String(response).slice(0, 500));
        throw new Error('Failed to parse AI response. Please try again.');
    }
}
