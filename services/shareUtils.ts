// Share & Save utilities for itinerary
import { Share, Platform } from 'react-native';
import type { Itinerary } from '@/types';

const APP_DEEP_LINK_BASE = 'https://curatr.app/trip/';

/**
 * Generate a shareable text summary + fake deep link URL for the itinerary.
 * In production, replace with a real backend URL from tripService.shareTrip().
 */
export function generateShareText(itinerary: Itinerary & { id?: string; tips?: string[] }): string {
    const days = (itinerary.days || (itinerary as any).dayPlans || []);
    const activityCount = days.reduce((s: number, d: any) => s + (d.activities?.length || 0), 0);
    const shareId = itinerary.id || `trip_${Date.now()}`;
    const shareUrl = `${APP_DEEP_LINK_BASE}${shareId}`;

    return `✈️ Check out my ${itinerary.duration}-day trip to ${itinerary.destination}!\n\n` +
        `📍 ${itinerary.destination}\n` +
        `📅 ${itinerary.duration} days · ${activityCount} activities\n` +
        (itinerary.overview ? `\n${itinerary.overview}\n` : '') +
        `\n🔗 View itinerary: ${shareUrl}\n\n` +
        `Generated with Curatr ✨`;
}

/**
 * Open the native share sheet with the itinerary details.
 */
export async function shareItinerary(itinerary: Itinerary & { id?: string; tips?: string[] }): Promise<void> {
    const text = generateShareText(itinerary);
    const shareId = itinerary.id || `trip_${Date.now()}`;
    const url = `${APP_DEEP_LINK_BASE}${shareId}`;

    await Share.share(
        Platform.OS === 'ios'
            ? { title: `My ${itinerary.destination} Trip`, message: text, url }
            : { title: `My ${itinerary.destination} Trip`, message: text + '\n' + url }
    );
}

/**
 * Format an itinerary as a readable text for copying.
 */
export function formatItineraryForClipboard(itinerary: Itinerary & { id?: string; tips?: string[] }): string {
    const shareId = itinerary.id || `trip_${Date.now()}`;
    return `${APP_DEEP_LINK_BASE}${shareId}`;
}
