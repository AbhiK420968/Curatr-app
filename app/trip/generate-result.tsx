import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants';
import { ChevronLeft, Info, Calendar as CalendarIcon, MapPin, Share2, Navigation, Coffee, BedDouble, Camera as CameraIcon } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');

// Mock Data translating `DayPlan` and `Activity` from curated-journeys
const MOCK_ITINERARY = {
    destinationImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop', // Kyoto
    overview: "Experience the perfect blend of historic temples and modern cityscapes in this curated adventure.",
    budgetBreakdown: {
        total: "₹85,000",
        accommodation: "₹40,000",
        food: "₹25,000",
        activities: "₹15,000",
        transportation: "₹5,000"
    },
    days: [
        {
            day: 1,
            theme: "Historic Temples & Culture",
            activities: [
                {
                    time: "09:00 AM",
                    title: "Kinkaku-ji (Golden Pavilion)",
                    description: "Visit the iconic Zen Buddhist temple covered in gold leaf. Arrive early to avoid crowds and get the best reflection photos.",
                    duration: "2 hours",
                    estimatedCost: "₹300",
                    category: "Sightseeing",
                    imageUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=600&auto=format&fit=crop",
                },
                {
                    time: "12:30 PM",
                    title: "Nishiki Market Lunch",
                    description: "Nicknamed 'Kyoto's Kitchen', this five-block long shopping street has over a hundred shops and restaurants.",
                    duration: "1.5 hours",
                    estimatedCost: "₹1500",
                    category: "Food",
                },
                {
                    time: "03:00 PM",
                    title: "Fushimi Inari-taisha",
                    description: "Hike through thousands of vermilion torii gates. The full trail takes 2-3 hours.",
                    duration: "3 hours",
                    estimatedCost: "Free",
                    category: "Activity",
                    imageUrl: "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?q=80&w=600&auto=format&fit=crop"
                }
            ]
        }
    ]
};

const CategoryIcon = ({ category }: { category: string }) => {
    switch(category) {
        case 'Food': return <Coffee size={18} color={Colors.primary} />;
        case 'Sightseeing': return <CameraIcon size={18} color={Colors.primary} />;
        case 'Rest': return <BedDouble size={18} color={Colors.textMuted} />;
        default: return <Navigation size={18} color={Colors.textSecondary} />;
    }
}

export default function GenerateResultScreen() {
    const router = useRouter();
    const { destination, duration, style } = useLocalSearchParams();
    
    // Use fallback values if missing
    const displayDestination = destination || "Kyoto, Japan";
    const displayDuration = duration || "3";
    const displayStyle = style || "Adventure";

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* Hero Header */}
                <View style={[styles.heroContainer, { width, height: width * 1.1 }]}>
                    <Image source={{ uri: MOCK_ITINERARY.destinationImage }} style={styles.heroImage} />
                    <View style={styles.heroOverlay} />
                    
                    <SafeAreaView style={styles.safeHeader} edges={['top']}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <BlurView intensity={80} tint="dark" style={styles.glassButton}>
                                <ChevronLeft size={24} color="#FFFFFF" />
                            </BlurView>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.backButton}>
                            <BlurView intensity={80} tint="dark" style={styles.glassButton}>
                                <Share2 size={20} color="#FFFFFF" />
                            </BlurView>
                        </TouchableOpacity>
                    </SafeAreaView>

                    <View style={styles.heroContent}>
                        <View style={styles.pillContainer}>
                            <View style={styles.pill}>
                                <Text style={styles.pillText}>AI Generated</Text>
                            </View>
                            <View style={[styles.pill, { backgroundColor: Colors.primary }]}>
                                <Text style={styles.pillText}>{displayStyle}</Text>
                            </View>
                        </View>
                        <Text style={styles.heroTitle}>{displayDestination}</Text>
                        <View style={styles.heroMetaGroup}>
                            <CalendarIcon size={16} color="#FFFFFF" opacity={0.8} />
                            <Text style={styles.heroMetaText}>{displayDuration} Days Itinerary</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.sheetContainer}>
                    {/* Drag Handle Mock */}
                    <View style={styles.dragHandle} />

                    {/* Overview Segment */}
                    <View style={styles.segment}>
                        <Text style={styles.sectionTitle}>Overview</Text>
                        <Text style={styles.paragraph}>{MOCK_ITINERARY.overview}</Text>
                        
                        {/* Budget Miniature */}
                        <View style={styles.budgetCard}>
                            <View style={styles.budgetLeft}>
                                <Text style={styles.budgetLabel}>Estimated Cost</Text>
                                <Text style={styles.budgetAmount}>{MOCK_ITINERARY.budgetBreakdown.total}</Text>
                            </View>
                            <TouchableOpacity style={styles.budgetBreakdownBtn}>
                                <Info size={16} color={Colors.primary} />
                                <Text style={styles.budgetBreakdownText}>Breakdown</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Itinerary Days */}
                    <View style={styles.segment}>
                        <Text style={styles.sectionTitle}>Your Itinerary</Text>
                        
                        {MOCK_ITINERARY.days.map((dayPlan) => (
                            <View key={dayPlan.day} style={styles.dayContainer}>
                                <View style={styles.dayHeader}>
                                    <View style={styles.dayBadge}>
                                        <Text style={styles.dayBadgeText}>Day {dayPlan.day}</Text>
                                    </View>
                                    <Text style={styles.dayTheme}>{dayPlan.theme}</Text>
                                </View>

                                {/* Timeline Activities */}
                                <View style={styles.timeline}>
                                    {dayPlan.activities.map((activity, idx) => (
                                        <View key={idx} style={styles.activityRow}>
                                            {/* Timeline left col */}
                                            <View style={styles.timelineCol}>
                                                <Text style={styles.timeText}>{activity.time.split(' ')[0]}</Text>
                                                <Text style={styles.timeAmPm}>{activity.time.split(' ')[1]}</Text>
                                                <View style={styles.timelineLine} />
                                                <View style={styles.timelineDot} />
                                            </View>

                                            {/* Activity Content */}
                                            <View style={styles.activityCard}>
                                                {activity.imageUrl && (
                                                    <Image source={{ uri: activity.imageUrl }} style={styles.activityImage} />
                                                )}
                                                <View style={styles.activityContent}>
                                                    <View style={styles.activityHeaderRow}>
                                                        <Text style={styles.activityTitle}>{activity.title}</Text>
                                                        <CategoryIcon category={activity.category} />
                                                    </View>
                                                    <Text style={styles.activityDesc}>{activity.description}</Text>
                                                    
                                                    <View style={styles.activityMetaRow}>
                                                        <Text style={styles.activityMetaText}>{activity.duration}</Text>
                                                        <Text style={styles.activityMetaDot}>•</Text>
                                                        <Text style={styles.activityMetaText}>{activity.estimatedCost}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>

                </View>
            </ScrollView>

            {/* Bottom Action */}
            <View style={styles.bottomBarContainer}>
                <BlurView intensity={80} tint="light" style={styles.bottomBar}>
                    <TouchableOpacity style={styles.saveButtonContainer} activeOpacity={0.8} onPress={() => router.push('/(tabs)/trips')}>
                        <BlurView intensity={80} tint="dark" style={styles.saveButtonBlur}>
                            <Text style={styles.saveButtonText}>Save Trip to Profile</Text>
                        </BlurView>
                    </TouchableOpacity>
                </BlurView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surface,
    },
    scrollContent: {
        paddingBottom: 120, // Bottom bar spacing
    },
    heroContainer: {
        position: 'relative',
        backgroundColor: Colors.background,
    },
    heroImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    safeHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
    },
    glassButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    heroContent: {
        position: 'absolute',
        bottom: 50,
        left: Spacing.lg,
        right: Spacing.lg,
    },
    pillContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: Spacing.sm,
    },
    pill: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    pillText: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.xs,
        color: '#FFFFFF',
    },
    heroTitle: {
        fontFamily: FontFamily.bold,
        fontSize: 36,
        color: '#FFFFFF',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        marginBottom: 8,
    },
    heroMetaGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    heroMetaText: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.base,
        color: '#FFFFFF',
        opacity: 0.9,
    },
    sheetContainer: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        marginTop: -30,
        paddingTop: Spacing.md,
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: Colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: Spacing.lg,
    },
    segment: {
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontFamily: FontFamily.bold,
        fontSize: 22,
        color: Colors.text,
        marginBottom: Spacing.md,
    },
    paragraph: {
        fontFamily: FontFamily.regular,
        fontSize: FontSize.base,
        color: Colors.textSecondary,
        lineHeight: 24,
        marginBottom: Spacing.md,
    },
    budgetCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        padding: Spacing.md,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadows.sm,
        shadowOpacity: 0.05,
    },
    budgetLeft: {
        flex: 1,
    },
    budgetLabel: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.xs,
        color: Colors.textMuted,
        marginBottom: 2,
    },
    budgetAmount: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.xl,
        color: Colors.text,
    },
    budgetBreakdownBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        ...Shadows.sm,
    },
    budgetBreakdownText: {
        fontFamily: FontFamily.semiBold,
        fontSize: FontSize.sm,
        color: Colors.primary,
    },
    dayContainer: {
        marginTop: Spacing.sm,
    },
    dayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    dayBadge: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    dayBadgeText: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.sm,
        color: '#FFFFFF',
    },
    dayTheme: {
        fontFamily: FontFamily.semiBold,
        fontSize: FontSize.base,
        color: Colors.text,
        flex: 1,
    },
    timeline: {
        paddingLeft: 4, // Aligns dot
    },
    activityRow: {
        flexDirection: 'row',
        marginBottom: Spacing.lg,
        minHeight: 100,
    },
    timelineCol: {
        width: 60,
        alignItems: 'center',
        paddingRight: Spacing.md,
    },
    timeText: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.base,
        color: Colors.text,
    },
    timeAmPm: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.xs,
        color: Colors.textMuted,
        marginBottom: 8,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: Colors.borderLight,
    },
    timelineDot: {
        position: 'absolute',
        top: 28,
        right: 17, // Center on line
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.primary,
        borderWidth: 2,
        borderColor: Colors.surface,
    },
    activityCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadows.sm,
        shadowOpacity: 0.05,
    },
    activityImage: {
        width: '100%',
        height: 120,
        resizeMode: 'cover',
    },
    activityContent: {
        padding: Spacing.md,
    },
    activityHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    activityTitle: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.base,
        color: Colors.text,
        flex: 1,
        marginRight: Spacing.sm,
    },
    activityDesc: {
        fontFamily: FontFamily.regular,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        lineHeight: 20,
        marginBottom: Spacing.sm,
    },
    activityMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activityMetaText: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.xs,
        color: Colors.textMuted,
    },
    activityMetaDot: {
        marginHorizontal: 6,
        color: Colors.border,
    },
    bottomBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    bottomBar: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: 40, // Safe area bot
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.4)',
    },
    saveButtonContainer: {
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
        ...Shadows.md,
        shadowColor: Colors.primary,
        shadowOpacity: 0.3,
    },
    saveButtonBlur: {
        backgroundColor: 'rgba(39, 169, 130, 0.5)',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.lg,
        color: '#FFFFFF',
    },
});
