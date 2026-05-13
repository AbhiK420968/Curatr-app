import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    Animated, Alert, ActivityIndicator, useWindowDimensions, Easing,
    NativeSyntheticEvent, NativeScrollEvent, FlatList, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants';
import {
    Sparkles, MapPin, Download, ArrowRight, ChevronLeft, ChevronRight, Calendar as CalendarIcon,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { generateGeminiItinerary } from '@/services/geminiService';
import { saveProfile, loadProfile } from '@/services/profileStore';
import { logRegeneration } from '@/services/sessionLog';
import { tripService } from '@/services';
import { useItineraryContext } from '@/contexts/itinerary-context';

// ── Data ──
const VIBES = [
    { key: 'Chill', emoji: '😌' },
    { key: 'Party', emoji: '🥳' },
    { key: 'Culture', emoji: '🏛️' },
    { key: 'Adventure', emoji: '🏔️' },
    { key: 'Foodie', emoji: '🍜' },
    { key: 'Romantic', emoji: '💕' },
    { key: 'Solo', emoji: '🎒' },
    { key: 'Family', emoji: '👨‍👩‍👧' },
];

const BUDGET_TIERS = [
    { key: 'Budget', label: 'Budget', range: '₹5K–20K', emoji: '🎒' },
    { key: 'Moderate', label: 'Moderate', range: '₹20K–60K', emoji: '💰' },
    { key: 'Luxury', label: 'Luxury', range: '₹60K+', emoji: '👑' },
];

const DAYS_OPTIONS = Array.from({ length: 21 }, (_, i) => i + 1);
const PEOPLE_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);

const STEP_COUNT = 5;
const ITEM_HEIGHT = 64;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

// ── Scroll Wheel ──
function ScrollWheel<T extends string | number>({
    data, selectedIndex, onSelect, renderLabel,
}: {
    data: T[];
    selectedIndex: number;
    onSelect: (index: number) => void;
    renderLabel: (item: T, index: number) => string;
}) {
    const scrollRef = useRef<FlatList>(null);
    const [scrollY, setScrollY] = useState(selectedIndex * ITEM_HEIGHT);
    const paddedData = [null, null, ...data, null, null] as (T | null)[];

    useEffect(() => {
        setTimeout(() => {
            scrollRef.current?.scrollToOffset({ offset: selectedIndex * ITEM_HEIGHT, animated: false });
        }, 50);
    }, []);

    const handleMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = e.nativeEvent.contentOffset.y;
        const idx = Math.round(y / ITEM_HEIGHT);
        const clamped = Math.max(0, Math.min(data.length - 1, idx));
        if (clamped !== selectedIndex) onSelect(clamped);
    }, [data.length, selectedIndex, onSelect]);

    const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        setScrollY(e.nativeEvent.contentOffset.y);
    }, []);

    const centerOffset = scrollY + ITEM_HEIGHT * 2;
    const centerIndex = Math.round(scrollY / ITEM_HEIGHT) + 2;

    const renderItem = useCallback(({ item, index }: { item: T | null; index: number }) => {
        if (item === null) return <View style={{ height: ITEM_HEIGHT }} />;
        const itemCenter = index * ITEM_HEIGHT + ITEM_HEIGHT / 2;
        const dist = Math.abs(itemCenter - centerOffset);
        const ratio = Math.max(0, 1 - dist / (ITEM_HEIGHT * 2.5));
        const isCenter = index === centerIndex;
        return (
            <View style={[styles.wheelItem, { height: ITEM_HEIGHT }]}>
                <Text style={[styles.wheelItemText, {
                    opacity: 0.2 + ratio * 0.8,
                    fontSize: 16 + ratio * 10,
                    fontFamily: isCenter ? FontFamily.bold : FontFamily.medium,
                    color: isCenter ? Colors.primary : Colors.text,
                }]}>
                    {renderLabel(item, index - 2)}
                </Text>
            </View>
        );
    }, [centerOffset, renderLabel, centerIndex]);

    return (
        <View style={[styles.wheelContainer, { height: WHEEL_HEIGHT }]}>
            <View style={styles.wheelHighlight} pointerEvents="none" />
            <FlatList
                ref={scrollRef}
                data={paddedData}
                keyExtractor={(_, i) => String(i)}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handleMomentumEnd}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
            />
        </View>
    );
}

// ── View modes ──
type ScreenMode = 'home' | 'generate' | 'generating';

export default function CreateScreen() {
    const router = useRouter();
    const { setItinerary } = useItineraryContext();
    const { width, height } = useWindowDimensions();

    const [mode, setMode] = useState<ScreenMode>('home');

    // Wizard state
    const [step, setStep] = useState(0);
    const [destination, setDestination] = useState('');
    const [geoSuggestions, setGeoSuggestions] = useState<any[]>([]);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(false);

    // Calendar State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [vibeIndex, setVibeIndex] = useState(0);

    const [peopleIndex, setPeopleIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    // Track if we're regenerating (force-skip cache)
    const [isRegenerating, setIsRegenerating] = useState(false);

    // ── Load saved profile from Storage Layer on mount ──────────────────────
    useEffect(() => {
        loadProfile().then(profile => {
            setVibeIndex(profile.vibeIndex || 0);
            setPeopleIndex(profile.peopleIndex || 0);
        }).catch(() => { /* use defaults on error */ });
    }, []);

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const neonAnim = useRef(new Animated.Value(0)).current;
    const homeAnim = useRef(new Animated.Value(1)).current;

    // Geoapify autocomplete
    useEffect(() => {
        if (selectedLocation || !destination || destination.length < 3) {
            setGeoSuggestions([]);
            return;
        }
        const timeout = setTimeout(async () => {
            setIsSearchingLocation(true);
            try {
                const apiKey = process.env.EXPO_PUBLIC_GEOAPIFY_KEY;
                if (!apiKey) return;
                const res = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(destination)}&type=city&limit=5&apiKey=${apiKey}`);
                const data = await res.json();
                if (data.features) setGeoSuggestions(data.features);
            } catch { /* ignore */ } finally { setIsSearchingLocation(false); }
        }, 500);
        return () => clearTimeout(timeout);
    }, [destination, selectedLocation]);

    const handleSelectLocation = (locationName: string) => {
        setDestination(locationName);
        setSelectedLocation(true);
        setGeoSuggestions([]);
        animateTransition('forward', () => setStep(1));
    };

    const enterGenerateMode = () => {
        Animated.timing(homeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
            setMode('generate');
            setStep(0);
            fadeAnim.setValue(0);
            slideAnim.setValue(30);
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start();
        });
    };

    const exitToHome = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 30, duration: 150, useNativeDriver: true }),
        ]).start(() => {
            setMode('home');
            setStep(0);
            setDestination('');
            setGeoSuggestions([]);
            setSelectedLocation(false);
            homeAnim.setValue(0);
            Animated.timing(homeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        });
    };

    const animateTransition = (direction: 'forward' | 'back', callback: () => void) => {
        const out = direction === 'forward' ? -width * 0.25 : width * 0.25;
        const inStart = direction === 'forward' ? width * 0.25 : -width * 0.25;
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 130, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: out, duration: 130, useNativeDriver: true }),
        ]).start(() => {
            callback();
            slideAnim.setValue(inStart);
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
            ]).start();
        });
    };

    const goNext = () => {
        if (step === 0 && !destination.trim()) return;
        if (step < STEP_COUNT - 1) {
            animateTransition('forward', () => setStep(s => s + 1));
        } else {
            handleGenerate(isRegenerating);
        }
    };

    const goBack = () => {
        if (step > 0) {
            animateTransition('back', () => setStep(s => s - 1));
        } else {
            exitToHome();
        }
    };

    // ── Neon progress animation ──
    useEffect(() => {
        if (mode === 'generating') {
            neonAnim.setValue(0);
            Animated.loop(
                Animated.sequence([
                    Animated.timing(neonAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
                    Animated.timing(neonAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: false }),
                ])
            ).start();
        }
    }, [mode]);

    const handleGenerate = async (forceRefresh = false, prefOverrides?: { budget?: string; duration?: number }) => {
        setMode('generating');
        setProgress(0);

        const duration = prefOverrides?.duration ?? (
            dateMode === 'flexible' || !startDate || !endDate
                ? flexDays
                : Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) + 1
        );

        const budget = prefOverrides?.budget ?? (budgetCard === 'budget' ? '₹5K–20K' : budgetCard === 'luxury' ? '₹60K+' : '₹20K–60K');

        const preferences = {
            destination: destination.trim(),
            duration,
            budget,
            travelStyle: VIBES[vibeIndex].key as any,
            interests: [VIBES[vibeIndex].key],
            groupSize: PEOPLE_OPTIONS[peopleIndex],
        };

        // ── Save profile to Storage Layer ──────────────────────────────────────
        saveProfile({ daysIndex: 0, vibeIndex, budgetIndex: 0, peopleIndex, lastDestination: destination.trim() })
            .catch(() => { /* non-blocking */ });

        // Log regeneration if applicable
        if (forceRefresh) {
            logRegeneration(destination.trim()).catch(() => { });
        }

        try {
            const itinerary = await generateGeminiItinerary(
                preferences,
                (progressUpdate) => {
                    setProgress(progressUpdate.progress);
                },
                forceRefresh
            );

            setProgress(100);

            setTimeout(() => {
                setItinerary(itinerary);
                setMode('home');
                setStep(0);
                setDestination('');
                setSelectedLocation(false);
                setIsRegenerating(false);
                homeAnim.setValue(1);
                router.push('/trip/itinerary-result');
            }, 400);
        } catch (err: any) {
            console.warn('[CreateScreen] Gemini failure, falling back to offline generator:', err?.message);
            try {
                const fallbackItinerary = generateOfflineItinerary(preferences);
                setProgress(100);
                setTimeout(() => {
                    setItinerary(fallbackItinerary);
                    setMode('home');
                    setStep(0);
                    setDestination('');
                    setSelectedLocation(false);
                    setIsRegenerating(false);
                    homeAnim.setValue(1);
                    router.push('/trip/itinerary-result');
                }, 400);
            } catch (offlineErr) {
                setMode('generate');
                Alert.alert(
                    'Generation Failed',
                    err?.message || 'Could not generate your itinerary. Check your API key and internet connection.',
                    [{ text: 'OK' }]
                );
            }
        }
    };

    /** Built-in offline itinerary generator — produces a rich realistic itinerary
     *  with no API calls needed. Used as final fallback when Puter + backend are unavailable. */
    function generateOfflineItinerary(prefs: { destination: string; duration: number; travelStyle: string; interests: string[]; groupSize?: number; budget: string }): any {
        const { destination, duration, travelStyle, interests, groupSize, budget } = prefs;
        const morningActivities = [
            {
                time: '8:00 AM', title: `Morning at ${destination} Old Town`,
                description: `Start your day exploring the historic heart of ${destination}. Walk through the winding streets, admire the architecture, and soak in the local atmosphere before the crowds arrive.`,
                duration: '2 hours', estimatedCost: 'Free', location: `${destination} Old Town`,
            },
            {
                time: '9:00 AM', title: `${destination} Local Market Visit`,
                description: `Visit the bustling local market — pick up fresh fruits, street snacks, and interact with friendly vendors. A real window into daily life.`,
                duration: '1.5 hours', estimatedCost: '₹200', location: `${destination} Central Market`,
            },
            {
                time: '8:30 AM', title: `Sunrise at ${destination} Viewpoint`,
                description: `Catch the golden hour from the best viewpoint in ${destination}. Bring a camera — the views are stunning and perfect for photography.`,
                duration: '1 hour', estimatedCost: 'Free', location: `${destination} Viewpoint`,
            },
        ];
        const afternoonActivities = [
            {
                time: '1:00 PM', title: `${destination} Museum & Heritage`,
                description: `Dive into the rich culture and history of ${destination} at the local museum. Fascinating exhibits illuminate the region's past.`,
                duration: '2 hours', estimatedCost: '₹300', location: `${destination} State Museum`,
            },
            {
                time: '2:00 PM', title: `Street Food Lunch Tour`,
                description: `Explore ${destination}'s vibrant food scene with a self-guided street food walk. Try local specialties, chat with vendors, and eat like a local.`,
                duration: '1.5 hours', estimatedCost: '₹400', location: `${destination} Food Street`,
            },
            {
                time: '1:30 PM', title: `${destination} Botanical Gardens`,
                description: `Take a leisurely stroll through beautifully manicured gardens. Perfect for a post-lunch walk and some relaxation.`,
                duration: '1 hour', estimatedCost: '₹100', location: `${destination} Gardens`,
            },
        ];
        const eveningActivities = [
            {
                time: '7:00 PM', title: `Dinner at Local Restaurant`,
                description: `Enjoy an authentic ${destination} dinner at a highly-rated local restaurant. Try the regional specialties and signature dishes.`,
                duration: '1.5 hours', estimatedCost: '₹800', location: `${destination} Restaurant District`,
            },
            {
                time: '8:30 PM', title: `Evening River/Lake Walk`,
                description: `End your day with a peaceful walk along the waterfront. Watch the city light up at night — a magical experience.`,
                duration: '1 hour', estimatedCost: 'Free', location: `${destination} Waterfront`,
            },
        ];

        const dayThemes = [
            'Iconic Landmarks & Heritage', 'Local Culture & Cuisine', 'Nature & Adventure',
            'Relaxation & Hidden Gems', 'Shopping & Nightlife', 'Day Trips & Excursions',
            'Art, Music & Local Life',
        ];

        const days = Array.from({ length: duration }, (_, i) => ({
            day: i + 1,
            theme: dayThemes[i % dayThemes.length],
            activities: [
                morningActivities[i % morningActivities.length],
                afternoonActivities[i % afternoonActivities.length],
                eveningActivities[i % eveningActivities.length],
            ],
            totalCost: '₹1,500',
        }));

        return {
            id: `offline_${Date.now()}`,
            userId: 'offline',
            destination,
            duration,
            overview: `A curated ${duration}-day ${travelStyle?.toLowerCase() || 'adventure'} in ${destination} for ${groupSize || 1} ${(groupSize || 1) === 1 ? 'person' : 'people'}. Discover the city's iconic landmarks, immerse yourself in local culture, and experience the best food and hidden gems ${destination} has to offer.`,
            bestTimeToVisit: 'October to March (pleasant weather)',
            days,
            dayPlans: days,
            budgetBreakdown: {
                accommodation: '₹12,000',
                food: '₹6,000',
                activities: '₹4,000',
                transportation: '₹3,000',
                miscellaneous: '₹2,000',
                total: `₹${(27000 * duration / 3).toLocaleString('en-IN')}`,
            },
            tips: [
                `Book accommodations in central ${destination} to minimize travel time.`,
                `Download offline maps before exploring — saves data and helps in low-signal areas.`,
                `Try local street food — it's often cheaper and more authentic than restaurants.`,
                `Visit major attractions early morning to avoid crowds.`,
                `Learn a few basic phrases in the local language — locals appreciate the effort.`,
            ],
            travelStyle,
            moodTags: interests,
            createdAt: new Date().toISOString(),
        };
    }

    const progressPercent = ((step + 1) / STEP_COUNT) * 100;
    // ── New Stitch wizard state (MUST be before any early returns) ──
    const [dateMode, setDateMode] = useState<'calendar' | 'flexible'>('calendar');
    const [flexDays, setFlexDays] = useState(3);
    const [travelerType, setTravelerType] = useState('Solo');
    const [budgetCard, setBudgetCard] = useState('moderate');

    const FLEX_DURATIONS = [
        { label: '3 Days', days: 3 }, { label: '5 Days', days: 5 },
        { label: '7 Days', days: 7 }, { label: '10 Days', days: 10 },
        { label: '2 Weeks', days: 14 }, { label: '3 Weeks', days: 21 },
    ];
    const TRAVELER_TYPES = [
        { key: 'Solo', emoji: '🧳', label: 'Solo' },
        { key: 'Couple', emoji: '💑', label: 'Couple' },
        { key: 'Friends', emoji: '👯', label: 'Friends' },
        { key: 'Family', emoji: '👨\u200d👩\u200d👧', label: 'Family' },
    ];
    const BUDGET_CARDS = [
        { key: 'budget', label: 'Budget', sublabel: '₹5K – 20K', emoji: '🎒', desc: 'Hostels, street food, public transit' },
        { key: 'moderate', label: 'Moderate', sublabel: '₹20K – 60K', emoji: '✈️', desc: 'Mid-range hotels, cafes, Ola/Uber' },
        { key: 'luxury', label: 'Luxury', sublabel: '₹60K+', emoji: '👑', desc: '5-star hotels, fine dining, private tours' },
    ];

    // Derived values (safe to compute here since no hooks below)
    const derivedBudget = budgetCard === 'budget' ? '₹5K–20K' : budgetCard === 'luxury' ? '₹60K+' : '₹20K–60K';
    const derivedDuration = dateMode === 'flexible' || !startDate || !endDate
        ? flexDays
        : Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) + 1;

    const stepTitles = [
        'Where to?',
        'When are you going?',
        "What's your vibe?",
        "What's your budget?",
        "Who's joining you?",
    ];
    const stepSubtitles = [
        'Tell us your dream destination',
        'Choose your travel dates',
        'Pick the feel of your trip',
        'Set a spending range',
        'Select your travel group',
    ];

    // ─────────────────────────────────────────────────────────
    // ── GENERATING view ──
    // ─────────────────────────────────────────────────────────
    if (mode === 'generating') {
        const neonWidth = neonAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['5%', `${Math.min(progress + 10, 100)}%`],
        });
        const dotLeft = neonAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['3%', `${Math.min(progress + 8, 97)}%`],
        });
        const duration = (dateMode === 'flexible' || !startDate || !endDate)
            ? flexDays
            : Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) + 1;
        return (
            <View style={styles.generatingContainer}>
                <SafeAreaView style={styles.generatingContent}>
                    <View style={styles.generatingTop}>
                        <Sparkles size={40} color={Colors.primary} />
                        <Text style={styles.generatingTitle}>Curating your trip</Text>
                        <Text style={styles.generatingSubtitle}>
                            {duration} day{duration !== 1 ? 's' : ''} in {destination}
                        </Text>
                    </View>
                    <View style={styles.neonBarSection}>
                        <View style={styles.neonTrack}>
                            <Animated.View style={[styles.neonFill, { width: neonWidth }]} />
                            <Animated.View style={[styles.neonDot, { left: dotLeft }]} />
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    // ── Calendar Logic ──
    const handleDayPress = (day: any) => {
        if (!startDate || (startDate && endDate)) {
            setStartDate(day.dateString);
            setEndDate('');
        } else if (startDate && !endDate) {
            const startObj = new Date(startDate);
            const endObj = new Date(day.dateString);
            if (endObj < startObj) {
                setStartDate(day.dateString);
                setEndDate('');
            } else {
                setEndDate(day.dateString);
            }
        }
    };

    const getMarkedDates = () => {
        let marked: any = {};
        if (startDate) {
            marked[startDate] = { startingDay: true, color: Colors.primary, textColor: 'white' };
        }
        if (endDate) {
            marked[endDate] = { endingDay: true, color: Colors.primary, textColor: 'white' };
            let current = new Date(startDate);
            const end = new Date(endDate);
            current.setDate(current.getDate() + 1);
            while (current < end) {
                const dateStr = current.toISOString().split('T')[0];
                marked[dateStr] = { color: Colors.primary + '25', textColor: Colors.text };
                current.setDate(current.getDate() + 1);
            }
        }
        return marked;
    };

    // ─────────────────────────────────────────────────────────
    // ── GENERATE WIZARD view ──
    // ─────────────────────────────────────────────────────────
    if (mode === 'generate') {
        return (
            <View style={styles.wizardContainer}>
                {/* Same gradient as home */}
                <LinearGradient
                    colors={['#a4351c', '#fdb19c', '#ffc4b7']}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.grainOverlay} />

                <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                    {/* Header */}
                    <View style={styles.wizardHeader}>
                        <TouchableOpacity onPress={goBack} style={styles.backButton}>
                            <ChevronLeft size={22} color="rgba(255,239,236,0.9)" />
                        </TouchableOpacity>
                        <Text style={styles.stepIndicator}>{step + 1}/{STEP_COUNT}</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBg}>
                            <View style={[styles.progressFill, { width: `${progressPercent}%` as any }]} />
                        </View>
                    </View>

                    {/* Step content */}
                    <Animated.ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={[styles.stepContent]}
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={step !== 0}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Text style={styles.stepTitle}>{stepTitles[step]}</Text>
                        <Text style={styles.stepSubtitle}>{stepSubtitles[step]}</Text>

                        {/* ── Step 0: Destination ── */}
                        {step === 0 && (
                            <View style={styles.destinationContainer}>
                                <View style={styles.destinationInput}>
                                    <MapPin size={22} color="rgba(255,239,236,0.7)" />
                                    <TextInput
                                        style={styles.destinationTextInput}
                                        placeholder="e.g. Tokyo, Bali, Paris"
                                        placeholderTextColor="rgba(255,239,236,0.4)"
                                        value={destination}
                                        onChangeText={(val) => { setDestination(val); setSelectedLocation(false); }}
                                        autoFocus
                                        autoCapitalize="words"
                                        returnKeyType="next"
                                        onSubmitEditing={goNext}
                                    />
                                </View>
                                {geoSuggestions.length > 0 && (
                                    <View style={styles.autocompleteContainer}>
                                        {geoSuggestions.map((feat, idx) => (
                                            <TouchableOpacity key={idx} style={styles.suggestionItem}
                                                onPress={() => handleSelectLocation(feat.properties.formatted)}>
                                                <MapPin size={15} color="#a4351c" />
                                                <Text style={styles.suggestionText} numberOfLines={1}>
                                                    {feat.properties.formatted}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                                {isSearchingLocation && geoSuggestions.length === 0 && (
                                    <View style={styles.autocompleteContainer}>
                                        <ActivityIndicator size="small" color="#a4351c" style={{ margin: Spacing.md }} />
                                    </View>
                                )}
                            </View>
                        )}

                        {/* ── Step 1: Dates ── */}
                        {step === 1 && (
                            <View style={{ width: '100%' }}>
                                <View style={styles.dateToggleRow}>
                                    <TouchableOpacity
                                        style={[styles.dateToggleBtn, dateMode === 'calendar' && styles.dateToggleBtnActive]}
                                        onPress={() => setDateMode('calendar')}
                                    >
                                        <CalendarIcon size={16} color={dateMode === 'calendar' ? '#a4351c' : 'rgba(255,239,236,0.7)'} />
                                        <Text style={[styles.dateToggleText, dateMode === 'calendar' && styles.dateToggleTextActive]}>Specific Dates</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.dateToggleBtn, dateMode === 'flexible' && styles.dateToggleBtnActive]}
                                        onPress={() => setDateMode('flexible')}
                                    >
                                        <Text style={[styles.dateToggleText, dateMode === 'flexible' && styles.dateToggleTextActive]}>🗓️  Flexible</Text>
                                    </TouchableOpacity>
                                </View>

                                {dateMode === 'calendar' ? (
                                    <View>
                                        <View style={styles.dateSummaryRow}>
                                            <View style={styles.dateSummaryChip}>
                                                <Text style={styles.dateSummaryLabel}>FROM</Text>
                                                <Text style={styles.dateSummaryValue}>{startDate || '—'}</Text>
                                            </View>
                                            <View style={[styles.dateSummaryChip, { opacity: endDate ? 1 : 0.4 }]}>
                                                <Text style={styles.dateSummaryLabel}>TO</Text>
                                                <Text style={styles.dateSummaryValue}>{endDate || '—'}</Text>
                                            </View>
                                            {startDate && endDate && (
                                                <View style={[styles.dateSummaryChip, { backgroundColor: 'rgba(164,53,28,0.3)' }]}>
                                                    <Text style={[styles.dateSummaryLabel, { color: '#fdb19c' }]}>NIGHTS</Text>
                                                    <Text style={[styles.dateSummaryValue, { color: '#fdb19c' }]}>
                                                        {Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={{ borderRadius: 20, overflow: 'hidden' }}>
                                            <Calendar
                                                markingType={'period'}
                                                markedDates={getMarkedDates()}
                                                onDayPress={handleDayPress}
                                                theme={{
                                                    backgroundColor: 'rgba(255,255,255,0.9)',
                                                    calendarBackground: 'rgba(255,255,255,0.9)',
                                                    textSectionTitleColor: '#a4351c',
                                                    selectedDayBackgroundColor: '#a4351c',
                                                    selectedDayTextColor: '#ffffff',
                                                    todayTextColor: '#a4351c',
                                                    dayTextColor: '#2c2f30',
                                                    textDisabledColor: '#bbb',
                                                    arrowColor: '#a4351c',
                                                    monthTextColor: '#2c2f30',
                                                    textDayFontFamily: FontFamily.medium,
                                                    textMonthFontFamily: FontFamily.bold,
                                                    textDayHeaderFontFamily: FontFamily.semiBold,
                                                }}
                                            />
                                        </View>
                                    </View>
                                ) : (
                                    <View>
                                        <Text style={styles.sectionLabel}>How many days?</Text>
                                        <View style={styles.flexDurationGrid}>
                                            {FLEX_DURATIONS.map(d => (
                                                <TouchableOpacity
                                                    key={d.days}
                                                    style={[styles.flexDurationChip, flexDays === d.days && styles.flexDurationChipActive]}
                                                    onPress={() => setFlexDays(d.days)}
                                                >
                                                    <Text style={[styles.flexDurationText, flexDays === d.days && styles.flexDurationTextActive]}>{d.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        <View style={styles.flexDurationPreview}>
                                            <Text style={styles.flexDurationPreviewText}>✈️  {flexDays}-day trip to {destination || 'your destination'}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* ── Step 2: Vibe ── */}
                        {step === 2 && (
                            <View style={styles.vibeGrid}>
                                {VIBES.map((v, i) => (
                                    <TouchableOpacity
                                        key={v.key}
                                        style={[styles.vibeCard, vibeIndex === i && styles.vibeCardActive]}
                                        onPress={() => setVibeIndex(i)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.vibeEmoji}>{v.emoji}</Text>
                                        <Text style={[styles.vibeLabel, vibeIndex === i && styles.vibeLabelActive]}>{v.key}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* ── Step 3: Budget ── */}
                        {step === 3 && (
                            <View style={styles.budgetCardList}>
                                {BUDGET_CARDS.map(b => (
                                    <TouchableOpacity
                                        key={b.key}
                                        style={[styles.budgetCard, budgetCard === b.key && styles.budgetCardActive]}
                                        onPress={() => setBudgetCard(b.key)}
                                        activeOpacity={0.85}
                                    >
                                        <View style={styles.budgetCardLeft}>
                                            <Text style={styles.budgetCardEmoji}>{b.emoji}</Text>
                                            <View>
                                                <Text style={[styles.budgetCardLabel, budgetCard === b.key && styles.budgetCardLabelActive]}>{b.label}</Text>
                                                <Text style={styles.budgetCardDesc}>{b.desc}</Text>
                                            </View>
                                        </View>
                                        <View>
                                            <Text style={[styles.budgetCardAmount, budgetCard === b.key && { color: '#fdb19c' }]}>{b.sublabel}</Text>
                                            {budgetCard === b.key && <View style={styles.budgetSelectedDot} />}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* ── Step 4: Travelers ── */}
                        {step === 4 && (
                            <View style={{ width: '100%' }}>
                                <Text style={styles.sectionLabel}>Travel type</Text>
                                <View style={styles.travelerTypeRow}>
                                    {TRAVELER_TYPES.map(t => (
                                        <TouchableOpacity
                                            key={t.key}
                                            style={[styles.travelerTypeChip, travelerType === t.key && styles.travelerTypeChipActive]}
                                            onPress={() => {
                                                setTravelerType(t.key);
                                                if (t.key === 'Solo') setPeopleIndex(0);
                                                else if (t.key === 'Couple') setPeopleIndex(1);
                                                else if (t.key === 'Friends') setPeopleIndex(3);
                                                else if (t.key === 'Family') setPeopleIndex(3);
                                            }}
                                        >
                                            <Text style={styles.travelerTypeEmoji}>{t.emoji}</Text>
                                            <Text style={[styles.travelerTypeLabel, travelerType === t.key && styles.travelerTypeLabelActive]}>{t.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>Number of travelers</Text>
                                <View style={styles.travelerStepperRow}>
                                    <TouchableOpacity
                                        style={styles.stepperBtn}
                                        onPress={() => setPeopleIndex(i => Math.max(0, i - 1))}
                                    >
                                        <Text style={styles.stepperBtnText}>−</Text>
                                    </TouchableOpacity>
                                    <View style={styles.stepperCount}>
                                        <Text style={styles.stepperCountNum}>{PEOPLE_OPTIONS[peopleIndex]}</Text>
                                        <Text style={styles.stepperCountLabel}>person{PEOPLE_OPTIONS[peopleIndex] !== 1 ? 's' : ''}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.stepperBtn}
                                        onPress={() => setPeopleIndex(i => Math.min(PEOPLE_OPTIONS.length - 1, i + 1))}
                                    >
                                        <Text style={styles.stepperBtnText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </Animated.ScrollView>

                    {/* Bottom buttons */}
                    <View style={styles.bottomRow}>
                        {step > 0 && (
                            <TouchableOpacity style={styles.prevBtn} onPress={goBack} activeOpacity={0.8}>
                                <ChevronLeft size={20} color="rgba(255,239,236,0.8)" />
                                <Text style={styles.prevBtnText}>Back</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[
                                styles.nextBtn,
                                ((step === 0 && !destination.trim()) || (step === 1 && dateMode === 'calendar' && !startDate)) && styles.nextBtnDisabled
                            ]}
                            onPress={() => {
                                if (step === STEP_COUNT - 1) {
                                    handleGenerate(false);
                                } else {
                                    goNext();
                                }
                            }}
                            disabled={(step === 0 && !destination.trim()) || (step === 1 && dateMode === 'calendar' && !startDate)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.nextBtnText}>
                                {step === STEP_COUNT - 1 ? 'Generate Itinerary ✨' : 'Continue'}
                            </Text>
                            {step < STEP_COUNT - 1 && <ChevronRight size={20} color="#a4351c" />}
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    if (mode === 'generating') {
        const estNights = dateMode === 'flexible' || !startDate || !endDate ? flexDays : Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000);
        return (
            <View style={styles.wizardContainer}>
                <LinearGradient
                    colors={['#a4351c', '#fdb19c', '#ffc4b7']}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.grainOverlay} />
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.generatingContent}>
                        <View style={styles.generatingTop}>
                            <ActivityIndicator size="large" color="#ffefec" style={{ marginBottom: 24, transform: [{ scale: 1.5 }] }} />
                            <Text style={[styles.generatingTitle, { color: '#ffefec' }]}>Crafting your journey...</Text>
                            <Text style={[styles.generatingSubtitle, { color: 'rgba(255,239,236,0.8)' }]}>
                                Building the perfect {estNights}-day itinerary for {destination || 'your destination'}.
                            </Text>
                        </View>
                        
                        <View style={styles.neonBarSection}>
                            <View style={[styles.neonTrack, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                <Animated.View style={[
                                    styles.neonFill, 
                                    { width: `${progress}%` as any, backgroundColor: '#ffefec', shadowColor: '#fff', shadowOpacity: 0.5, shadowRadius: 8 }
                                ]} />
                            </View>
                            <Text style={{ fontFamily: FontFamily.semiBold, fontSize: 13, color: 'rgba(255,239,236,0.9)', textAlign: 'center', marginTop: 16 }}>
                                {Math.round(progress)}% complete
                            </Text>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    // ─────────────────────────────────────────────────────────
    // ── HOME view ──
    // ─────────────────────────────────────────────────────────
    // Image height = 48% of screen height (leaves room for buttons on any device)
    const imgHeight = height * 0.48;

    return (
        <View style={styles.container}>
            {/* Lush Earthen Gradient */}
            <LinearGradient
                colors={['#a4351c', '#fdb19c', '#ffc4b7']}
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.grainOverlay} />

            <SafeAreaView style={styles.homeSafe} edges={['top', 'bottom']}>
                <Animated.View style={[styles.homeContent, { opacity: homeAnim }]}>

                    {/* Tilted image card — fixed pixel height so buttons never overlap */}
                    <View style={[styles.imageCardWrapper, { height: imgHeight }]}>
                        <Image
                            source={{ uri: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&q=80&auto=format&fit=crop' }}
                            style={styles.imageCard}
                            resizeMode="cover"
                        />
                    </View>

                    {/* CTA Buttons — always below the image, never overlapping */}
                    <View style={styles.homeButtons}>
                        <TouchableOpacity
                            style={styles.homeBtnPrimary}
                            onPress={enterGenerateMode}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.homeBtnPrimaryText}>Where to?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.homeBtnSecondary}
                            onPress={() => router.push('/trip/import')}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.homeBtnSecondaryText}>Import Trip</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.homeFooter}>
                        Explore curated itineraries from the world's leading travel journalists.
                    </Text>
                </Animated.View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    // ── Home ──
    container: { flex: 1 },
    homeSafe: { flex: 1 },
    // Column layout: image at top, then buttons, then footer — all in natural flow
    homeContent: {
        flex: 1,
        paddingHorizontal: 28,
        paddingTop: 16,
        paddingBottom: 90,
        alignItems: 'center',
        justifyContent: 'space-between',  // evenly distributes space between 3 sections
    },
    grainOverlay: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.08,
        backgroundColor: 'transparent',
    },
    // Tilted image card — height set dynamically from useWindowDimensions
    imageCardWrapper: {
        width: '100%',
        borderRadius: 24,
        overflow: 'hidden',
        transform: [{ rotate: '-2deg' }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.4,
        shadowRadius: 32,
        elevation: 20,
    },
    imageCard: { width: '100%', height: '100%' },
    // Buttons section
    homeButtons: { width: '100%', gap: 14 },
    homeBtnPrimary: {
        width: '100%',
        height: 60,
        backgroundColor: '#0c0f10',
        borderRadius: 9999,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    homeBtnPrimaryText: {
        fontFamily: FontFamily.bold, fontSize: 18, color: '#ffffff',
    },
    homeBtnSecondary: {
        width: '100%',
        height: 60,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center', justifyContent: 'center',
    },
    homeBtnSecondaryText: {
        fontFamily: FontFamily.bold, fontSize: 18, color: '#ffffff',
    },
    homeFooter: {
        fontFamily: FontFamily.medium, fontSize: 13,
        color: 'rgba(255,239,236,0.7)',
        textAlign: 'center', maxWidth: 280,
    },
    content: { flex: 1, paddingHorizontal: Spacing.lg },
    header: { marginTop: Spacing.md, marginBottom: Spacing.lg },
    title: { fontFamily: FontFamily.bold, fontSize: FontSize['3xl'], color: Colors.text },
    subtitle: { fontFamily: FontFamily.regular, fontSize: FontSize.base, color: Colors.textSecondary, marginTop: 4 },

    // ── Wizard ──
    wizardContainer: { flex: 1 },
    wizardHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xs,
    },
    backButton: {
        width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 20,
    },
    stepIndicator: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: 'rgba(255,239,236,0.8)' },
    progressContainer: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
    progressBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#0c0f10', borderRadius: 2 },
    stepContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 32,
        alignItems: 'center',
    },
    stepTitle: {
        fontFamily: FontFamily.bold, fontSize: 32, color: '#ffefec',
        textAlign: 'center', marginBottom: 8, letterSpacing: -0.5,
    },
    stepSubtitle: {
        fontFamily: FontFamily.regular, fontSize: FontSize.base, color: 'rgba(255,239,236,0.75)',
        textAlign: 'center', marginBottom: Spacing['2xl'],
    },

    // Destination input
    destinationContainer: { width: '100%', paddingHorizontal: Spacing.md, zIndex: 10 },
    destinationInput: {
        flexDirection: 'row', alignItems: 'center', gap: 16,
        backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: BorderRadius.xxl,
        height: 64, paddingHorizontal: Spacing.xl,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    destinationTextInput: {
        flex: 1, fontFamily: FontFamily.semiBold, fontSize: FontSize.xl,
        color: '#ffefec', height: '100%',
    },
    autocompleteContainer: {
        marginTop: 8, backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: BorderRadius.xl, padding: Spacing.sm, ...Shadows.lg, shadowOpacity: 0.1,
    },
    suggestionItem: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 12, paddingHorizontal: Spacing.sm,
    },
    suggestionText: { fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.text, flex: 1 },

    // Scroll wheel & Slider
    wheelContainer: { width: '100%', overflow: 'hidden', position: 'relative' },
    wheelHighlight: {
        position: 'absolute', top: ITEM_HEIGHT * 2, left: Spacing.lg, right: Spacing.lg,
        height: ITEM_HEIGHT, borderRadius: 16, backgroundColor: Colors.primaryContainer,
    },
    wheelItem: { justifyContent: 'center', alignItems: 'center' },
    wheelItemText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xl, color: Colors.text, textAlign: 'center' },
    sliderLabel: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xs },
    sliderLabelsRow: { width: '85%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    sliderBoundText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: Colors.textMuted },

    // Bottom nav
    bottomRow: {
        flexDirection: 'row', gap: Spacing.sm,
        paddingHorizontal: Spacing.lg, paddingBottom: 100, paddingTop: Spacing.sm,
    },
    prevBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        paddingHorizontal: 20, height: 56, borderRadius: 28,
        backgroundColor: 'rgba(0,0,0,0.25)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    prevBtnText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: 'rgba(255,239,236,0.85)' },
    nextBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, height: 56, borderRadius: 28, backgroundColor: '#0c0f10',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    nextBtnDisabled: { opacity: 0.35 },
    nextBtnText: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: '#ffffff' },

    // Generating
    generatingContainer: { flex: 1, backgroundColor: Colors.background },
    generatingContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
    generatingTop: { alignItems: 'center', marginBottom: 60 },
    generatingTitle: { fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.text, marginTop: Spacing.lg, textAlign: 'center' },
    generatingSubtitle: { fontFamily: FontFamily.regular, fontSize: FontSize.base, color: Colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },
    neonBarSection: { width: '100%', paddingHorizontal: Spacing.md },
    neonTrack: { width: '100%', height: 4, backgroundColor: 'rgba(92, 91, 91, 0.2)', borderRadius: 999, overflow: 'visible', position: 'relative' },
    neonFill: { height: '100%', borderRadius: 999, backgroundColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 6 },
    neonDot: { position: 'absolute', top: -5, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.primaryLight, shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 12, elevation: 8 },

    // ── Stitch: Date Step ──
    dateToggleRow: {
        flexDirection: 'row', gap: 10, marginBottom: Spacing.lg,
    },
    dateToggleBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 18, paddingVertical: 10, borderRadius: 30,
        backgroundColor: Colors.surface, ...Shadows.sm,
    },
    dateToggleBtnActive: { backgroundColor: Colors.primary },
    dateToggleText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textSecondary },
    dateToggleTextActive: { color: '#fff' },
    dateSummaryRow: {
        flexDirection: 'row', gap: 10, marginBottom: Spacing.md,
    },
    dateSummaryChip: {
        flex: 1, backgroundColor: Colors.surface, borderRadius: 14,
        paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', ...Shadows.sm,
    },
    dateSummaryLabel: {
        fontFamily: FontFamily.bold, fontSize: 9, color: Colors.textMuted,
        letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2,
    },
    dateSummaryValue: {
        fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.text,
    },

    // ── Stitch: Flexible Duration ──
    sectionLabel: {
        fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.textMuted,
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm,
    },
    flexDurationGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: Spacing.lg,
    },
    flexDurationChip: {
        paddingHorizontal: 24, paddingVertical: 14, borderRadius: 50,
        backgroundColor: Colors.surface, ...Shadows.sm,
    },
    flexDurationChipActive: { backgroundColor: Colors.primary },
    flexDurationText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textSecondary },
    flexDurationTextActive: { color: '#fff' },
    flexDurationPreview: {
        backgroundColor: Colors.primaryContainer + '40', borderRadius: 16,
        paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center',
    },
    flexDurationPreviewText: {
        fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.primary,
    },

    // ── Stitch: Vibe Grid ──
    vibeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        width: '100%',
        justifyContent: 'space-between',
    },
    vibeCard: {
        flexBasis: '47%', flexGrow: 0, height: 100,
        backgroundColor: 'rgba(0,0,0,0.25)',
        borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 6,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    vibeCardActive: { backgroundColor: '#0c0f10', borderColor: '#0c0f10' },
    vibeEmoji: { fontSize: 32 },
    vibeLabel: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: 'rgba(255,239,236,0.85)' },
    vibeLabelActive: { color: '#ffffff' },

    // Budget Cards
    budgetCardList: { width: '100%', gap: 14 },
    budgetCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 20, padding: Spacing.lg,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    budgetCardActive: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderWidth: 2, borderColor: '#fdb19c',
    },
    budgetCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
    budgetCardEmoji: { fontSize: 30 },
    budgetCardLabel: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: '#ffefec' },
    budgetCardLabelActive: { color: '#fdb19c' },
    budgetCardDesc: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: 'rgba(255,239,236,0.55)', marginTop: 2 },
    budgetCardAmount: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: 'rgba(255,239,236,0.7)', textAlign: 'right' },
    budgetSelectedDot: {
        width: 10, height: 10, borderRadius: 5, backgroundColor: '#fdb19c',
        marginTop: 6, alignSelf: 'flex-end',
    },

    // Traveler Step
    travelerTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: Spacing.sm },
    travelerTypeChip: {
        flex: 1, minWidth: '40%', flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    travelerTypeChipActive: { backgroundColor: '#0c0f10', borderColor: '#0c0f10' },
    travelerTypeEmoji: { fontSize: 22 },
    travelerTypeLabel: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: 'rgba(255,239,236,0.85)' },
    travelerTypeLabelActive: { color: '#ffffff' },
    travelerStepperRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 32, marginTop: Spacing.sm,
    },
    stepperBtn: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    stepperBtnText: { fontFamily: FontFamily.bold, fontSize: 28, color: '#ffefec', lineHeight: 32 },
    stepperCount: { alignItems: 'center' },
    stepperCountNum: { fontFamily: FontFamily.bold, fontSize: 52, color: '#ffefec', lineHeight: 56 },
    stepperCountLabel: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: 'rgba(255,239,236,0.7)' },
});
