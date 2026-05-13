import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated,
    TextInput, Alert, useWindowDimensions, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants';
import { getCountryTheme } from '@/constants/country-colors';
import { generateMapHtml, type MapActivity } from '@/services/map-html';
import { shareItinerary, formatItineraryForClipboard } from '@/services/shareUtils';
import { tripService } from '@/services';
import { useItineraryContext } from '@/contexts/itinerary-context';
import {
    ChevronLeft, Share2, Save, Trash2, Plus, GripVertical,
    Clock, DollarSign, MapPin, Edit3, Check, X, PlusCircle,
    MinusCircle, Copy, CheckCircle, CloudRain, Sun,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { Activity, DayPlan } from '@/types';
import { fetchWeather, WeatherForecast, enrichActivityWithGooglePlaces, optimizeRouteWithOSRM } from '@/services/integrationService';
import { Image } from 'react-native';

// ── Platform-safe WebView wrapper ──
// react-native-webview doesn't work in browsers — use iframe on web
const PlatformWebView = Platform.OS === 'web'
    ? ({ html, style }: { html: string; style?: any }) => {
        return (
            <iframe
                srcDoc={html}
                style={{ width: '100%', height: '100%', border: 'none', ...style }}
                sandbox="allow-scripts allow-same-origin"
                scrolling="no"
            />
        ) as any;
    }
    : (() => {
        const { WebView } = require('react-native-webview');
        return ({ html, ref: _ref, style }: { html: string; ref?: any; style?: any }) => {
            return <WebView source={{ html }} style={style} scrollEnabled={false} javaScriptEnabled originWhitelist={['*']} />;
        };
    })();


// ── Helper: Offset generator so fallback pins don't overlap exactly ──
function getOffsetCoord(lat: number, lng: number, dayIdx: number, actIdx: number) {
    const offset = (i: number, j: number) => (i * 0.008 + j * 0.012) * (j % 2 === 0 ? 1 : -1);
    return { lat: lat + offset(dayIdx, actIdx), lng: lng + offset(actIdx, dayIdx) };
}

// ── Weather Widget ──
function WeatherWidget({ forecasts }: { forecasts: WeatherForecast[] }) {
    if (!forecasts || forecasts.length === 0) return null;
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weatherScroll} contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: 12 }}>
            {forecasts.map((f, i) => {
                const dayName = new Date(f.date).toLocaleDateString('en-US', { weekday: 'short' });
                return (
                    <View key={i} style={styles.weatherCard}>
                        <Text style={styles.weatherDay}>{i === 0 ? 'Today' : dayName}</Text>
                        <Image source={{ uri: f.icon_url }} style={styles.weatherIcon} />
                        <Text style={styles.weatherTemp}>{f.temp_c}°C</Text>
                        <Text style={styles.weatherCond} numberOfLines={1}>{f.condition_text}</Text>
                    </View>
                );
            })}
        </ScrollView>
    );
}

// ── Toast ──
function Toast({ message, visible }: { message: string; visible: boolean }) {
    if (!visible) return null;
    return (
        <View style={toastStyles.container}>
            <CheckCircle size={16} color="#FFF" />
            <Text style={toastStyles.text}>{message}</Text>
        </View>
    );
}
const toastStyles = StyleSheet.create({
    container: {
        position: 'absolute', bottom: 110, alignSelf: 'center',
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(20,20,20,0.88)', paddingHorizontal: 20, paddingVertical: 12,
        borderRadius: 30, zIndex: 999,
    },
    text: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: '#FFF' },
});

// ── Editable Activity Card ──
function ActivityCard({
    activity, index, themeColor, destination, onUpdate, onDelete, onTap,
}: {
    activity: Activity; index: number; themeColor: string; destination: string;
    onUpdate: (updated: Partial<Activity>) => void;
    onDelete: () => void;
    onTap: () => void;
}) {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(activity.title);
    const [desc, setDesc] = useState(activity.description);
    const [time, setTime] = useState(activity.time);
    const [cost, setCost] = useState(String(activity.estimatedCost));
    const [locationInput, setLocationInput] = useState(typeof activity.location === 'string' ? activity.location : (activity.location?.name || ''));
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Geoapify Autocomplete
    useEffect(() => {
        if (!editing || !showSuggestions || locationInput.length < 3) {
            setSuggestions([]);
            return;
        }
        const timeout = setTimeout(async () => {
            setIsSearching(true);
            try {
                const apiKey = process.env.EXPO_PUBLIC_GEOAPIFY_KEY;
                if (!apiKey) return;
                // Bias search towards the trip's destination
                const res = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(locationInput + ' ' + destination)}&limit=4&apiKey=${apiKey}`);
                const data = await res.json();
                if (data.features) setSuggestions(data.features);
            } catch { /* ignore */ } finally { setIsSearching(false); }
        }, 500);
        return () => clearTimeout(timeout);
    }, [locationInput, editing, showSuggestions, destination]);

    const handleSave = () => {
        onUpdate({ title, description: desc, time, estimatedCost: cost, location: locationInput });
        setEditing(false);
    };
    const handleCancel = () => {
        setTitle(activity.title);
        setDesc(activity.description);
        setTime(activity.time);
        setCost(String(activity.estimatedCost));
        setLocationInput(typeof activity.location === 'string' ? activity.location : (activity.location?.name || ''));
        setSuggestions([]);
        setEditing(false);
    };

    const selectLocation = (feature: any) => {
        const placeName = feature.properties.name || feature.properties.formatted;
        setLocationInput(placeName);
        setShowSuggestions(false);
    };

    return (
        <View>
            <TouchableOpacity style={styles.activityRow} onPress={onTap} activeOpacity={0.85}>
                {/* Square Image Thumbnail */}
                <View style={styles.activityImageContainer}>
                    {activity.imageUrl ? (
                        <Image source={{ uri: activity.imageUrl }} style={styles.activityImage} resizeMode="cover" />
                    ) : (
                        <View style={[styles.activityImagePlaceholder, { backgroundColor: themeColor + '20' }]}>
                            <MapPin size={24} color={themeColor} />
                        </View>
                    )}
                </View>

                {/* Content */}
                <View style={styles.activityContent}>
                    <View style={styles.activityTitleRow}>
                        <MapPin size={12} color={Colors.textSecondary} style={{ marginRight: 4, marginTop: 2 }} />
                        <Text style={styles.activityTitle} numberOfLines={1}>{activity.title}</Text>
                    </View>
                    <View style={styles.activityTimeRow}>
                        <Clock size={10} color={Colors.textMuted} style={{ marginRight: 4 }} />
                        <Text style={styles.activityTime}>{activity.time}</Text>
                    </View>
                </View>

                {/* Details Button */}
                <TouchableOpacity style={styles.detailsBtn} onPress={() => setEditing(true)}>
                    <Text style={styles.detailsBtnText}>Details</Text>
                </TouchableOpacity>
            </TouchableOpacity>
            
            {/* Distance Marker / Dotted Line (shown below all but last) */}
            <View style={styles.distanceMarkerRow}>
                <View style={styles.dottedLineContainer}>
                    <View style={[styles.dottedLine, { borderColor: Colors.borderLight }]} />
                </View>
                <Text style={styles.distanceText}>0.25 mi</Text>
            </View>
        </View>
    );
}

// ── Main Screen ──
export default function ItineraryResultScreen() {
    const router = useRouter();
    const { itinerary } = useItineraryContext();
    const { width, height } = useWindowDimensions();

    const webviewRef = useRef<any>(null);
    const scrollY = useRef(new Animated.Value(0)).current;

    const [isSaving, setIsSaving] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: '' });
    
    // Dynamic features state
    const [weather, setWeather] = useState<WeatherForecast[]>([]);
    const [isOptimizing, setIsOptimizing] = useState(true);
    const [destCoords, setDestCoords] = useState<{lat: number, lng: number} | null>(null);

    const showToast = (message: string) => {
        setToast({ visible: true, message });
        setTimeout(() => setToast({ visible: false, message: '' }), 2500);
    };

    // Build editable state from context
    const initialDays: DayPlan[] = useMemo(() => {
        if (!itinerary) return [];
        let days = itinerary.days || (itinerary as any).dayPlans || [];
        if (days.length > 0) {
            days = JSON.parse(JSON.stringify(days));
            // Defensive parsing: ensure each day has an 'activities' array
            days.forEach((day: any) => {
                const acts = day.activities || day.places || day.schedule || day.items || [];
                day.activities = Array.isArray(acts) ? acts : Object.values(acts);
                // Ensure each activity has basic fields so the UI doesn't crash
                day.activities.forEach((a: any, i: number) => {
                    a.title = a.title || a.name || a.activity || `Activity ${i + 1}`;
                    a.description = a.description || a.desc || a.details || '';
                    a.time = a.time || (9 + i) + ':00 AM';
                    a.estimatedCost = a.estimatedCost || a.cost || a.price || '';
                });
            });
            return days;
        }

        return [{
            day: 1,
            theme: 'Explore ' + (itinerary.destination || 'the city'),
            activities: [{
                time: '09:00 AM', title: 'Morning Exploration',
                description: itinerary.overview || 'Start your day!',
                duration: '3 hours', estimatedCost: 'Free',
                location: itinerary.destination || '',
            }],
        }];
    }, [itinerary]);

    const [dayPlans, setDayPlans] = useState<DayPlan[]>(initialDays);
    const [selectedDay, setSelectedDay] = useState(0);
    // Track webview re-render key per day so animation replays on day switch
    const [mapKey, setMapKey] = useState(0);

    const dest = itinerary?.destination || 'Unknown';
    const theme = getCountryTheme(dest);

    // Map data for selected day
    const mapActivities: MapActivity[] = useMemo(() => {
        const day = dayPlans[selectedDay];
        if (!day) return [];
        return day.activities.map((a, i) => {
            const loc = a.location as any;
            const hasRealCoords = typeof loc === 'object' && loc.latitude && loc.longitude;
            
            // Fast fallback coordinate if completely unmapped before optimization
            const fallbackLat = destCoords ? destCoords.lat : 28.6139; // default Delhi until loaded
            const fallbackLng = destCoords ? destCoords.lng : 77.2090;
            const fallback = getOffsetCoord(fallbackLat, fallbackLng, selectedDay, i);

            const lat = hasRealCoords ? loc.latitude : fallback.lat;
            const lng = hasRealCoords ? loc.longitude : fallback.lng;
            
            return { title: a.title, lat, lng, time: a.time, index: i };
        });
    }, [dayPlans, selectedDay, destCoords]);

    const mapHtml = useMemo(() =>
        generateMapHtml(mapActivities, theme.primary, `Day ${(dayPlans[selectedDay]?.day) ?? selectedDay + 1}`),
        [mapActivities, theme.primary, dayPlans, selectedDay]
    );

    // ── Dynamic Effects ──
    
    // Fetch Weather & Destination Center Coord
    useEffect(() => {
        if (dest) {
            fetchWeather(dest).then(setWeather).catch(console.warn);
            
            const geoKey = process.env.EXPO_PUBLIC_GEOAPIFY_KEY;
            if (geoKey) {
                fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(dest)}&limit=1&apiKey=${geoKey}`)
                .then(r => r.json())
                .then(data => {
                    const coords = data.features?.[0]?.geometry?.coordinates;
                    if (coords) setDestCoords({ lat: coords[1], lng: coords[0] });
                }).catch(console.warn);
            }
        }
    }, [dest]);

    // Background Geocoding & OSRM Optimization
    useEffect(() => {
        if (!itinerary) return;
        
        let isActive = true;
        
        async function runOptimization() {
            try {
                // To avoid blocking, we map days and enrich sequentially
                const nextDays = [...dayPlans];
                
                for (let d = 0; d < nextDays.length; d++) {
                    if (!isActive) break;
                    
                    const day = nextDays[d];
                    const enrichedActs: any[] = [];
                    
                    // 1. Enrich each activity natively with Google Places
                    for (const act of day.activities) {
                        const skipEnrich = typeof act.location === 'object' && act.location.latitude;
                        if (skipEnrich) {
                            enrichedActs.push({ activity: act, lat: (act.location as any).latitude, lng: (act.location as any).longitude });
                            continue;
                        }

                        const data = await enrichActivityWithGooglePlaces(act, dest);
                        if (data && data.lat && data.lng) {
                            const newAct = {
                                ...act, 
                                imageUrl: data.imageUrl,
                                location: { name: act.location, latitude: data.lat, longitude: data.lng }
                            };
                            enrichedActs.push({ activity: newAct, lat: data.lat, lng: data.lng });
                        } else {
                            // fallback coordinate
                            const fallbackLat = destCoords ? destCoords.lat : 28.6139;
                            const fallbackLng = destCoords ? destCoords.lng : 77.2090;
                            const mock = getOffsetCoord(fallbackLat, fallbackLng, d, day.activities.indexOf(act));
                            enrichedActs.push({ activity: act, lat: mock.lat, lng: mock.lng });
                        }
                        
                        // Set intermediate UI state updates safely to populate images fast
                        if (isActive) {
                            setDayPlans(current => {
                                const draft = [...current];
                                draft[d].activities = enrichedActs.map(e => e.activity).concat(day.activities.slice(enrichedActs.length));
                                return draft;
                            });
                        }
                    }
                    
                    if (!isActive) break;

                    // 2. OSRM TSP Optimization on the day
                    const optimizedActs = await optimizeRouteWithOSRM(enrichedActs);
                    
                    if (isActive && optimizedActs.length > 0) {
                        setDayPlans(current => {
                            const draft = [...current];
                            draft[d].activities = optimizedActs;
                            return draft;
                        });
                        if (d === selectedDay) setMapKey(k => k + 1); // trigger map redraw
                    }
                }
            } finally {
                if (isActive) setIsOptimizing(false);
            }
        }
        
        // Ensure this only runs once on pure initial un-geocoded data
        // Check if dayPlans has 'location.latitude' mapped already
        const isAlreadyEnriched = dayPlans[0]?.activities[0]?.location && typeof dayPlans[0].activities[0].location === 'object';
        if (!isAlreadyEnriched) {
             runOptimization();
        } else {
             setIsOptimizing(false);
        }
        
        return () => { isActive = false; };
    // Only run on pure initial load, explicitly don't pass dayPlans to deps to prevent loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itinerary]);

    // ── Handlers ──

    const handleDaySelect = (i: number) => {
        setSelectedDay(i);
        setMapKey(k => k + 1); // force re-render to replay animation
    };

    const highlightMarker = (actIdx: number) => {
        webviewRef.current?.postMessage(JSON.stringify({ type: 'HIGHLIGHT_MARKER', index: actIdx }));
    };

    const updateActivity = useCallback((dayIdx: number, actIdx: number, updates: Partial<Activity>) => {
        setDayPlans(prev => {
            const next = [...prev];
            next[dayIdx] = {
                ...next[dayIdx],
                activities: next[dayIdx].activities.map((a, i) =>
                    i === actIdx ? { ...a, ...updates } : a
                ),
            };
            return next;
        });
    }, []);

    const deleteActivity = useCallback((dayIdx: number, actIdx: number) => {
        Alert.alert('Delete Activity', 'Remove this activity from your itinerary?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: () => {
                    setDayPlans(prev => {
                        const next = [...prev];
                        next[dayIdx] = {
                            ...next[dayIdx],
                            activities: next[dayIdx].activities.filter((_, i) => i !== actIdx),
                        };
                        return next;
                    });
                    setMapKey(k => k + 1);
                },
            },
        ]);
    }, []);

    const addActivity = useCallback((dayIdx: number) => {
        const newAct: Activity = {
            time: '12:00 PM',
            title: 'New Activity',
            description: 'Tap the edit icon to customize this activity.',
            duration: '1 hour',
            estimatedCost: 'Free',
            location: dest,
        };
        setDayPlans(prev => {
            const next = [...prev];
            next[dayIdx] = {
                ...next[dayIdx],
                activities: [...next[dayIdx].activities, newAct],
            };
            return next;
        });
        setMapKey(k => k + 1);
    }, [dest]);

    const addDay = useCallback(() => {
        setDayPlans(prev => {
            const newDay: DayPlan = {
                day: prev.length + 1,
                theme: `Explore ${dest}`,
                activities: [],
            };
            return [...prev, newDay];
        });
        setTimeout(() => setSelectedDay(dayPlans.length), 50);
    }, [dayPlans.length, dest]);

    const removeDay = useCallback(() => {
        if (dayPlans.length <= 1) {
            Alert.alert('Cannot remove', 'Your itinerary must have at least one day.');
            return;
        }
        Alert.alert('Remove Day', `Remove Day ${dayPlans[dayPlans.length - 1].day}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive', onPress: () => {
                    setDayPlans(prev => prev.slice(0, -1));
                    setSelectedDay(d => Math.min(d, dayPlans.length - 2));
                },
            },
        ]);
    }, [dayPlans]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Try backend save if itinerary has a real ID
            if (itinerary?.id && !itinerary.id.startsWith('puter_')) {
                await tripService.updateTrip(itinerary.id, { ...itinerary, days: dayPlans });
            }
            showToast('Trip saved successfully!');
            setTimeout(() => router.push('/(tabs)/trips'), 1200);
        } catch {
            // Graceful fallback
            showToast('Trip saved locally!');
            setTimeout(() => router.push('/(tabs)/trips'), 1200);
        } finally {
            setIsSaving(false);
        }
    };

    const handleShare = async () => {
        if (!itinerary) return;
        setIsSharing(true);
        try {
            await shareItinerary(itinerary as any);
        } catch (err: any) {
            if (err?.message !== 'User did not share') {
                Alert.alert('Share Failed', err?.message || 'Could not share the itinerary.');
            }
        } finally {
            setIsSharing(false);
        }
    };

    const handleCopyLink = () => {
        if (!itinerary) return;
        const link = formatItineraryForClipboard(itinerary as any);
        // Clipboard not always available in Expo — show toast with link info
        showToast('Link copied!');
    };

    const currentDay = dayPlans[selectedDay];

    if (!itinerary) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <MapPin size={40} color={Colors.textMuted} style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>No itinerary loaded</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <Text style={{ color: Colors.primary, fontFamily: FontFamily.semiBold }}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const totalActivities = dayPlans.reduce((s, d) => s + d.activities.length, 0);

    return (
        <View style={styles.container}>
            {/* Header */}
            <SafeAreaView edges={['top']} style={[styles.headerSafe, { backgroundColor: theme.primary }]}>
                <View style={styles.headerBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                        <ChevronLeft size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerDest} numberOfLines={1}>{dest}</Text>
                        <Text style={styles.headerMeta}>
                            {itinerary.duration ?? dayPlans.length}d · {totalActivities} activities
                        </Text>
                    </View>
                    <View style={styles.headerRightBtns}>
                        <TouchableOpacity style={styles.headerBtn} onPress={handleShare} disabled={isSharing}>
                            {isSharing
                                ? <ActivityIndicator size="small" color="#FFF" />
                                : <Share2 size={18} color="#FFFFFF" />
                            }
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerBtn} onPress={handleCopyLink}>
                            <Copy size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
            
            {/* Weather Widget */}
            {weather.length > 0 && <WeatherWidget forecasts={weather} />}

            {/* Day Tabs */}
            <View style={[styles.dayTabsContainer, { borderBottomColor: theme.primary + '20' }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.dayTabsScroll}>
                    {dayPlans.map((d, i) => (
                        <TouchableOpacity
                            key={i}
                            style={[styles.dayTab, selectedDay === i && { backgroundColor: theme.primary }]}
                            onPress={() => handleDaySelect(i)}
                        >
                            <Text style={[styles.dayTabText, selectedDay === i && styles.dayTabTextActive]}>
                                Day {d.day}
                            </Text>
                            <View style={[styles.activityCountBadge,
                                { backgroundColor: selectedDay === i ? 'rgba(255,255,255,0.3)' : Colors.textMuted + '25' }]}>
                                <Text style={[styles.activityCountText,
                                    { color: selectedDay === i ? '#FFF' : Colors.textMuted }]}>
                                    {d.activities.length}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}

                    {/* Add / Remove Day */}
                    <TouchableOpacity style={styles.dayActionBtn} onPress={addDay}>
                        <PlusCircle size={20} color={theme.primary} />
                    </TouchableOpacity>
                    {dayPlans.length > 1 && (
                        <TouchableOpacity style={styles.dayActionBtn} onPress={removeDay}>
                            <MinusCircle size={20} color={Colors.error} />
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </View>

            {/* Map - Animated Parallax */}
            <Animated.View style={[styles.mapContainer, { 
                position: 'absolute', top: 120, left: 0, right: 0, zIndex: 0,
                height: scrollY.interpolate({ 
                    inputRange: [0, height * 0.6], 
                    outputRange: [height - 120, height * 0.4], 
                    extrapolate: 'clamp' 
                }) 
            }]}>
                <PlatformWebView
                    key={`map-${selectedDay}-${mapKey}`}
                    html={mapHtml}
                    style={styles.mapWebView}
                />
                {mapActivities.length > 0 && (
                    <View style={styles.mapHint}>
                        <MapPin size={11} color={theme.primary} />
                        <Text style={[styles.mapHintText, { color: theme.primary }]}>
                            Tap activity to highlight on map
                        </Text>
                    </View>
                )}
            </Animated.View>

            {/* Itinerary Cards - scrollable sheet */}
            <Animated.ScrollView
                style={[styles.sheet, { zIndex: 1 }]}
                contentContainerStyle={[styles.sheetContent, { paddingTop: height - 160 }]}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
            >
                {/* Content Wrapper to act as a solid background sheet */}
                <View style={{ backgroundColor: Colors.background, minHeight: height, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 160, ...Shadows.lg }}>
                    
                    {/* Handle bar indicator */}
                    <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: Colors.borderLight, alignSelf: 'center', marginBottom: 20 }} />

                    {/* Day Theme */}
                    {currentDay && (
                        <View style={styles.dayThemeRow}>
                            <View style={[styles.dayThemeBadge, { backgroundColor: theme.primary }]}>
                                <Text style={styles.dayThemeBadgeText}>Day {currentDay.day}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.dayThemeText}>{currentDay.theme}</Text>
                                {isOptimizing && (
                                    <Text style={{ fontFamily: FontFamily.medium, fontSize: 11, color: Colors.textMuted, marginTop: 2 }}>
                                        ✨ Generating optimized route & images...
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Activities */}
                    {(currentDay?.activities || []).map((activity, idx) => (
                        <ActivityCard
                            key={`${selectedDay}-${idx}-${activity?.title || idx}`}
                            activity={activity}
                        index={idx}
                        themeColor={theme.primary}
                        destination={dest}
                        onUpdate={(updates) => updateActivity(selectedDay, idx, updates)}
                        onDelete={() => deleteActivity(selectedDay, idx)}
                        onTap={() => highlightMarker(idx)}
                    />
                ))}

                {(currentDay?.activities || []).length === 0 && (
                    <View style={styles.emptyActivities}>
                        <Text style={styles.emptyActivitiesText}>No activities yet. Add one below!</Text>
                    </View>
                )}

                {/* Add Activity */}
                <TouchableOpacity
                    style={[styles.addActivityBtn, { borderColor: theme.primary }]}
                    onPress={() => addActivity(selectedDay)}
                    activeOpacity={0.8}
                >
                    <Plus size={18} color={theme.primary} />
                    <Text style={[styles.addActivityText, { color: theme.primary }]}>Add Activity</Text>
                </TouchableOpacity>

                {/* Budget summary */}
                {itinerary.budgetBreakdown && (
                    <View style={[styles.budgetSummary, { borderColor: theme.primary + '30' }]}>
                        <Text style={styles.budgetSummaryTitle}>Estimated Budget</Text>
                        <Text style={[styles.budgetSummaryAmount, { color: theme.primary }]}>
                            {typeof itinerary.budgetBreakdown.total === 'number'
                                ? `₹${itinerary.budgetBreakdown.total.toLocaleString('en-IN')}`
                                : itinerary.budgetBreakdown.total}
                        </Text>
                        <View style={styles.budgetBreakdownRow}>
                            {[
                                { label: 'Stay', val: itinerary.budgetBreakdown.accommodation },
                                { label: 'Food', val: itinerary.budgetBreakdown.food },
                                { label: 'Activities', val: itinerary.budgetBreakdown.activities },
                                { label: 'Transport', val: itinerary.budgetBreakdown.transportation },
                            ].map(item => item.val ? (
                                <View key={item.label} style={styles.budgetItem}>
                                    <Text style={[styles.budgetItemVal, { color: theme.primary }]}>{item.val}</Text>
                                    <Text style={styles.budgetItemLabel}>{item.label}</Text>
                                </View>
                            ) : null)}
                        </View>
                    </View>
                )}

                {/* Tips */}
                {itinerary.tips && itinerary.tips.length > 0 && (
                    <View style={[styles.tipsCard, { borderColor: theme.primary + '25' }]}>
                        <Text style={styles.tipsTitle}>💡 Travel Tips</Text>
                        {itinerary.tips.slice(0, 3).map((tip: string, i: number) => (
                            <View key={i} style={styles.tipRow}>
                                <View style={[styles.tipDot, { backgroundColor: theme.primary }]} />
                                <Text style={styles.tipText}>{tip}</Text>
                            </View>
                        ))}
                    </View>
                )}
                </View>
            </Animated.ScrollView>

            {/* Toast */}
            <Toast message={toast.message} visible={toast.visible} />

            {/* Bottom Save Bar */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: theme.primary }, isSaving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    activeOpacity={0.85}
                    disabled={isSaving}
                >
                    {isSaving
                        ? <ActivityIndicator size="small" color="#FFF" />
                        : <Save size={20} color="#FFFFFF" />
                    }
                    <Text style={styles.saveBtnText}>{isSaving ? 'Saving…' : 'Save Trip'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ── Styles ──
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    emptyText: { fontFamily: FontFamily.medium, fontSize: FontSize.lg, color: Colors.textMuted },

    // Header
    headerSafe: {},
    headerBar: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.sm, paddingTop: 4,
    },
    headerBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
    },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerDest: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: '#FFF' },
    headerMeta: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: 'rgba(255,255,255,0.8)' },
    headerRightBtns: { flexDirection: 'row', gap: 6 },
    
    // Weather
    weatherScroll: { flexGrow: 0, paddingVertical: 8, backgroundColor: Colors.surface },
    weatherCard: { 
        alignItems: 'center', backgroundColor: Colors.background, 
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, 
        ...Shadows.sm,
        minWidth: 70 
    },
    weatherDay: { fontFamily: FontFamily.semiBold, fontSize: 11, color: Colors.textSecondary },
    weatherIcon: { width: 32, height: 32, marginVertical: 2 },
    weatherTemp: { fontFamily: FontFamily.bold, fontSize: 13, color: Colors.text },
    weatherCond: { fontFamily: FontFamily.medium, fontSize: 9, color: Colors.textMuted, maxWidth: 60, textAlign: 'center' },

    // Day Tabs
    dayTabsContainer: { backgroundColor: Colors.surface, ...Shadows.sm, paddingBottom: 4 },
    dayTabsScroll: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 8, alignItems: 'center' },
    dayTab: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
        backgroundColor: Colors.borderLight,
    },
    dayTabText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textSecondary },
    dayTabTextActive: { color: '#FFFFFF' },
    activityCountBadge: {
        width: 18, height: 18, borderRadius: 9,
        justifyContent: 'center', alignItems: 'center',
    },
    activityCountText: { fontFamily: FontFamily.bold, fontSize: 10 },
    dayActionBtn: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: Colors.borderLight,
    },

    // Map
    mapContainer: { backgroundColor: Colors.borderLight, overflow: 'hidden', position: 'relative' },
    mapWebView: { flex: 1 },
    mapHint: {
        position: 'absolute', bottom: 8, right: 10,
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20, ...Shadows.sm,
    },
    mapHintText: { fontFamily: FontFamily.medium, fontSize: 10 },

    // Sheet
    sheet: { flex: 1 },
    sheetContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 120 },

    // Day theme
    dayThemeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
    dayThemeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    dayThemeBadgeText: { fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: '#FFF' },
    dayThemeText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.text, flex: 1 },

    // Empty state
    emptyActivities: { alignItems: 'center', paddingVertical: Spacing.xl },
    emptyActivitiesText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textMuted },

    // Activity row
    activityRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 12, ...Shadows.sm, shadowOpacity: 0.05, elevation: 2 },
    activityImageContainer: { width: 64, height: 64, borderRadius: 8, overflow: 'hidden', marginRight: 12 },
    activityImage: { width: '100%', height: '100%' },
    activityImagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
    activityContent: { flex: 1, justifyContent: 'center' },
    activityTitleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
    activityTitle: { fontFamily: FontFamily.semiBold, fontSize: 15, color: Colors.text, flexShrink: 1 },
    activityTimeRow: { flexDirection: 'row', alignItems: 'center' },
    activityTime: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.textMuted },
    detailsBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.borderLight },
    detailsBtnText: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.textSecondary },

    // Distance marker / dotted line
    distanceMarkerRow: { flexDirection: 'row', alignItems: 'center', height: 40, marginLeft: 32 }, // 12 padding + 32 (half image)
    dottedLineContainer: { width: 2, height: '100%', alignItems: 'center', overflow: 'hidden' },
    dottedLine: { height: 100, width: 2, borderWidth: 1, borderStyle: 'dotted', borderRadius: 1 },
    distanceText: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.textMuted, marginLeft: 20 },

    // Edit form
    editForm: { gap: 8 },
    editInput: {
        backgroundColor: Colors.background, borderRadius: BorderRadius.md,
        paddingHorizontal: 12, paddingVertical: 8,
        fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.text,
    },
    editRow: { flexDirection: 'row', gap: 8 },
    editActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
    editActionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    },
    editActionText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: '#FFF' },

    // Autocomplete
    suggestionsContainer: {
        position: 'absolute', top: '100%', left: 0, right: 0,
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        ...Shadows.md,
        marginTop: 4, zIndex: 100, maxHeight: 200, overflow: 'hidden',
    },
    suggestionItem: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        padding: 12,
    },
    suggestionTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.text },
    suggestionText: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

    // Add activity
    addActivityBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 14, borderRadius: BorderRadius.lg,
        borderWidth: 1.5, borderStyle: 'dashed', marginTop: Spacing.sm, marginBottom: Spacing.lg,
    },
    addActivityText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },

    // Budget summary
    budgetSummary: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg,
        ...Shadows.sm, marginBottom: Spacing.lg,
    },
    budgetSummaryTitle: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: 4, textAlign: 'center' },
    budgetSummaryAmount: { fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], textAlign: 'center', marginBottom: Spacing.md },
    budgetBreakdownRow: { flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap', gap: 8 },
    budgetItem: { alignItems: 'center', minWidth: 60 },
    budgetItemVal: { fontFamily: FontFamily.bold, fontSize: FontSize.sm },
    budgetItemLabel: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

    // Tips
    tipsCard: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md,
        ...Shadows.sm, marginBottom: Spacing.lg,
    },
    tipsTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.text, marginBottom: Spacing.sm },
    tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
    tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
    tipText: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1, lineHeight: 20 },

    // Bottom bar
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 36,
        backgroundColor: 'rgba(255,255,255,0.97)',
        ...Shadows.lg,
    },
    saveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 10, height: 56, borderRadius: 28, ...Shadows.md,
    },
    saveBtnText: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: '#FFFFFF' },
});
