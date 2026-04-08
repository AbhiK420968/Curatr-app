// TypeScript types for user

export interface User {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    travelPreferences?: TravelPreferences;
    createdAt?: string;
}

export interface TravelPreferences {
    travelStyles: string[];
    interests: string[];
    budgetRange: string;
    dietaryPreferences?: string[];
    accessibility?: string[];
}
