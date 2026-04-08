import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    Share,
    Image,
    Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants';
import {
    ArrowLeft,
    MapPin,
    Share2,
    Wallet,
    Sparkles,
    Receipt,
    Layers,
    Navigation,
    Wand2,
} from 'lucide-react-native';
import { tripService } from '@/services';
import type { Itinerary, DayPlan, Activity } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PLACEHOLDER_HEADER = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80';
const PLACEHOLDER_ACTIVITY = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=80';

export default function TripDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [trip, setTrip] = useState<Itinerary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<number>(0);

    useEffect(() => {
        loadTrip();
    }, [id]);

    const loadTrip = async () => {
        if (!id) return;
        try {
            const data = await tripService.getTrip(id);
            setTrip(data);
        } catch (err: any) {
            Alert.alert('Error', 'Could not load trip details');
            router.back();
        } finally {
            setIsLoading(false);
        }
    };

    const handleShare = async () => {
        if (!trip) return;
        try {
            const result = await tripService.shareTrip(trip.id);
            await Share.share({
                message: `Check out my ${trip.destination} trip on Curatr! ${result.shareUrl}`,
            });
        } catch (err) {
            Alert.alert('Error', 'Could not share trip');
        }
    };

    const days: DayPlan[] = trip?.days || trip?.dayPlans || [];
    const budget = trip?.budgetBreakdown || trip?.budget;

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!trip) return null;

    const renderOverview = () => (
        <View style={styles.overviewSection}>
            {trip.overview && (
                <View style={styles.overviewCard}>
                    <Text style={styles.overviewDescription}>{trip.overview}</Text>
                </View>
            )}

            {budget && (
                <View style={styles.budgetCard}>
                    <View style={styles.budgetHeader}>
                        <Wallet size={20} color={Colors.text} />
                        <Text style={styles.budgetTitle}>Budget Breakdown</Text>
                    </View>
                    <View style={styles.budgetItems}>
                        {budget.accommodation && <BudgetRow label="Accommodation" value={budget.accommodation} />}
                        {budget.food && <BudgetRow label="Food" value={budget.food} />}
                        {budget.activities && <BudgetRow label="Activities" value={budget.activities} />}
                        {budget.transportation && <BudgetRow label="Transportation" value={budget.transportation} />}
                        <View style={styles.budgetDivider} />
                        <BudgetRow label="Total Estimated" value={budget.total} isTotal />
                    </View>
                </View>
            )}

            {trip.tips && trip.tips.length > 0 && (
                <View style={styles.tipsCard}>
                    <View style={styles.tipsHeader}>
                        <Sparkles size={20} color={Colors.primary} />
                        <Text style={styles.tipsTitle}>Special Tips</Text>
                    </View>
                    {trip.tips.map((tip, idx) => (
                        <View key={idx} style={styles.tipItem}>
                            <View style={styles.tipDot} />
                            <Text style={styles.tipText}>{tip}</Text>
                        </View>
                    ))}
                </View>
            )}

            <TouchableOpacity
                style={styles.splitButton}
                onPress={() => router.push('/trip/splitwise')}
                activeOpacity={0.85}
            >
                <Receipt size={20} color={Colors.primary} />
                <Text style={styles.splitButtonText}>Split Trip Expenses</Text>
            </TouchableOpacity>
        </View>
    );

    const renderDay = (dayData?: DayPlan) => {
        if (!dayData) return null;
        
        return (
            <View style={styles.daySection}>
                <View style={styles.dayHeaderRow}>
                    <Text style={styles.dayTitle}>Day {dayData.day}</Text>
                    <TouchableOpacity style={styles.optimizeButton}>
                        <Wand2 size={16} color="#FFF" />
                        <Text style={styles.optimizeButtonText}>Optimize</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.activitiesList}>
                    {dayData.activities.map((activity: Activity, idx: number) => (
                        <View key={idx} style={styles.activityItemRow}>
                            <View style={styles.timelineLeft}>
                                <View style={styles.timelineCircle}>
                                    <Text style={styles.timelineIndex}>{idx + 1}</Text>
                                </View>
                                {idx < dayData.activities.length - 1 && (
                                    <View style={styles.timelineLine} />
                                )}
                            </View>

                            <View style={styles.activityContentWrapper}>
                                <View style={styles.activityHeader}>
                                    <View style={styles.activityInfo}>
                                        <Text style={styles.activityTitle}>{activity.title}</Text>
                                        <View style={styles.metaChipsRow}>
                                            {activity.category && (
                                                <View style={styles.metaChipPrimary}>
                                                    <Text style={styles.metaChipPrimaryText}>{activity.category}</Text>
                                                </View>
                                            )}
                                            <Text style={styles.metaTextMuted}>
                                                {typeof activity.estimatedDuration === 'number' ? `${activity.estimatedDuration} min` : activity.duration || '60 min'} • {typeof activity.estimatedCost === 'number' ? `₹${activity.estimatedCost}` : activity.estimatedCost || 'Free'}
                                            </Text>
                                        </View>
                                        <TouchableOpacity style={styles.directionsBtn}>
                                            <Navigation size={14} color={Colors.primary} />
                                            <Text style={styles.directionsBtnText}>Directions</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.activityImageContainer}>
                                        <Image source={{ uri: PLACEHOLDER_ACTIVITY }} style={styles.activityImage} />
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.mapBackgroundSection}>
                <Image source={{ uri: PLACEHOLDER_HEADER }} style={styles.mapImage} />
                <View style={styles.mapOverlay} />
                
                <SafeAreaView edges={['top']} style={styles.headerAbsolute}>
                    <View style={styles.headerTopRow}>
                        <View style={styles.headerLeft}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                                <ArrowLeft size={24} color={Colors.primary} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle} numberOfLines={1}>{trip.destination}</Text>
                        </View>
                        <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
                            <Share2 size={24} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>

                <View style={styles.floatingMapControls}>
                    <TouchableOpacity style={styles.mapControlBtn}>
                        <Layers size={20} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.mapControlBtn}>
                        <MapPin size={20} color={Colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView 
                style={styles.mainScroll} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.contentCard}>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabsContainer}
                        style={styles.tabsScroll}
                    >
                        <TouchableOpacity style={[styles.tabBtn, activeTab === 0 && styles.tabBtnActive]} onPress={() => setActiveTab(0)}>
                            <Text style={[styles.tabText, activeTab === 0 && styles.tabTextActive]}>OVERVIEW</Text>
                        </TouchableOpacity>
                        {days.map(d => (
                            <TouchableOpacity key={d.day} style={[styles.tabBtn, activeTab === d.day && styles.tabBtnActive]} onPress={() => setActiveTab(d.day)}>
                                <Text style={[styles.tabText, activeTab === d.day && styles.tabTextActive]}>DAY {d.day}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.tabContentArea}>
                        {activeTab === 0 ? renderOverview() : renderDay(days.find(d => d.day === activeTab))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

function BudgetRow({
    label,
    value,
    isTotal = false,
}: {
    label: string;
    value: string | number;
    isTotal?: boolean;
}) {
    const displayValue = typeof value === 'number' ? `₹${value.toLocaleString()}` : value;

    return (
        <View style={styles.budgetRow}>
            <Text style={[styles.budgetLabel, isTotal && styles.budgetLabelTotal]}>
                {label}
            </Text>
            <Text style={[styles.budgetValue, isTotal && styles.budgetValueTotal]}>
                {displayValue}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    mapBackgroundSection: {
        height: 397,
        width: SCREEN_WIDTH,
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 0,
    },
    mapImage: {
        ...StyleSheet.absoluteFillObject,
        resizeMode: 'cover',
    },
    mapOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.7)', 
    },
    headerAbsolute: {
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        height: 56,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    iconBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.lg,
        color: Colors.text,
        letterSpacing: -0.5,
    },
    floatingMapControls: {
        position: 'absolute',
        top: 120,
        right: Spacing.md,
        gap: Spacing.sm,
        zIndex: 10,
    },
    mapControlBtn: {
        width: 44,
        height: 44,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.sm,
    },
    mainScroll: {
        flex: 1,
        marginTop: 360, 
    },
    scrollContent: {
        flexGrow: 1,
    },
    contentCard: {
        backgroundColor: Colors.surfaceElevated,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        minHeight: Dimensions.get('window').height - 120,
        paddingBottom: 100,
        ...Shadows.lg,
        marginTop: -32,
    },
    tabsScroll: {
        borderBottomWidth: 1,
        borderBottomColor: 'transparent',
    },
    tabsContainer: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        gap: Spacing.lg,
    },
    tabBtn: {
        paddingBottom: Spacing.sm,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabBtnActive: {
        borderBottomColor: Colors.primary,
    },
    tabText: {
        fontFamily: FontFamily.semiBold,
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    tabTextActive: {
        color: Colors.primary,
        fontFamily: FontFamily.bold,
    },
    tabContentArea: {
        paddingTop: Spacing.md,
    },
    overviewSection: {
        paddingHorizontal: Spacing.lg,
    },
    daySection: {
        paddingHorizontal: Spacing.lg,
    },
    dayHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        marginBottom: Spacing.md,
    },
    dayTitle: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize['2xl'],
        color: Colors.text,
    },
    optimizeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary, 
        paddingHorizontal: Spacing.lg,
        paddingVertical: 10,
        borderRadius: BorderRadius.full,
        gap: Spacing.sm,
        ...Shadows.sm,
    },
    optimizeButtonText: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.sm,
        color: '#FFFFFF',
    },
    activitiesList: {
        paddingBottom: Spacing['xl'],
    },
    activityItemRow: {
        flexDirection: 'row',
        marginBottom: Spacing.xl,
    },
    timelineLeft: {
        alignItems: 'center',
        marginRight: Spacing.md,
        width: 32,
    },
    timelineCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    timelineIndex: {
        color: '#FFFFFF',
        fontFamily: FontFamily.bold,
        fontSize: FontSize.sm,
    },
    timelineLine: {
        width: 2,
        backgroundColor: Colors.surfaceContainerHighest,
        flex: 1,
        marginTop: 4,
        marginBottom: -Spacing.xl, 
    },
    activityContentWrapper: {
        flex: 1,
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    activityInfo: {
        flex: 1,
        paddingRight: Spacing.md,
    },
    activityTitle: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.lg,
        color: Colors.text,
        marginBottom: 4,
    },
    metaChipsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginTop: 2,
    },
    metaChipPrimary: {
        backgroundColor: Colors.surfaceContainerLow,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
    },
    metaChipPrimaryText: {
        fontFamily: FontFamily.semiBold,
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metaTextMuted: {
        fontFamily: FontFamily.regular,
        fontSize: FontSize.xs,
        color: Colors.textMuted,
    },
    directionsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(118,119,119, 0.3)',
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        marginTop: Spacing.md,
        gap: 6,
    },
    directionsBtnText: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.xs,
        color: Colors.primary,
    },
    activityImageContainer: {
        width: 96,
        height: 96,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    activityImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    overviewCard: {
        backgroundColor: Colors.surfaceContainerLow,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    overviewDescription: {
        fontFamily: FontFamily.regular,
        fontSize: FontSize.base,
        color: Colors.textSecondary,
        lineHeight: 24,
    },
    budgetCard: {
        backgroundColor: Colors.surfaceContainerLow,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    budgetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    budgetTitle: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.lg,
        color: Colors.text,
    },
    budgetItems: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
    },
    budgetRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: Spacing.sm,
    },
    budgetLabel: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
    },
    budgetLabelTotal: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.base,
        color: Colors.text,
    },
    budgetValue: {
        fontFamily: FontFamily.semiBold,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    budgetValueTotal: {
        fontFamily: FontFamily.bold,
        color: Colors.primary,
        fontSize: FontSize.lg,
    },
    budgetDivider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: Spacing.sm,
    },
    tipsCard: {
        backgroundColor: Colors.primaryContainer,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
    },
    tipsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    tipsTitle: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.lg,
        color: Colors.primaryDark,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    tipDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.primary,
        marginTop: 6,
    },
    tipText: {
        flex: 1,
        fontFamily: FontFamily.medium,
        fontSize: FontSize.sm,
        color: Colors.primaryDark,
        lineHeight: 20,
    },
    splitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.xl,
        height: 52,
        marginTop: Spacing.md,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        ...Shadows.sm,
    },
    splitButtonText: {
        fontFamily: FontFamily.semiBold,
        fontSize: FontSize.base,
        color: Colors.primary,
    },
});
