// Dynamic flag-based colors for destination countries
// Used to theme the itinerary result screen based on the destination country

export interface CountryTheme {
    primary: string;
    secondary: string;
    accent: string;
}

const COUNTRY_COLORS: Record<string, CountryTheme> = {
    // Asia
    'Japan':       { primary: '#BC002D', secondary: '#FFFFFF', accent: '#BC002D' },
    'India':       { primary: '#FF9933', secondary: '#138808', accent: '#000080' },
    'Thailand':    { primary: '#A51931', secondary: '#2D2A4A', accent: '#F4F5F8' },
    'Indonesia':   { primary: '#CE1126', secondary: '#FFFFFF', accent: '#CE1126' },
    'Vietnam':     { primary: '#DA251D', secondary: '#FFCD00', accent: '#DA251D' },
    'China':       { primary: '#DE2910', secondary: '#FFDE00', accent: '#DE2910' },
    'South Korea': { primary: '#003478', secondary: '#C60C30', accent: '#003478' },
    'Singapore':   { primary: '#EF3340', secondary: '#FFFFFF', accent: '#EF3340' },
    'Malaysia':    { primary: '#010066', secondary: '#CC0001', accent: '#FFCC00' },
    'Nepal':       { primary: '#DC143C', secondary: '#003893', accent: '#DC143C' },
    'Sri Lanka':   { primary: '#8D153A', secondary: '#FCBF49', accent: '#00534E' },

    // Europe
    'Italy':       { primary: '#009246', secondary: '#CE2B37', accent: '#FFFFFF' },
    'Italia':      { primary: '#009246', secondary: '#CE2B37', accent: '#FFFFFF' },
    'France':      { primary: '#002395', secondary: '#ED2939', accent: '#FFFFFF' },
    'Spain':       { primary: '#AA151B', secondary: '#F1BF00', accent: '#AA151B' },
    'Germany':     { primary: '#000000', secondary: '#DD0000', accent: '#FFCE00' },
    'UK':          { primary: '#012169', secondary: '#C8102E', accent: '#FFFFFF' },
    'England':     { primary: '#012169', secondary: '#C8102E', accent: '#FFFFFF' },
    'Greece':      { primary: '#0D5EAF', secondary: '#FFFFFF', accent: '#0D5EAF' },
    'Portugal':    { primary: '#006600', secondary: '#FF0000', accent: '#FFCC00' },
    'Netherlands': { primary: '#AE1C28', secondary: '#21468B', accent: '#FFFFFF' },
    'Switzerland': { primary: '#FF0000', secondary: '#FFFFFF', accent: '#FF0000' },
    'Turkey':      { primary: '#E30A17', secondary: '#FFFFFF', accent: '#E30A17' },
    'Czech Republic': { primary: '#11457E', secondary: '#D7141A', accent: '#FFFFFF' },
    'Austria':     { primary: '#ED2939', secondary: '#FFFFFF', accent: '#ED2939' },
    'Croatia':     { primary: '#FF0000', secondary: '#0093DD', accent: '#FFFFFF' },

    // Americas
    'USA':         { primary: '#3C3B6E', secondary: '#B22234', accent: '#FFFFFF' },
    'Brazil':      { primary: '#009C3B', secondary: '#FFDF00', accent: '#002776' },
    'Mexico':      { primary: '#006341', secondary: '#CE1126', accent: '#FFFFFF' },
    'Colombia':    { primary: '#FCD116', secondary: '#003893', accent: '#CE1126' },
    'Peru':        { primary: '#D91023', secondary: '#FFFFFF', accent: '#D91023' },
    'Argentina':   { primary: '#74ACDF', secondary: '#FFFFFF', accent: '#F6B40E' },
    'Canada':      { primary: '#FF0000', secondary: '#FFFFFF', accent: '#FF0000' },
    'Cuba':        { primary: '#002A8F', secondary: '#CF142B', accent: '#FFFFFF' },

    // Africa & Middle East
    'Egypt':       { primary: '#CE1126', secondary: '#FFFFFF', accent: '#000000' },
    'Morocco':     { primary: '#C1272D', secondary: '#006233', accent: '#C1272D' },
    'South Africa':{ primary: '#007A4D', secondary: '#FFB612', accent: '#DE3831' },
    'UAE':         { primary: '#00732F', secondary: '#FF0000', accent: '#FFFFFF' },
    'Dubai':       { primary: '#00732F', secondary: '#FF0000', accent: '#FFFFFF' },

    // Oceania
    'Australia':   { primary: '#002868', secondary: '#FFFFFF', accent: '#FF0000' },
    'New Zealand': { primary: '#00247D', secondary: '#CC142B', accent: '#FFFFFF' },
    'Fiji':        { primary: '#002868', secondary: '#CE1126', accent: '#68BFE5' },
};

/** Default fallback theme when country not found */
const DEFAULT_THEME: CountryTheme = {
    primary: '#20856d',
    secondary: '#27a982',
    accent: '#FFFFFF',
};

/**
 * Get theme colors for a destination string.
 * Tries to match the country name from the destination (e.g., "Kyoto, Japan" → Japan).
 */
export function getCountryTheme(destination: string): CountryTheme {
    // Direct match
    if (COUNTRY_COLORS[destination]) return COUNTRY_COLORS[destination];

    // Try matching the last part after comma (common format: "City, Country")
    const parts = destination.split(',');
    for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i].trim();
        if (COUNTRY_COLORS[part]) return COUNTRY_COLORS[part];
    }

    // Fuzzy: check if any key is contained in the destination
    for (const [country, theme] of Object.entries(COUNTRY_COLORS)) {
        if (destination.toLowerCase().includes(country.toLowerCase())) {
            return theme;
        }
    }

    return DEFAULT_THEME;
}
