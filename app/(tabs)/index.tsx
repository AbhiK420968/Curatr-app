import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Image,
    FlatList, RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants';
import { MapPin, Plus, Clock, Trash2, Receipt, Sparkles, Globe, Calendar, Map } from 'lucide-react-native';
import { tripService } from '@/services/tripService';
import { useItineraryContext } from '@/contexts/itinerary-context';
import type { Itinerary } from '@/types';

type TripTab = 'upcoming' | 'past';

const getCoverImage = (destination: string) => {
    const dest = destination.toLowerCase();
    const MAP: Record<string, string> = {
        kyoto: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80',
        tokyo: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80',
        paris: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80',
        bali: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80',
        london: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80',
        dubai: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80',
        delhi: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&q=80',
        mumbai: 'https://images.unsplash.com/photo-1595658658481-d53d3f999875?w=600&q=80',
        goa: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=600&q=80',
        rome: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&q=80',
        barcelona: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&q=80',
        bangkok: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=600&q=80',
        jaipur: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=600&q=80',
        manali: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=600&q=80',
    };
    const key = Object.keys(MAP).find(k => dest.includes(k));
    return key ? MAP[key] : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80';
};

function TripCard({ item, tab, onDelete, onView }: {
    item: Itinerary & { savedAt?: string };
    tab: TripTab;
    onDelete: (id: string) => void;
    onView: (item: Itinerary) => void;
}) {
    const router = useRouter();
    const isPast = tab === 'past';
    const dayCount = item.duration ?? ((item.days ?? (item as any).dayPlans)?.length ?? 0);
    const totalActivities = ((item.days ?? (item as any).dayPlans) ?? []).reduce((s: number, d: any) => s + (d.activities?.length ?? 0), 0);
    const budget = item.budgetBreakdown?.total ?? (item as any).budget?.total;
    const coverImg = getCoverImage(item.destination || '');

    return (
        <TouchableOpacity style={styles.tripCard} onPress={() => onView(item)} activeOpacity={0.9}>
            <View style={styles.tripImageContainer}>
                <Image source={{ uri: coverImg }} style={styles.tripImage} />
                <View style={styles.tripImageOverlay} />
                <View style={[styles.statusBadge, isPast && styles.statusBadgePast]}>
                    <Text style={styles.statusText}>{isPast ? 'Completed' : 'Upcoming'}</Text>
                </View>
            </View>
            <View style={styles.tripContent}>
                <View style={styles.tripInfoRow}>
                    <View style={styles.tripInfo}>
                        <Text style={styles.tripDestination} numberOfLines={1}>{item.destination}</Text>
                        <View style={styles.tripMeta}>
                            <Clock size={12} color={Colors.textMuted} />
                            <Text style={styles.tripMetaText}>
                                {dayCount} day{dayCount !== 1 ? 's' : ''} · {totalActivities} activities
                            </Text>
                        </View>
                    </View>
                    {!!budget && (
                        <View style={styles.budgetBadge}>
                            <Text style={styles.budgetText}>
                                {typeof budget === 'number' ? `₹${budget.toLocaleString()}` : budget}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={styles.tripActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/trip/splitwise' as any)} activeOpacity={0.7}>
                        <Receipt size={15} color={Colors.primary} />
                        <Text style={styles.actionText}>Split</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => onView(item)} activeOpacity={0.7}>
                        <MapPin size={15} color={Colors.primary} />
                        <Text style={styles.actionText}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => onDelete(item.id)} activeOpacity={0.7}>
                        <Trash2 size={15} color={Colors.error ?? '#ef4444'} />
                        <Text style={[styles.actionText, { color: Colors.error ?? '#ef4444' }]}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
}

export default function HomeScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { itinerary: contextItinerary, setItinerary } = useItineraryContext();

    const [allTrips, setAllTrips] = useState<Itinerary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<TripTab>('upcoming');

    const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Explorer';
    const firstName = userName.split(' ')[0];

    const loadTrips = useCallback(async () => {
        try {
            const data = await tripService.getTrips(user?.id ?? '');
            setAllTrips(data);
        } catch { /* offline fallback */ } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    useEffect(() => { loadTrips(); }, [loadTrips]);

    const trips: Itinerary[] = useMemo(() => {
        const list = [...allTrips];
        if (contextItinerary && !list.find(t => t.id === contextItinerary.id)) {
            list.unshift(contextItinerary as any);
        }
        return list;
    }, [allTrips, contextItinerary]);

    const upcoming = trips.filter(t => {
        if (!t.startDate) return t.id.startsWith('puter_') || t.id.startsWith('offline_');
        return new Date(t.startDate) > new Date();
    });
    const past = trips.filter(t => {
        if (!t.startDate) return !(t.id.startsWith('puter_') || t.id.startsWith('offline_'));
        return new Date(t.startDate) <= new Date();
    });
    const tabData = activeTab === 'upcoming' ? upcoming : past.length > 0 ? past : (upcoming.length === 0 ? trips : past);

    const totalTrips = trips.length;
    const totalDays = trips.reduce((s, t) => s + (t.duration || 0), 0);
    const uniqueCities = new Set(trips.map(t => t.destination)).size;

    const onRefresh = async () => { setIsRefreshing(true); await loadTrips(); setIsRefreshing(false); };

    const handleDelete = (id: string) => {
        Alert.alert('Delete Trip', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        if (!id.startsWith('puter_') && !id.startsWith('offline_')) {
                            await tripService.deleteTrip(id);
                        }
                        setAllTrips(prev => prev.filter(t => t.id !== id));
                    } catch { Alert.alert('Error', 'Failed to delete'); }
                },
            },
        ]);
    };

    const handleView = (item: Itinerary) => {
        setItinerary(item as any);
        router.push('/trip/itinerary-result');
    };

    const handleNewTrip = () => router.push('/(tabs)/create' as any);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greetingSmall}>WELCOME BACK</Text>
                    <Text style={styles.greeting}>Hello, <Text style={styles.greetingName}>{firstName}</Text></Text>
                </View>
                <TouchableOpacity style={styles.createButton} onPress={handleNewTrip} activeOpacity={0.85}>
                    <Plus size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Quick Stats */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Globe size={18} color={Colors.primary} />
                    <Text style={styles.statNum}>{totalTrips}</Text>
                    <Text style={styles.statLabel}>Trips</Text>
                </View>
                <View style={styles.statCard}>
                    <Calendar size={18} color={Colors.primary} />
                    <Text style={styles.statNum}>{totalDays}</Text>
                    <Text style={styles.statLabel}>Days</Text>
                </View>
                <View style={styles.statCard}>
                    <Map size={18} color={Colors.primary} />
                    <Text style={styles.statNum}>{uniqueCities}</Text>
                    <Text style={styles.statLabel}>Cities</Text>
                </View>
            </View>

            {/* Tab Selector */}
            <View style={styles.tabBar}>
                {(['upcoming', 'past'] as TripTab[]).map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.tabActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab === 'upcoming' ? 'Upcoming' : 'Past Trips'}
                        </Text>
                        {(tab === 'upcoming' ? upcoming : past).length > 0 && (
                            <View style={[styles.countBadge, activeTab === tab && styles.countBadgeActive]}>
                                <Text style={[styles.countBadgeText, activeTab === tab && styles.countBadgeTextActive]}>
                                    {(tab === 'upcoming' ? upcoming : past).length}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            {/* List */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={tabData}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                    renderItem={({ item }) => (
                        <TripCard item={item as any} tab={activeTab} onDelete={handleDelete} onView={handleView} />
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <MapPin size={36} color={Colors.textMuted} />
                            </View>
                            <Text style={styles.emptyTitle}>
                                {activeTab === 'upcoming' ? 'No upcoming trips' : 'No past trips yet'}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {activeTab === 'upcoming'
                                    ? 'Plan your next adventure with AI!'
                                    : 'Your completed trips will appear here.'}
                            </Text>
                            <TouchableOpacity style={styles.emptyButton} onPress={handleNewTrip} activeOpacity={0.85}>
                                <Sparkles size={16} color="#fff" />
                                <Text style={styles.emptyButtonText}>Plan a Trip</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md,
    },
    greetingSmall: {
        fontFamily: FontFamily.bold, fontSize: 10, color: Colors.primary,
        letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4,
    },
    greeting: { fontFamily: FontFamily.bold, fontSize: FontSize['3xl'], color: Colors.text, letterSpacing: -0.5 },
    greetingName: { fontFamily: FontFamily.bold, color: Colors.text },
    createButton: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    },

    statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
    statCard: {
        flex: 1, backgroundColor: Colors.surface, borderRadius: 16,
        paddingVertical: 16, alignItems: 'center', gap: 6, ...Shadows.sm,
    },
    statNum: { fontFamily: FontFamily.bold, fontSize: 24, color: Colors.text },
    statLabel: { fontFamily: FontFamily.medium, fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

    tabBar: {
        flexDirection: 'row', marginHorizontal: Spacing.lg,
        backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: 4, marginBottom: Spacing.md,
        ...Shadows.sm,
    },
    tab: {
        flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md, alignItems: 'center',
        flexDirection: 'row', justifyContent: 'center', gap: 6,
    },
    tabActive: { backgroundColor: Colors.primary + '18' },
    tabText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textMuted },
    tabTextActive: { color: Colors.primary, fontFamily: FontFamily.semiBold },
    countBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, backgroundColor: Colors.borderLight },
    countBadgeActive: { backgroundColor: Colors.primary + '20' },
    countBadgeText: { fontFamily: FontFamily.bold, fontSize: 10, color: Colors.textMuted },
    countBadgeTextActive: { color: Colors.primary },

    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 120, gap: Spacing.md },

    tripCard: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.xxl,
        overflow: 'hidden', ...Shadows.md,
    },
    tripImageContainer: { height: 130 },
    tripImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    tripImageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
    statusBadge: {
        position: 'absolute', top: 10, left: 12,
        backgroundColor: '#22C55E', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full,
    },
    statusBadgePast: { backgroundColor: 'rgba(0,0,0,0.35)' },
    statusText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: '#FFF' },
    tripContent: { padding: Spacing.md },
    tripInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    tripInfo: { flex: 1 },
    tripDestination: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.text },
    tripMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    tripMetaText: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.textMuted },
    budgetBadge: {
        backgroundColor: Colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full,
    },
    budgetText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.primary },
    tripActions: {
        flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md,
        paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight,
    },
    actionButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    actionText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.primary },

    emptyState: { alignItems: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.sm, paddingTop: 60 },
    emptyIconContainer: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.surface,
        justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm, ...Shadows.sm,
    },
    emptyTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.text },
    emptySubtitle: { fontFamily: FontFamily.regular, fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', maxWidth: 260 },
    emptyButton: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, marginTop: Spacing.md,
    },
    emptyButtonText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: '#fff' },
});
