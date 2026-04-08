import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    Animated, Alert, ActivityIndicator, useWindowDimensions, Easing,
    NativeSyntheticEvent, NativeScrollEvent, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants';
import { ChevronLeft, ChevronRight, Sparkles, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { generateItineraryWithPuter } from '@/services/puterItineraryService';
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

// ── ScrollWheel with fade-in/fade-out ──
function ScrollWheel<T extends string | number>({
    data,
    selectedIndex,
    onSelect,
    renderLabel,
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
        if (clamped !== selectedIndex) {
            onSelect(clamped);
        }
    }, [data.length, selectedIndex, onSelect]);

    const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        setScrollY(e.nativeEvent.contentOffset.y);
    }, []);

    // Center of the wheel viewport (in scroll coordinates)
    const centerOffset = scrollY + ITEM_HEIGHT * 2; // 2 = padding items

    // Exact center index calculation to avoid double-highlighting
    const centerIndex = Math.round(scrollY / ITEM_HEIGHT) + 2;

    const renderItem = useCallback(({ item, index }: { item: T | null; index: number }) => {
        if (item === null) {
            return <View style={{ height: ITEM_HEIGHT }} />;
        }
        const realIdx = index - 2;
        const itemCenter = index * ITEM_HEIGHT + ITEM_HEIGHT / 2;
        const dist = Math.abs(itemCenter - centerOffset);
        const maxDist = ITEM_HEIGHT * 2.5;
        const ratio = Math.max(0, 1 - dist / maxDist); // 1 = center, 0 = far
        const isCenter = index === centerIndex;

        return (
            <View style={[styles.wheelItem, { height: ITEM_HEIGHT }]}>
                <Text style={[
                    styles.wheelItemText,
                    {
                        opacity: 0.2 + ratio * 0.8,
                        fontSize: 16 + ratio * 10,
                        fontFamily: isCenter ? FontFamily.bold : FontFamily.medium,
                        color: isCenter ? Colors.primary : Colors.text,
                    },
                ]}>
                    {renderLabel(item, realIdx)}
                </Text>
            </View>
        );
    }, [centerOffset, renderLabel]);

    return (
        <View style={[styles.wheelContainer, { height: WHEEL_HEIGHT }]}>
            <View style={styles.wheelHighlight} pointerEvents="none" />
            <View style={styles.wheelFadeTop} pointerEvents="none" />
            <View style={styles.wheelFadeBottom} pointerEvents="none" />

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
                getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                })}
            />
        </View>
    );
}

// ── Cinematic Background (Light Glassmorphic Variant) ──
const CinematicBackground = () => {
    const { width, height } = useWindowDimensions();
    const sweepAnim = useRef(new Animated.Value(-width)).current;
    
    const particles = useRef(
        Array.from({ length: 8 }).map(() => ({
            x: Math.random() * width,
            yAnim: new Animated.Value(height + Math.random() * 200),
            size: Math.random() * 100 + 50,
            opacity: Math.random() * 0.2 + 0.05,
            duration: 12000 + Math.random() * 8000,
        }))
    ).current;

    useEffect(() => {
        Animated.timing(sweepAnim, {
            toValue: width * 1.5,
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
        }).start();

        particles.forEach(p => {
            Animated.loop(
                Animated.timing(p.yAnim, {
                    toValue: -150,
                    duration: p.duration,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        });
    }, [sweepAnim, particles, width]);

    return (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: Colors.background, overflow: 'hidden' }]}>
            {/* Subtle Gradient Spots */}
            {particles.map((p, i) => (
                <Animated.View
                    key={i}
                    style={{
                        position: 'absolute',
                        left: p.x - p.size / 2,
                        transform: [{ translateY: p.yAnim }],
                        width: p.size,
                        height: p.size,
                        borderRadius: p.size / 2,
                        backgroundColor: Colors.primaryContainer,
                        opacity: p.opacity,
                    }}
                />
            ))}
            <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFillObject} />
            <Animated.View
                style={{
                    position: 'absolute',
                    top: 0, bottom: 0,
                    width: width * 0.8,
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                    transform: [{ translateX: sweepAnim }, { skewX: '-20deg' }],
                }}
            />
        </View>
    );
};

// ── Main Screen ──
export default function WhereToScreen() {
    const router = useRouter();
    const { setItinerary } = useItineraryContext();
    const { width } = useWindowDimensions();

    // Form state
    const [step, setStep] = useState(0);
    const [destination, setDestination] = useState('');
    const [geoSuggestions, setGeoSuggestions] = useState<any[]>([]);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(false);
    const [daysIndex, setDaysIndex] = useState(2); // default 3 days
    const [vibeIndex, setVibeIndex] = useState(0);
    const [budgetIndex, setBudgetIndex] = useState(1); // Moderate
    const [peopleIndex, setPeopleIndex] = useState(0); // 1 person

    // Geoapify AutoComplete
    useEffect(() => {
        if (selectedLocation) return; // Skip if user just selected a location physically
        if (!destination || destination.length < 3) {
            setGeoSuggestions([]);
            return;
        }
        const delayDebounceFn = setTimeout(async () => {
            setIsSearchingLocation(true);
            try {
                const apiKey = process.env.EXPO_PUBLIC_GEOAPIFY_KEY;
                if (!apiKey) {
                    console.warn("Geoapify API key missing. Location search will not work.");
                    return;
                }
                const res = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(destination)}&type=city&limit=5&apiKey=${apiKey}`);
                const data = await res.json();
                if (data.features) {
                    setGeoSuggestions(data.features);
                }
            } catch (e) {
                console.log("Geoapify error", e);
            } finally {
                setIsSearchingLocation(false);
            }
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [destination, selectedLocation]);

    const handleSelectLocation = (locationName: string) => {
        setDestination(locationName);
        setSelectedLocation(true);
        setGeoSuggestions([]);
        goNext();
    };

    // Animation
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const initialFadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(initialFadeAnim, {
                toValue: 1,
                duration: 800,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);

    const animateTransition = useCallback((direction: 'forward' | 'back', callback: () => void) => {
        const out = direction === 'forward' ? -width * 0.3 : width * 0.3;
        const inStart = direction === 'forward' ? width * 0.3 : -width * 0.3;

        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: out, duration: 150, useNativeDriver: true }),
        ]).start(() => {
            callback();
            slideAnim.setValue(inStart);
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start();
        });
    }, [fadeAnim, slideAnim, width]);

    const goNext = () => {
        if (step === 0 && !destination.trim()) return;
        if (step < STEP_COUNT - 1) {
            animateTransition('forward', () => setStep(s => s + 1));
        } else {
            handleGenerate();
        }
    };

    const goBack = () => {
        if (step > 0) {
            animateTransition('back', () => setStep(s => s - 1));
        } else {
            router.back();
        }
    };

    const progressPercent = ((step + 1) / STEP_COUNT) * 100;

    const stepTitles = ['Where to?', 'How many days?', 'What\'s the vibe?', 'Budget?', 'How many people?'];
    const stepSubtitles = [
        '', // Removed 'Enter your dream destination'
        'Scroll to pick the perfect duration',
        'Choose the feel of your trip',
        'Select your spending style',
        'Who\'s coming along?',
    ];

    // ── Generate ──
    const handleGenerate = async () => {
        setIsGenerating(true);
        setProgress(0);

        const days = DAYS_OPTIONS[daysIndex];
        const vibe = VIBES[vibeIndex].key;
        const budget = BUDGET_TIERS[budgetIndex];

        const preferences = {
            destination: destination.trim(),
            duration: days,
            budget: budget.range,
            travelStyle: vibe as any,
            interests: [vibe],
            groupSize: PEOPLE_OPTIONS[peopleIndex],
        };

        // Animate progress bar
        const progressInterval = setInterval(() => {
            setProgress(p => Math.min(p + 2, 90));
        }, 200);

        try {
            let itinerary: any;
            try {
                itinerary = await generateItineraryWithPuter(preferences);
            } catch (puterErr: any) {
                if (puterErr?.message?.includes('PUTER_UNAVAILABLE')) {
                    itinerary = await tripService.generateItinerary(preferences);
                } else {
                    throw puterErr;
                }
            }

            clearInterval(progressInterval);
            setProgress(100);

            setTimeout(() => {
                setItinerary(itinerary);
                router.push('/trip/itinerary-result');
            }, 400);
        } catch (err: any) {
            clearInterval(progressInterval);
            Alert.alert('Generation Failed', err?.message || 'Please try again.', [{ text: 'OK' }]);
            setIsGenerating(false);
            setProgress(0);
        }
    };

    // ── Neon progress bar overlay ──
    const neonAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isGenerating) {
            neonAnim.setValue(0);
            Animated.loop(
                Animated.sequence([
                    Animated.timing(neonAnim, {
                        toValue: 1,
                        duration: 2000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(neonAnim, {
                        toValue: 0,
                        duration: 500,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }),
                ])
            ).start();
        }
    }, [isGenerating]);

    if (isGenerating) {
        const neonWidth = neonAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['5%', `${Math.min(progress + 10, 100)}%`],
        });
        const dotLeft = neonAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['3%', `${Math.min(progress + 8, 97)}%`],
        });
        const neonGlow = neonAnim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: ['rgba(38, 104, 41, 0.4)', 'rgba(38, 104, 41, 0.8)', 'rgba(38, 104, 41, 0.4)'],
        });

        return (
            <View style={styles.generatingContainer}>
                <SafeAreaView style={styles.generatingContent}>
                    <View style={styles.generatingTop}>
                        <Sparkles size={36} color={Colors.primary} />
                        <Text style={styles.generatingTitle}>Curating your trip</Text>
                        <Text style={styles.generatingSubtitle}>
                            {DAYS_OPTIONS[daysIndex]} days in {destination}
                        </Text>
                    </View>

                    {/* Neon progress bar */}
                    <View style={styles.neonBarSection}>
                        <View style={styles.neonTrack}>
                            <Animated.View style={[
                                styles.neonFill,
                                { width: neonWidth },
                            ]} />
                            <Animated.View style={[
                                styles.neonDot,
                                { left: dotLeft },
                            ]} />
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <CinematicBackground />
            <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={goBack} style={styles.backButton}>
                        <ChevronLeft size={24} color={Colors.text} />
                    </TouchableOpacity>
                <Text style={styles.stepIndicator}>{step + 1}/{STEP_COUNT}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBg}>
                    <Animated.View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                </View>
            </View>

            {/* Animated Step Content */}
            <Animated.View style={[
                styles.stepContent,
                { 
                    opacity: Animated.multiply(fadeAnim, initialFadeAnim), 
                    transform: [
                        { translateX: slideAnim },
                        { scale: scaleAnim }
                    ] 
                },
            ]}>
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
                                onChangeText={(val) => {
                                    setDestination(val);
                                    setSelectedLocation(false);
                                }}
                                autoFocus
                                autoCapitalize="words"
                                returnKeyType="next"
                                onSubmitEditing={goNext}
                            />
                        </View>
                        
                        {/* Autocomplete Dropdown */}
                        {geoSuggestions.length > 0 && (
                            <View style={styles.autocompleteContainer}>
                                {geoSuggestions.map((feat, idx) => (
                                    <TouchableOpacity 
                                        key={idx} 
                                        style={styles.suggestionItem}
                                        onPress={() => handleSelectLocation(feat.properties.formatted)}
                                    >
                                        <MapPin size={16} color={Colors.textSecondary} />
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

                {/* Step 1: Days */}
                {step === 1 && (
                    <ScrollWheel
                        data={DAYS_OPTIONS}
                        selectedIndex={daysIndex}
                        onSelect={setDaysIndex}
                        renderLabel={(item) => `${item} ${item === 1 ? 'Day' : 'Days'}`}
                    />
                )}

                {/* Step 2: Vibe */}
                {step === 2 && (
                    <ScrollWheel
                        data={VIBES.map(v => v.key)}
                        selectedIndex={vibeIndex}
                        onSelect={setVibeIndex}
                        renderLabel={(_, idx) => `${VIBES[idx].emoji}  ${VIBES[idx].key}`}
                    />
                )}

                {/* Step 3: Budget */}
                {step === 3 && (
                    <ScrollWheel
                        data={BUDGET_TIERS.map(b => b.key)}
                        selectedIndex={budgetIndex}
                        onSelect={setBudgetIndex}
                        renderLabel={(_, idx) => `${BUDGET_TIERS[idx].emoji}  ${BUDGET_TIERS[idx].label}  •  ${BUDGET_TIERS[idx].range}`}
                    />
                )}

                {/* Step 4: People */}
                {step === 4 && (
                    <ScrollWheel
                        data={PEOPLE_OPTIONS}
                        selectedIndex={peopleIndex}
                        onSelect={setPeopleIndex}
                        renderLabel={(item) => `${item} ${item === 1 ? 'Person' : 'People'}`}
                    />
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
                        step === 0 && !destination.trim() && styles.nextBtnDisabled,
                        step === 0 ? { flex: 1 } : { flex: 1 },
                    ]}
                    onPress={goNext}
                    disabled={step === 0 && !destination.trim()}
                    activeOpacity={0.8}
                >
                    <Text style={styles.nextBtnText}>
                        {step === STEP_COUNT - 1 ? 'Generate Itinerary' : 'Continue'}
                    </Text>
                    {step < STEP_COUNT - 1 ? (
                        <ChevronRight size={20} color="#FFFFFF" />
                    ) : (
                        <Sparkles size={18} color="#FFFFFF" />
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
        </View>
    );
}

// ── Styles ──
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xs,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    stepIndicator: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textMuted },

    // Progress
    progressContainer: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
    progressBg: {
        height: 4, backgroundColor: Colors.borderLight, borderRadius: 2, overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },

    // Step content
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

    // Destination
    destinationContainer: { width: '100%', paddingHorizontal: Spacing.md, zIndex: 10 },
    destinationInput: {
        flexDirection: 'row', alignItems: 'center', gap: 16,
        backgroundColor: Colors.surface, borderRadius: BorderRadius.xxl,
        height: 64, paddingHorizontal: Spacing.xl,
        borderWidth: 1, borderColor: Colors.borderLight,
        ...Shadows.md, shadowOpacity: 0.08,
    },
    destinationTextInput: {
        flex: 1, fontFamily: FontFamily.semiBold, fontSize: FontSize.xl, color: Colors.text, height: '100%',
    },
    autocompleteContainer: {
        marginTop: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: BorderRadius.xl,
        padding: Spacing.sm,
        borderWidth: 1, borderColor: Colors.borderLight,
        ...Shadows.lg, shadowOpacity: 0.1,
    },
    suggestionItem: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 12, paddingHorizontal: Spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.borderLight,
    },
    suggestionText: {
        fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.text, flex: 1,
    },

    // Scroll wheel
    wheelContainer: {
        width: '100%', overflow: 'hidden', position: 'relative',
    },
    wheelHighlight: {
        position: 'absolute', top: ITEM_HEIGHT * 2, left: Spacing.lg, right: Spacing.lg,
        height: ITEM_HEIGHT, borderRadius: 16, backgroundColor: Colors.primaryContainer,
        borderWidth: 1.5, borderColor: Colors.primary + '40',
    },
    wheelFadeTop: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: ITEM_HEIGHT * 1.5,
        backgroundColor: 'transparent',
    },
    wheelFadeBottom: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: ITEM_HEIGHT * 1.5,
        backgroundColor: 'transparent',
    },
    wheelItem: {
        justifyContent: 'center', alignItems: 'center',
    },
    wheelItemText: {
        fontFamily: FontFamily.semiBold, fontSize: FontSize.xl, color: Colors.text,
        textAlign: 'center',
    },
    wheelItemTextSelected: {
        fontFamily: FontFamily.bold, fontSize: 24, color: Colors.primary,
    },
    wheelItemTextFaded: {
        opacity: 0.25, fontSize: FontSize.lg,
    },

    // Bottom
    bottomRow: {
        flexDirection: 'row', gap: Spacing.sm,
        paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, paddingTop: Spacing.sm,
    },
    prevBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        paddingHorizontal: 20, height: 56, borderRadius: 28,
        backgroundColor: Colors.surface, ...Shadows.sm,
    },
    prevBtnText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textSecondary },
    nextBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 56, borderRadius: 28, backgroundColor: Colors.primary, ...Shadows.md,
    },
    nextBtnDisabled: { opacity: 0.4 },
    nextBtnText: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: '#FFFFFF' },

    // Generating overlay — light neon
    generatingContainer: {
        flex: 1, backgroundColor: Colors.background,
    },
    generatingContent: {
        flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl,
    },
    generatingTop: { alignItems: 'center', marginBottom: 60 },
    generatingTitle: {
        fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.text,
        marginTop: Spacing.lg, textAlign: 'center',
    },
    generatingSubtitle: {
        fontFamily: FontFamily.regular, fontSize: FontSize.base, color: Colors.textSecondary,
        marginTop: Spacing.sm, textAlign: 'center', lineHeight: 22,
    },
    neonBarSection: {
        width: '100%', paddingHorizontal: Spacing.md,
    },
    neonTrack: {
        width: '100%', height: 4, backgroundColor: 'rgba(32, 133, 109, 0.2)',
        borderRadius: 999, overflow: 'visible', position: 'relative',
    },
    neonFill: {
        height: '100%', borderRadius: 999,
        backgroundColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 6,
    },
    neonDot: {
        position: 'absolute', top: -5, width: 14, height: 14,
        borderRadius: 7, backgroundColor: Colors.primaryLight,
        shadowColor: Colors.primaryDark,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 8,
    },
});
