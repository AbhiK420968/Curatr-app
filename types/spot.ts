// TypeScript types for spots and places

export interface Spot {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    category: SpotCategory;
    rating?: number;
    image?: string;
    source?: string;
    description?: string;
    distance?: string;
    travelTime?: string;
    address?: string;
}

export type SpotCategory =
    | 'attraction'
    | 'restaurant'
    | 'hotel'
    | 'cafe'
    | 'shopping'
    | 'nature'
    | 'nightlife'
    | 'temple'
    | 'museum'
    | 'other';

export interface SavedPlace {
    id: string;
    userId: string;
    spotId: string;
    spot: Spot;
    createdAt: string;
}

export type ExploreFilter = 'all' | 'restaurants' | 'things_to_do' | 'stays';
