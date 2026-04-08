// Friends Service — ported from curated-journeys/src/services/dashboardService.ts
// Manages friend relationships via Supabase `friend_requests` table

import { supabase } from './supabase';

export interface FriendUser {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
}

export interface Friend {
    id: string; // friend_request row id
    user: FriendUser;
    status: 'accepted';
    createdAt: string;
}

export interface FriendRequest {
    id: string;
    userId: FriendUser;
    status: 'pending';
    createdAt: string;
}

export interface TravelStats {
    totalTrips: number;
    totalCountries: number;
    totalCities: number;
    totalDays: number;
    totalSpent: number;
    visitedCountries: string[];
    visitedCities: string[];
    lastUpdated: string;
}

// ─── Friend operations ────────────────────────────────────────────────────────

/** Returns all accepted friends for the current user */
export const getFriends = async (): Promise<Friend[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('friend_requests')
        .select(`
            id,
            sender_id,
            receiver_id,
            status,
            created_at,
            sender:profiles!friend_requests_sender_id_fkey(id, full_name, email, avatar_url),
            receiver:profiles!friend_requests_receiver_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => {
        const isSender = row.sender_id === user.id;
        const friend = isSender ? row.receiver : row.sender;
        return {
            id: row.id,
            user: {
                id: friend.id,
                name: friend.full_name || friend.email || 'Unknown',
                email: friend.email,
                avatar_url: friend.avatar_url,
            },
            status: 'accepted' as const,
            createdAt: row.created_at,
        };
    });
};

/** Returns pending friend requests sent TO the current user */
export const getPendingRequests = async (): Promise<FriendRequest[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('friend_requests')
        .select(`
            id,
            created_at,
            sender:profiles!friend_requests_sender_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
        id: row.id,
        userId: {
            id: row.sender.id,
            name: row.sender.full_name || row.sender.email || 'Unknown',
            email: row.sender.email,
            avatar_url: row.sender.avatar_url,
        },
        status: 'pending' as const,
        createdAt: row.created_at,
    }));
};

/** Looks up a user by email, then sends a friend request */
export const sendFriendRequest = async (friendEmail: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', friendEmail)
        .single();

    if (profileError || !profile) throw new Error('No user found with that email address');
    if (profile.id === user.id) throw new Error('You cannot add yourself as a friend');

    const { error } = await supabase
        .from('friend_requests')
        .insert({ sender_id: user.id, receiver_id: profile.id });

    if (error) {
        if (error.code === '23505') throw new Error('Friend request already sent');
        throw new Error(error.message);
    }
};

/** Accepts an incoming friend request */
export const acceptFriendRequest = async (requestId: string): Promise<void> => {
    const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

    if (error) throw new Error(error.message);
};

/** Rejects an incoming friend request */
export const rejectFriendRequest = async (requestId: string): Promise<void> => {
    const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

    if (error) throw new Error(error.message);
};

/** Removes a friend (deletes the accepted request row) */
export const removeFriend = async (requestId: string): Promise<void> => {
    const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);

    if (error) throw new Error(error.message);
};

// ─── Travel stats ─────────────────────────────────────────────────────────────

/** Calculate travel stats from saved itineraries */
export const calculateTravelStats = (itineraries: any[]): TravelStats => {
    const visitedCountries = new Set<string>();
    const visitedCities = new Set<string>();

    let totalDays = 0;
    let totalSpent = 0;

    itineraries.forEach((itinerary) => {
        const destination = itinerary.destination || itinerary.itinerary_data?.destination || '';
        const duration = itinerary.duration || itinerary.itinerary_data?.duration || 0;

        const parts = destination.split(',');
        const country = parts[parts.length - 1]?.trim();
        if (country) visitedCountries.add(country);
        if (destination) visitedCities.add(destination);

        totalDays += duration;

        const budget =
            itinerary.itinerary_data?.budget?.total ||
            itinerary.budget?.total ||
            0;
        totalSpent += typeof budget === 'number' ? budget : 0;
    });

    return {
        totalTrips: itineraries.length,
        totalCountries: visitedCountries.size,
        totalCities: visitedCities.size,
        totalDays,
        totalSpent,
        visitedCountries: Array.from(visitedCountries),
        visitedCities: Array.from(visitedCities),
        lastUpdated: new Date().toISOString(),
    };
};
