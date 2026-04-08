import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    Animated, Alert, ActivityIndicator, useWindowDimensions, Easing,
    NativeSyntheticEvent, NativeScrollEvent, FlatList, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants';
import {
    Sparkles, MapPin, Download, ArrowRight, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Wallet
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import Slider from '@react-native-community/slider';
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
    const { width } = useWindowDimensions();

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
    
    // Budget Slider State (5000 to 100000)
    const [budgetVal, setBudgetVal] = useState(15000);
    
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

    const handleGenerate = async (forceRefresh = false) => {
        setMode('generating');
        setProgress(0);

        const duration = (!startDate || !endDate) 
            ? 1 
            : Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) + 1;
            
        const formatBudget = (val: number) => val >= 100000 ? '₹1L+' : `₹${val/1000}k`;

        const preferences = {
            destination: destination.trim(),
            duration: duration,
            budget: formatBudget(budgetVal),
            travelStyle: VIBES[vibeIndex].key as any,
            interests: [VIBES[vibeIndex].key],
            groupSize: PEOPLE_OPTIONS[peopleIndex],
        };

        // ── Save profile to Storage Layer ──────────────────────────────────────
        saveProfile({ daysIndex: 0, vibeIndex, budgetIndex: 0, peopleIndex, lastDestination: destination.trim() })
            .catch(() => { /* non-blocking */ });

        // Log regeneration if applicable
        if (forceRefresh) {
            logRegeneration(destination.trim()).catch(() => {});
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
            setMode('generate');
            Alert.alert(
                'Generation Failed',
                err?.message || 'Could not generate your itinerary. Check your internet connection and try again.',
                [{ text: 'OK' }]
            );
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
    const stepTitles = ['Where to?', 'How many days?', "What's the vibe?", 'Budget?', 'How many people?'];
    const stepSubtitles = ['', 'Scroll to pick duration', 'Choose the feel', 'Select spending style', "Who's coming along?"];

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
        return (
            <View style={styles.generatingContainer}>
                <SafeAreaView style={styles.generatingContent}>
                    <View style={styles.generatingTop}>
                        <Sparkles size={40} color={Colors.primary} />
                        <Text style={styles.generatingTitle}>Curating your trip</Text>
                        <Text style={styles.generatingSubtitle}>
                            {(!startDate || !endDate) ? 1 : Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) + 1} days in {destination}
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
            // Fill in between
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
    
    // ── Budget formatting ──
    const getBudgetLabel = (val: number) => {
        if (val >= 100000) return '₹1L+ (Luxury Premium)';
        if (val >= 50000) return `₹${val/1000}k (Premium)`;
        if (val >= 20000) return `₹${val/1000}k (Moderate)`;
        return `₹${val/1000}k (Backpacker)`;
    };

    // ─────────────────────────────────────────────────────────
    // ── GENERATE WIZARD view ──
    // ─────────────────────────────────────────────────────────
    if (mode === 'generate') {
        return (
            <SafeAreaView style={styles.wizardContainer} edges={['top', 'bottom']}>
                {/* Wizard header */}
                <View style={styles.wizardHeader}>
                    <TouchableOpacity onPress={goBack} style={styles.backButton}>
                        <ChevronLeft size={22} color={Colors.text} />
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
                <Animated.View style={[styles.stepContent, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
                    <Text style={styles.stepTitle}>{stepTitles[step]}</Text>
                    {!!stepSubtitles[step] && (
                        <Text style={styles.stepSubtitle}>{stepSubtitles[step]}</Text>
                    )}

                    {/* Step 0: Destination */}
                    {step === 0 && (
                        <View style={styles.destinationContainer}>
                            <View style={styles.destinationInput}>
                                <MapPin size={22} color={Colors.primary} />
                                <TextInput
                                    style={styles.destinationTextInput}
                                    placeholder="Kyoto, Japan"
                                    placeholderTextColor={Colors.textMuted}
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
                                            <MapPin size={15} color={Colors.textSecondary} />
                                            <Text style={styles.suggestionText} numberOfLines={1}>
                                                {feat.properties.formatted}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                            {isSearchingLocation && geoSuggestions.length === 0 && (
                                <View style={styles.autocompleteContainer}>
                                    <ActivityIndicator size="small" color={Colors.primary} style={{ margin: Spacing.md }} />
                                </View>
                            )}
                        </View>
                    )}

                    {step === 1 && (
                        <View style={{ width: '100%', alignItems: 'center' }}>
                            <View style={[styles.destinationInput, { marginBottom: Spacing.lg, width: '100%' }]}>
                                <CalendarIcon size={22} color={Colors.primary} />
                                <Text style={styles.destinationTextInput}>
                                    {!startDate ? 'Select Dates' : endDate ? `${startDate} to ${endDate}` : startDate}
                                </Text>
                            </View>
                            
                            <View style={{ width: '100%', borderRadius: 20, overflow: 'hidden', ...Shadows.md }}>
                                <Calendar
                                    markingType={'period'}
                                    markedDates={getMarkedDates()}
                                    onDayPress={handleDayPress}
                                    theme={{
                                        backgroundColor: Colors.surface,
                                        calendarBackground: Colors.surface,
                                        textSectionTitleColor: Colors.textSecondary,
                                        selectedDayBackgroundColor: Colors.primary,
                                        selectedDayTextColor: '#ffffff',
                                        todayTextColor: Colors.primary,
                                        dayTextColor: Colors.text,
                                        textDisabledColor: Colors.textMuted,
                                        arrowColor: Colors.primary,
                                        monthTextColor: Colors.text,
                                        textDayFontFamily: FontFamily.medium,
                                        textMonthFontFamily: FontFamily.bold,
                                        textDayHeaderFontFamily: FontFamily.semiBold,
                                    }}
                                />
                            </View>
                        </View>
                    )}
                    {step === 2 && (
                        <ScrollWheel data={VIBES.map(v => v.key)} selectedIndex={vibeIndex} onSelect={setVibeIndex}
                            renderLabel={(_, idx) => `${VIBES[idx].emoji}  ${VIBES[idx].key}`} />
                    )}
                    {step === 3 && (
                        <View style={{ width: '100%', alignItems: 'center' }}>
                            <View style={[styles.destinationInput, { marginBottom: Spacing['2xl'], width: '100%' }]}>
                                <Wallet size={22} color={Colors.primary} />
                                <Text style={styles.destinationTextInput}>
                                    {getBudgetLabel(budgetVal)}
                                </Text>
                            </View>
                            
                            <Text style={styles.sliderLabel}>Slide to set your exact budget</Text>
                            <Slider
                                style={{width: '90%', height: 40}}
                                minimumValue={5000}
                                maximumValue={100000}
                                step={1000}
                                value={budgetVal}
                                onValueChange={setBudgetVal}
                                minimumTrackTintColor={Colors.primary}
                                maximumTrackTintColor={Colors.borderLight}
                                thumbTintColor={Colors.primary}
                            />
                            <View style={styles.sliderLabelsRow}>
                                <Text style={styles.sliderBoundText}>₹5k</Text>
                                <Text style={styles.sliderBoundText}>₹1L+</Text>
                            </View>
                        </View>
                    )}
                    {step === 4 && (
                        <ScrollWheel data={PEOPLE_OPTIONS} selectedIndex={peopleIndex} onSelect={setPeopleIndex}
                            renderLabel={(item) => `${item} ${item === 1 ? 'Person' : 'People'}`} />
                    )}
                </Animated.View>

                {/* Bottom buttons */}
                <View style={styles.bottomRow}>
                    {step > 0 && (
                        <TouchableOpacity style={styles.prevBtn} onPress={goBack} activeOpacity={0.8}>
                            <ChevronLeft size={20} color={Colors.textSecondary} />
                            <Text style={styles.prevBtnText}>Back</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[
                            styles.nextBtn, 
                            (step === 0 && !destination.trim()) || (step === 1 && !startDate) ? styles.nextBtnDisabled : {}
                        ]}
                        onPress={goNext}
                        disabled={(step === 0 && !destination.trim()) || (step === 1 && !startDate)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.nextBtnText}>
                            {step === STEP_COUNT - 1 ? 'Generate Itinerary' : 'Continue'}
                        </Text>
                        {step < STEP_COUNT - 1
                            ? <ChevronRight size={20} color="#FFFFFF" />
                            : <Sparkles size={18} color="#FFFFFF" />
                        }
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ─────────────────────────────────────────────────────────
    // ── HOME view ──
    // ─────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Animated.View style={[styles.content, { opacity: homeAnim }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Create Trip</Text>
                    <Text style={styles.subtitle}>Plan your next adventure with AI or import from social</Text>
                </View>

                {/* Hero */}
                <View style={styles.heroContainer}>
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=100&w=1200&auto=format&fit=crop' }}
                        style={styles.heroImage}
                    />
                    <View style={styles.heroOverlay} />
                    <View style={styles.heroContent}>
                        <Text style={styles.heroText}>Where will you go next?</Text>
                    </View>
                </View>

                {/* Option Cards */}
                <View style={styles.options}>
                    {/* AI Generate */}
                    <TouchableOpacity
                        style={[styles.optionCard, styles.optionCardPrimary]}
                        onPress={enterGenerateMode}
                        activeOpacity={0.85}
                    >
                        <View style={styles.optionIconContainer}>
                            <BlurView intensity={70} tint="light" style={[styles.optionIcon, styles.aiIcon]}>
                                <Sparkles size={24} color={Colors.primary} />
                            </BlurView>
                        </View>
                        <View style={styles.optionText}>
                            <Text style={styles.optionTitle}>Where to?</Text>
                            <Text style={styles.optionSubtitle}>
                                Let AI plan the perfect itinerary based on your preferences
                            </Text>
                        </View>
                        <View style={styles.optionArrow}>
                            <ArrowRight size={20} color={Colors.primary} />
                        </View>
                    </TouchableOpacity>

                    {/* Import */}
                    <TouchableOpacity
                        style={styles.optionCard}
                        onPress={() => router.push('/trip/import')}
                        activeOpacity={0.85}
                    >
                        <View style={styles.optionIconContainer}>
                            <BlurView intensity={70} tint="light" style={[styles.optionIcon, styles.importIcon]}>
                                <Download size={24} color={Colors.primary} />
                            </BlurView>
                        </View>
                        <View style={styles.optionText}>
                            <Text style={styles.optionTitle}>Import Trips</Text>
                            <Text style={styles.optionSubtitle}>
                                Import itineraries from Instagram, YouTube, Reddit & more
                            </Text>
                        </View>
                        <View style={styles.optionArrow}>
                            <ArrowRight size={20} color={Colors.textMuted} />
                        </View>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    // ── Home ──
    container: { flex: 1, backgroundColor: Colors.background },
    content: { flex: 1, paddingHorizontal: Spacing.lg },
    header: { marginTop: Spacing.md, marginBottom: Spacing.lg },
    title: { fontFamily: FontFamily.bold, fontSize: FontSize['3xl'], color: Colors.text },
    subtitle: { fontFamily: FontFamily.regular, fontSize: FontSize.base, color: Colors.textSecondary, marginTop: 4 },
    heroContainer: { height: 200, borderRadius: BorderRadius.xxl, overflow: 'hidden', marginBottom: Spacing.lg, ...Shadows.md },
    heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
    heroContent: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: Spacing.lg },
    heroText: { fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: '#FFFFFF' },
    options: { gap: Spacing.md },
    optionCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
        padding: Spacing.lg, ...Shadows.md,
    },
    optionCardPrimary: {
        borderWidth: 1.5, borderColor: Colors.primary + '30',
    },
    optionIconContainer: { marginRight: Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden' },
    optionIcon: { width: 52, height: 52, justifyContent: 'center', alignItems: 'center' },
    aiIcon: { backgroundColor: 'rgba(39,169,130,0.15)' },
    importIcon: { backgroundColor: 'rgba(32,133,109,0.1)' },
    optionText: { flex: 1 },
    optionTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.lg, color: Colors.text },
    optionSubtitle: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
    optionArrow: { marginLeft: Spacing.sm },

    // ── Wizard ──
    wizardContainer: { flex: 1, backgroundColor: Colors.background },
    wizardHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xs,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    stepIndicator: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textMuted },
    progressContainer: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
    progressBg: { height: 4, backgroundColor: Colors.borderLight, borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
    stepContent: {
        flex: 1, paddingHorizontal: Spacing.lg,
        justifyContent: 'center', alignItems: 'center',
    },
    stepTitle: {
        fontFamily: FontFamily.bold, fontSize: 32, color: Colors.text,
        textAlign: 'center', marginBottom: 8, letterSpacing: -0.5,
    },
    stepSubtitle: {
        fontFamily: FontFamily.regular, fontSize: FontSize.base, color: Colors.textSecondary,
        textAlign: 'center', marginBottom: Spacing['2xl'],
    },

    // Destination input
    destinationContainer: { width: '100%', paddingHorizontal: Spacing.md, zIndex: 10 },
    destinationInput: {
        flexDirection: 'row', alignItems: 'center', gap: 16,
        backgroundColor: Colors.surface, borderRadius: BorderRadius.xxl,
        height: 64, paddingHorizontal: Spacing.xl,
        borderWidth: 1, borderColor: Colors.borderLight, ...Shadows.md, shadowOpacity: 0.08,
    },
    destinationTextInput: {
        flex: 1, fontFamily: FontFamily.semiBold, fontSize: FontSize.xl, color: Colors.text, height: '100%',
    },
    autocompleteContainer: {
        marginTop: 8, backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: BorderRadius.xl, padding: Spacing.sm,
        borderWidth: 1, borderColor: Colors.borderLight, ...Shadows.lg, shadowOpacity: 0.1,
    },
    suggestionItem: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 12, paddingHorizontal: Spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight,
    },
    suggestionText: { fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.text, flex: 1 },

    // Scroll wheel & Slider
    wheelContainer: { width: '100%', overflow: 'hidden', position: 'relative' },
    wheelHighlight: {
        position: 'absolute', top: ITEM_HEIGHT * 2, left: Spacing.lg, right: Spacing.lg,
        height: ITEM_HEIGHT, borderRadius: 16, backgroundColor: Colors.primaryContainer,
        borderWidth: 1.5, borderColor: Colors.primary + '40',
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
        backgroundColor: Colors.surface, ...Shadows.sm,
    },
    prevBtnText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textSecondary },
    nextBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, height: 56, borderRadius: 28, backgroundColor: Colors.primary, ...Shadows.md,
    },
    nextBtnDisabled: { opacity: 0.4 },
    nextBtnText: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: '#FFFFFF' },

    // Generating
    generatingContainer: { flex: 1, backgroundColor: Colors.background },
    generatingContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
    generatingTop: { alignItems: 'center', marginBottom: 60 },
    generatingTitle: { fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.text, marginTop: Spacing.lg, textAlign: 'center' },
    generatingSubtitle: { fontFamily: FontFamily.regular, fontSize: FontSize.base, color: Colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },
    neonBarSection: { width: '100%', paddingHorizontal: Spacing.md },
    neonTrack: { width: '100%', height: 4, backgroundColor: 'rgba(32,133,109,0.2)', borderRadius: 999, overflow: 'visible', position: 'relative' },
    neonFill: { height: '100%', borderRadius: 999, backgroundColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 6 },
    neonDot: { position: 'absolute', top: -5, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.primaryLight, shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 12, elevation: 8 },
});
