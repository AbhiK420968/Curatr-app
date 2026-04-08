import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants';
import { ArrowLeft, MapPin, Calendar, Wallet, Compass, Sparkles } from 'lucide-react-native';
import { tripService } from '@/services';
import type { TravelStyle } from '@/types';
import { useItineraryContext } from '@/contexts/itinerary-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TRAVEL_STYLES: { key: TravelStyle; emoji: string }[] = [
    { key: 'Adventure', emoji: '🏔️' },
    { key: 'Relaxation', emoji: '🏖️' },
    { key: 'Cultural', emoji: '🏛️' },
    { key: 'Food & Wine', emoji: '🍷' },
    { key: 'Nature', emoji: '🌿' },
    { key: 'Urban', emoji: '🏙️' },
    { key: 'Luxury', emoji: '💎' },
    { key: 'Budget', emoji: '🎒' },
];

const INTERESTS = [
    'Museums', 'Food', 'Hiking', 'Photography', 'Shopping',
    'Nightlife', 'Temples', 'Beaches', 'Wildlife', 'History',
    'Art', 'Markets', 'Architecture', 'Music', 'Adventure Sports',
];

const BUDGETS = [
    { key: 'budget', label: 'Budget', range: '₹10K-30K', emoji: '🎒' },
    { key: 'medium', label: 'Medium', range: '₹30K-75K', emoji: '💰' },
    { key: 'premium', label: 'Premium', range: '₹75K-1.5L', emoji: '💎' },
    { key: 'luxury', label: 'Luxury', range: '₹1.5L+', emoji: '👑' },
];

export default function CreateTripScreen() {
    const router = useRouter();
    const { setItinerary } = useItineraryContext();
    const [step, setStep] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);

    // Form state
    const [destination, setDestination] = useState('');
    const [duration, setDuration] = useState('3');
    const [selectedBudget, setSelectedBudget] = useState('medium');
    const [selectedStyle, setSelectedStyle] = useState<TravelStyle | null>(null);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

    const steps = ['Destination', 'Duration', 'Budget', 'Style', 'Interests'];
    const progress = ((step) / (steps.length - 1)) * 100;

    const canProceed = () => {
        switch (step) {
            case 0: return destination.trim().length > 0;
            case 1: return parseInt(duration) > 0;
            case 2: return selectedBudget !== '';
            case 3: return selectedStyle !== null;
            case 4: return selectedInterests.length > 0;
            default: return false;
        }
    };

    const toggleInterest = (interest: string) => {
        setSelectedInterests((prev) =>
            prev.includes(interest)
                ? prev.filter((i) => i !== interest)
                : [...prev, interest]
        );
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const budget = BUDGETS.find((b) => b.key === selectedBudget);
            const itinerary = await tripService.generateItinerary({
                destination: destination.trim(),
                duration: parseInt(duration),
                budget: budget?.range || '₹30K-75K',
                travelStyle: selectedStyle!,
                interests: selectedInterests,
            });
            setItinerary(itinerary);
            router.replace(`/trip/itinerary-result`);
        } catch (error: any) {
            Alert.alert(
                'Generation Failed',
                error?.message || 'Could not generate itinerary. Check your internet connection and try again.'
            );
        } finally {
            setIsGenerating(false);
        }
    };

    const handleNext = () => {
        if (step < 4) {
            setStep(step + 1);
        } else {
            handleGenerate();
        }
    };

    // AI Generating overlay
    if (isGenerating) {
        return (
            <View style={styles.generatingContainer}>
                <View style={[styles.generatingIconContainer, { backgroundColor: Colors.primaryContainer }]}>
                    <Sparkles size={48} color={Colors.primary} />
                </View>
                <View style={styles.generatingContent}>
                    <Text style={styles.generatingTitle}>Crafting your journey</Text>
                    <Text style={styles.generatingSubtitle}>
                        Our AI is planning the perfect {duration}-day itinerary for {destination}...
                    </Text>
                    <View style={styles.generatingLoader}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.generatingWaitText}>This could take a minute</Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => (step > 0 ? setStep(step - 1) : router.back())}
                        style={styles.backButton}
                    >
                        <ArrowLeft size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Build Itinerary</Text>
                    <View style={{ width: 44 }} />
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBarBackground}>
                        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>Step {step + 1} of {steps.length}</Text>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Step 0: Destination */}
                    {step === 0 && (
                        <View style={styles.stepContainer}>
                            <View style={styles.iconCircle}>
                                <MapPin size={32} color={Colors.primary} />
                            </View>
                            <Text style={styles.stepTitle}>Where to?</Text>
                            <Text style={styles.stepSubtitle}>
                                Enter your dream destination
                            </Text>
                            <TextInput
                                style={styles.largeInput}
                                placeholder="e.g., Bali, Tokyo, Paris"
                                placeholderTextColor={Colors.textMuted}
                                value={destination}
                                onChangeText={setDestination}
                                autoFocus
                                autoCapitalize="words"
                            />
                        </View>
                    )}

                    {/* Step 1: Duration */}
                    {step === 1 && (
                        <View style={styles.stepContainer}>
                            <View style={styles.iconCircle}>
                                <Calendar size={32} color={Colors.primary} />
                            </View>
                            <Text style={styles.stepTitle}>How long?</Text>
                            <Text style={styles.stepSubtitle}>
                                We'll plan each day for you
                            </Text>
                            <View style={styles.durationRow}>
                                <TouchableOpacity
                                    style={styles.durationButton}
                                    onPress={() => setDuration(String(Math.max(1, parseInt(duration) - 1)))}
                                >
                                    <Text style={styles.durationButtonText}>−</Text>
                                </TouchableOpacity>
                                <View style={styles.durationValueContainer}>
                                    <Text style={styles.durationValue}>{duration}</Text>
                                    <Text style={styles.durationLabel}>
                                        {parseInt(duration) === 1 ? 'Day' : 'Days'}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.durationButton}
                                    onPress={() => setDuration(String(parseInt(duration) + 1))}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.durationButtonText}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Step 2: Budget */}
                    {step === 2 && (
                        <View style={styles.stepContainer}>
                            <View style={styles.iconCircle}>
                                <Wallet size={32} color={Colors.primary} />
                            </View>
                            <Text style={styles.stepTitle}>What's your budget?</Text>
                            <Text style={styles.stepSubtitle}>
                                We'll tailor suggestions to fit
                            </Text>
                            <View style={styles.optionsGrid}>
                                {BUDGETS.map((budget) => (
                                    <TouchableOpacity
                                        key={budget.key}
                                        style={[
                                            styles.optionCard,
                                            selectedBudget === budget.key && styles.optionCardActive,
                                        ]}
                                        onPress={() => setSelectedBudget(budget.key)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.optionEmoji}>{budget.emoji}</Text>
                                        <Text style={styles.optionLabel}>{budget.label}</Text>
                                        <Text style={styles.optionSub}>{budget.range}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Step 3: Travel Style */}
                    {step === 3 && (
                        <View style={styles.stepContainer}>
                            <View style={styles.iconCircle}>
                                <Compass size={32} color={Colors.primary} />
                            </View>
                            <Text style={styles.stepTitle}>Travel style?</Text>
                            <Text style={styles.stepSubtitle}>
                                Pick the vibe for your trip
                            </Text>
                            <View style={styles.optionsGrid}>
                                {TRAVEL_STYLES.map((style) => (
                                    <TouchableOpacity
                                        key={style.key}
                                        style={[
                                            styles.optionCard,
                                            selectedStyle === style.key && styles.optionCardActive,
                                        ]}
                                        onPress={() => setSelectedStyle(style.key)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.optionEmoji}>{style.emoji}</Text>
                                        <Text style={styles.optionLabel}>{style.key}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Step 4: Interests */}
                    {step === 4 && (
                        <View style={styles.stepContainer}>
                            <View style={styles.iconCircle}>
                                <Sparkles size={32} color={Colors.primary} />
                            </View>
                            <Text style={styles.stepTitle}>What excites you?</Text>
                            <Text style={styles.stepSubtitle}>
                                Pick a few interests to customize your itinerary
                            </Text>
                            <View style={styles.chipWrap}>
                                {INTERESTS.map((interest) => (
                                    <TouchableOpacity
                                        key={interest}
                                        style={[
                                            styles.chip,
                                            selectedInterests.includes(interest) && styles.chipActive,
                                        ]}
                                        onPress={() => toggleInterest(interest)}
                                    >
                                        <Text
                                            style={[
                                                styles.chipText,
                                                selectedInterests.includes(interest) && styles.chipTextActive,
                                            ]}
                                        >
                                            {interest}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Bottom Action */}
                <View style={styles.bottomAction}>
                    <TouchableOpacity
                        style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
                        onPress={handleNext}
                        disabled={!canProceed()}
                        activeOpacity={0.85}
                    >
                        {step === 4 && <Sparkles size={20} color={Colors.textInverse} style={{ marginRight: 8 }} />}
                        <Text style={styles.nextButtonText}>
                            {step === 4 ? 'Generate Itinerary' : 'Continue'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: Spacing.sm,
        ...Shadows.sm,
    },
    headerTitle: {
        fontFamily: FontFamily.semiBold,
        fontSize: FontSize.lg,
        color: Colors.text,
    },
    progressContainer: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    progressBarBackground: {
        height: 6,
        backgroundColor: Colors.borderLight,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: 3,
    },
    progressText: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        marginTop: 8,
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xl,
    },
    stepContainer: {
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xxl,
        padding: Spacing.xl,
        ...Shadows.md,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    stepTitle: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize['2xl'],
        color: Colors.text,
        textAlign: 'center',
    },
    stepSubtitle: {
        fontFamily: FontFamily.regular,
        fontSize: FontSize.base,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
        marginBottom: Spacing.xl,
        textAlign: 'center',
    },
    largeInput: {
        width: '100%',
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        fontFamily: FontFamily.semiBold,
        fontSize: FontSize.xl,
        color: Colors.text,
        textAlign: 'center',
    },
    durationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xl,
        width: '100%',
    },
    durationButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.sm,
    },
    durationButtonText: {
        fontFamily: FontFamily.medium,
        fontSize: 28,
        color: Colors.primary,
    },
    durationValueContainer: {
        alignItems: 'center',
        minWidth: 80,
    },
    durationValue: {
        fontFamily: FontFamily.bold,
        fontSize: 56,
        color: Colors.text,
        lineHeight: 64,
    },
    durationLabel: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.lg,
        color: Colors.textSecondary,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
        justifyContent: 'space-between',
        width: '100%',
    },
    optionCard: {
        width: '47%',
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    optionCardActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.surface,
        ...Shadows.sm,
    },
    optionEmoji: {
        fontSize: 32,
        marginBottom: Spacing.sm,
    },
    optionLabel: {
        fontFamily: FontFamily.semiBold,
        fontSize: FontSize.base,
        color: Colors.text,
        textAlign: 'center',
    },
    optionSub: {
        fontFamily: FontFamily.regular,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    chipWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        justifyContent: 'center',
        width: '100%',
    },
    chip: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: 12,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.background,
    },
    chipActive: {
        backgroundColor: Colors.primary,
    },
    chipText: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
    },
    chipTextActive: {
        color: Colors.textInverse,
    },
    bottomAction: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
    },
    nextButton: {
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.xl,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.md,
    },
    nextButtonDisabled: {
        backgroundColor: Colors.border,
        elevation: 0,
        shadowOpacity: 0,
    },
    nextButtonText: {
        fontFamily: FontFamily.semiBold,
        fontSize: FontSize.lg,
        color: Colors.textInverse,
    },
    // Generating overlay
    generatingContainer: {
        flex: 1,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    generatingIconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    generatingContent: {
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
    },
    generatingTitle: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize['3xl'],
        color: Colors.text,
        textAlign: 'center',
    },
    generatingSubtitle: {
        fontFamily: FontFamily.regular,
        fontSize: FontSize.lg,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: Spacing.md,
        lineHeight: 24,
    },
    generatingLoader: {
        marginTop: Spacing['2xl'],
        alignItems: 'center',
    },
    generatingWaitText: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        marginTop: Spacing.md,
    },
});
