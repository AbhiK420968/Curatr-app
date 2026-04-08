// TypeScript types for trips and itineraries — adapted from web app

export interface ItineraryPreferences {
    destination: string;
    duration: number;
    budget: string;
    travelStyle: TravelStyle;
    interests: string[];
    groupSize?: number;
}

export type TravelStyle =
    | 'Adventure'
    | 'Relaxation'
    | 'Cultural'
    | 'Food & Wine'
    | 'Nature'
    | 'Urban'
    | 'Luxury'
    | 'Budget';

export interface Activity {
    time: string;
    timeBlock?: 'morning' | 'afternoon' | 'evening';
    title: string;
    description: string;
    duration: string;
    estimatedCost: string | number;
    estimatedDuration?: number;
    location: string | { name: string; latitude?: number; longitude?: number };
    category?: string;
    tips?: string[];
    imageUrl?: string;
    isLocked?: boolean;
}

export interface DayPlan {
    day: number;
    date?: string;
    theme: string;
    activities: Activity[];
    totalCost?: string | number;
    notes?: string[];
}

export interface BudgetBreakdown {
    accommodation: string | number;
    food: string | number;
    activities: string | number;
    transportation: string | number;
    shopping?: string | number;
    miscellaneous?: string | number;
    other?: string | number;
    total: string | number;
    daily?: string | number;
}

export interface Itinerary {
    id: string;
    userId: string;
    destination: string;
    duration: number;
    overview: string;
    title?: string;
    startDate?: string;
    endDate?: string;
    bestTimeToVisit?: string;
    days?: DayPlan[];
    dayPlans?: DayPlan[];
    budgetBreakdown?: BudgetBreakdown;
    budget?: BudgetBreakdown;
    tips: string[];
    packingList?: string[];
    travelStyle?: string;
    moodTags?: string[];
    totalEstimatedCost?: number;
    isPublic?: boolean;
    shareToken?: string;
    destinationImage?: string;
    createdAt: string;
    updatedAt?: string;
}
