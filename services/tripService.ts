/**
 * tripService — Supabase-backed trip CRUD
 *
 * All trips are stored in the Supabase `trips` table.
 * Pass the Clerk userId to scope queries per-user.
 */
import { supabase } from './supabase';
import { generateItinerary as generateGeminiItinerary } from './geminiService';
import type { Itinerary, ItineraryPreferences } from '@/types';

export const tripService = {
    /** Get all trips for a user */
    async getTrips(userId: string): Promise<Itinerary[]> {
        if (!userId) return [];
        const { data, error } = await supabase
            .from('trips')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        // Flatten: each row's itinerary_data is the actual itinerary object
        return (data ?? []).map((row: any) => ({
            ...(row.itinerary_data ?? {}),
            id: row.id,
            destination: row.destination,
            duration: row.duration,
            status: row.status,
        })) as Itinerary[];
    },

    /** Get a single trip by ID */
    async getTrip(id: string): Promise<Itinerary> {
        const { data, error } = await supabase
            .from('trips')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        const row = data as any;
        return {
            ...(row.itinerary_data ?? {}),
            id: row.id,
            destination: row.destination,
            duration: row.duration,
            status: row.status,
        } as Itinerary;
    },

    /** Save a generated itinerary */
    async saveTrip(userId: string, trip: Partial<Itinerary>): Promise<Itinerary> {
        const { data, error } = await supabase
            .from('trips')
            .insert({
                user_id: userId,
                destination: trip.destination,
                duration: trip.duration,
                itinerary_data: trip,
                status: 'upcoming',
            })
            .select()
            .single();
        if (error) throw error;
        const row = data as any;
        return {
            ...(row.itinerary_data ?? {}),
            id: row.id,
            destination: row.destination,
            duration: row.duration,
            status: row.status,
        } as Itinerary;
    },

    /**
     * Generate an AI itinerary via Gemini 2.5 Flash.
     */
    async generateItinerary(preferences: ItineraryPreferences): Promise<Itinerary> {
        return generateGeminiItinerary(preferences);
    },

    /** Update an existing trip */
    async updateTrip(id: string, updates: Partial<Itinerary>): Promise<Itinerary> {
        const { data, error } = await supabase
            .from('trips')
            .update({ itinerary_data: updates, destination: updates.destination })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        const row = data as any;
        return {
            ...(row.itinerary_data ?? {}),
            id: row.id,
            destination: row.destination,
        } as Itinerary;
    },

    /** Delete a trip */
    async deleteTrip(id: string): Promise<void> {
        const { error } = await supabase
            .from('trips')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    /** Mark a trip as past */
    async markTripPast(id: string): Promise<void> {
        const { error } = await supabase
            .from('trips')
            .update({ status: 'past' })
            .eq('id', id);
        if (error) throw error;
    },

    /** Share a trip — returns a shareable deep-link */
    async shareTrip(id: string): Promise<{ shareToken: string; shareUrl: string }> {
        // Generate a simple share token; in production you'd store this in Supabase
        const shareToken = `curatr_${id}`;
        const shareUrl = `https://curatr.app/trip/${id}`;
        return { shareToken, shareUrl };
    },
};
