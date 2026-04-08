import type { Activity } from '@/types';

// ============================================================================
// Foursquare API - Dynamic Search, Geocoding & Images
// ============================================================================

export interface FoursquareLocation {
    lat: number;
    lng: number;
    imageUrl: string | null;
}

export async function enrichActivityWithFoursquare(
    activity: Activity,
    destination: string
): Promise<FoursquareLocation | null> {
    try {
        const apiKey = process.env.EXPO_PUBLIC_FOURSQUARE_KEY;
        if (!apiKey) return null;

        // Clean up the query to get better hits
        const query = (activity.title || '')
            .replace(/Morning at |Afternoon at |Evening at /g, '')
            .split(' (')[0];

        const res = await fetch(
            `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(query)}&near=${encodeURIComponent(destination)}&limit=1&fields=fsq_id,name,geocodes,photos`,
            {
                headers: {
                    'Authorization': apiKey,
                    'Accept': 'application/json'
                }
            }
        );

        const data = await res.json();
        const place = data.results?.[0];

        if (!place) return null;

        let imageUrl = null;
        if (place.photos && place.photos.length > 0) {
            const photo = place.photos[0];
            // Format: prefix + size + suffix. "original" gives full res
            imageUrl = `${photo.prefix}original${photo.suffix}`;
        }

        return {
            lat: place.geocodes?.main?.latitude,
            lng: place.geocodes?.main?.longitude,
            imageUrl,
        };

    } catch (err) {
        console.warn(`[Foursquare] Failed to enrich "${activity.title}":`, err);
        return null;
    }
}

// ============================================================================
// WeatherAPI (.com) / Open-Meteo Fallback
// ============================================================================

export interface WeatherForecast {
    date: string;
    temp_c: number;
    condition_text: string;
    icon_url: string;
}

export async function fetchWeather(destination: string, days: number = 3): Promise<WeatherForecast[]> {
    try {
        const apiKey = process.env.EXPO_PUBLIC_WEATHER_API_KEY;
        
        // Use WeatherAPI if key is available
        if (apiKey) {
            const res = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(destination)}&days=${days}`);
            const data = await res.json();
            
            if (data.forecast?.forecastday) {
                return data.forecast.forecastday.map((d: any) => ({
                    date: d.date,
                    temp_c: Math.round(d.day.avgtemp_c),
                    condition_text: d.day.condition.text,
                    icon_url: `https:${d.day.condition.icon}`,
                }));
            }
        }
        
        // Free Fallback: Open Meteo (requires coordinates, using Geoapify to resolve city first)
        const geoKey = process.env.EXPO_PUBLIC_GEOAPIFY_KEY;
        if (!geoKey) return [];
        
        const geoRes = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(destination)}&limit=1&apiKey=${geoKey}`);
        const geoData = await geoRes.json();
        const coords = geoData.features?.[0]?.geometry?.coordinates; // [lng, lat]
        
        if (!coords) return [];

        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords[1]}&longitude=${coords[0]}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=${days}`);
        const weatherData = await weatherRes.json();
        
        if (!weatherData.daily) return [];

        // Simple mapping for open-meteo WMO codes
        const getWeatherCondition = (code: number) => {
            if (code <= 3) return { text: 'Clear / Partly Cloudy', icon: 'https://cdn.weatherapi.com/weather/64x64/day/116.png' };
            if (code <= 67) return { text: 'Rain', icon: 'https://cdn.weatherapi.com/weather/64x64/day/308.png' };
            return { text: 'Cloudy / Storms', icon: 'https://cdn.weatherapi.com/weather/64x64/day/119.png' };
        };

        return weatherData.daily.time.map((time: string, idx: number) => {
            const max = weatherData.daily.temperature_2m_max[idx];
            const min = weatherData.daily.temperature_2m_min[idx];
            const cond = getWeatherCondition(weatherData.daily.weather_code[idx]);
            
            return {
                date: time,
                temp_c: Math.round((max + min) / 2),
                condition_text: cond.text,
                icon_url: cond.icon,
            };
        });

    } catch (err) {
        console.warn(`[Weather] Fetch failed for ${destination}:`, err);
        return [];
    }
}

// ============================================================================
// OSRM TSP Route Optimization
// ============================================================================

/**
 * Uses OSRM's Traveling Salesperson Problem (TSP) algorithm to automatically
 * re-order activities for geographical efficiency.
 * Returns a new array of activities in the optimally sorted order.
 */
export async function optimizeRouteWithOSRM(
    activities: { activity: Activity, lat: number, lng: number }[],
    roundtrip = false
): Promise<Activity[]> {
    if (activities.length < 3) {
        // Less than 3 points is already linear, no optimization needed
        return activities.map(a => a.activity);
    }

    try {
        // Format: lng,lat;lng,lat
        const coordsStr = activities.map(a => `${a.lng},${a.lat}`).join(';');
        
        // Note: ?source=first locks the start point so we don't start at a random location
        const res = await fetch(
            `https://router.project-osrm.org/trip/v1/driving/${coordsStr}?source=first&roundtrip=${roundtrip}`
        );
        
        const data = await res.json();
        
        if (data.code !== 'Ok' || !data.waypoints) {
            console.warn('[OSRM Optimization Failed] Bad response:', data.code);
            return activities.map(a => a.activity);
        }

        // data.waypoints contains an array of waypoint objects that have an original `waypoint_index`
        // It provides the new chronological order.
        
        // Sort the waypoints by their new route `waypoint_index`
        const sortedWaypoints = [...data.waypoints].sort((a, b) => a.waypoint_index - b.waypoint_index);
        
        // Re-construct the activities list in the new optimal order using `trips_index`
        // OSRM returns `trips_index` for each original input coordinate matching its sequence in the trip.
        const originalIndexToOptimizedIndex = new Map();
        data.waypoints.forEach((wp: any, originalInputIndex: number) => {
             // waypoint_index tells us the position of this point in the final optimized trip
             originalIndexToOptimizedIndex.set(wp.waypoint_index, originalInputIndex);
        });

        const optimizedActivities: Activity[] = [];
        for (let i = 0; i < activities.length; i++) {
            const originalInputIndex = originalIndexToOptimizedIndex.get(i);
            if (originalInputIndex !== undefined) {
                optimizedActivities.push(activities[originalInputIndex].activity);
            }
        }

        // Fix chronological times (preserve the original times but apply them to the new order)
        const originalTimes = activities.map(a => a.activity.time);
        return optimizedActivities.map((act, idx) => ({
            ...act,
            time: originalTimes[idx] // Keep the timeline fixed while geographical locations are swapped
        }));

    } catch (err) {
        console.warn('[OSRM Optimization Error]', err);
        return activities.map(a => a.activity);
    }
}
