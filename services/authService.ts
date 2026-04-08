/**
 * authService — thin helper layer
 *
 * Auth is handled entirely by Clerk. This file only manages
 * Supabase-stored travel preferences (not auth metadata).
 */
import { supabase } from './supabase';
import type { TravelPreferences } from '@/types';

export const authService = {
    /** Save travel preferences to Supabase profiles table */
    async updatePreferences(userId: string, preferences: TravelPreferences) {
        const { data, error } = await supabase
            .from('profiles')
            .upsert(
                { id: userId, travel_preferences: preferences },
                { onConflict: 'id' }
            );
        if (error) throw error;
        return data;
    },

    /** Get travel preferences from Supabase profiles table */
    async getPreferences(userId: string): Promise<TravelPreferences | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('travel_preferences')
            .eq('id', userId)
            .single();
        if (error || !data) return null;
        return (data as any).travel_preferences ?? null;
    },

    /** Upsert a user profile row (called after first sign-in) */
    async upsertProfile(userId: string, email: string, name: string, avatarUrl?: string) {
        const { error } = await supabase
            .from('profiles')
            .upsert(
                { id: userId, email, name, avatar_url: avatarUrl },
                { onConflict: 'id' }
            );
        if (error) throw error;
    },
};
