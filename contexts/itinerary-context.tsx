// Itinerary Context — shared state for passing generated itinerary between screens
import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { Itinerary } from '@/types';

interface ItineraryContextType {
    itinerary: Itinerary | null;
    setItinerary: (it: Itinerary | null) => void;
}

const ItineraryContext = createContext<ItineraryContextType>({
    itinerary: null,
    setItinerary: () => {},
});

export function ItineraryProvider({ children }: { children: ReactNode }) {
    const [itinerary, setItinerary] = useState<Itinerary | null>(null);
    return (
        <ItineraryContext.Provider value={{ itinerary, setItinerary }}>
            {children}
        </ItineraryContext.Provider>
    );
}

export function useItineraryContext() {
    return useContext(ItineraryContext);
}
