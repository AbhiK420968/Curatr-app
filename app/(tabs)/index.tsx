import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    useWindowDimensions,
    TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants';
import { Menu, Search, Bell, Star, MapPin, ArrowUpRight } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

// ─── Data (mirrored from e:/Curatr/src/app/data/destinations.ts) ──────────────
interface Destination {
    id: string;
    name: string;
    country: string;
    continent: string;
    rating: number;
    price: number;
    image: string;
    description: string;
}

const DESTINATIONS: Destination[] = [
    {
        id: 'florence',
        name: 'Florence',
        country: 'Italia',
        continent: 'Europe',
        rating: 5.0,
        price: 799,
        image: 'https://images.unsplash.com/photo-1681844931449-e0992a27d157?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        description: 'Experience the Renaissance capital of Italy.',
    },
    {
        id: 'amalfi',
        name: 'Amalfi Coast',
        country: 'Italia',
        continent: 'Europe',
        rating: 5.0,
        price: 899,
        image: 'https://images.unsplash.com/photo-1583844056361-4418a8f2a985?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        description: 'Breathtaking coastal beauty of southern Italy.',
    },
    {
        id: 'lake-como',
        name: 'Lake Como',
        country: 'Italia',
        continent: 'Europe',
        rating: 4.8,
        price: 899,
        image: 'https://images.unsplash.com/photo-1653917190674-ef84725ab2ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        description: 'A stunning glacial lake surrounded by dramatic mountains.',
    },
    {
        id: 'positano',
        name: 'Positano',
        country: 'Italia',
        continent: 'Europe',
        rating: 4.9,
        price: 950,
        image: 'https://images.unsplash.com/photo-1561956021-947f09ae0101?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        description: 'A jewel of the Amalfi Coast.',
    },
    {
        id: 'kyoto',
        name: 'Kyoto',
        country: 'Japan',
        continent: 'Asia',
        rating: 4.9,
        price: 1099,
        image: 'https://images.unsplash.com/photo-1655316281160-e3a9e78472e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        description: 'Immerse yourself in ancient Japanese culture.',
    },
    {
        id: 'bali',
        name: 'Bali',
        country: 'Indonesia',
        continent: 'Asia',
        rating: 4.8,
        price: 849,
        image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        description: 'Island of the Gods, tropical paradise.',
    },
    {
        id: 'bangkok',
        name: 'Bangkok',
        country: 'Thailand',
        continent: 'Asia',
        rating: 4.6,
        price: 699,
        image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        description: 'Vibrant street life and ornate temples.',
    },
    {
        id: 'barcelona',
        name: 'Barcelona',
        country: 'Spain',
        continent: 'Europe',
        rating: 4.7,
        price: 749,
        image: 'https://images.unsplash.com/photo-1560923983-79bfb3d29b77?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        description: "Explore Gaudi's masterpieces and Mediterranean beaches.",

    },
    {
        id: 'new-york',
        name: 'New York',
        country: 'USA',
        continent: 'America',
        rating: 4.8,
        price: 1199,
        image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        description: 'The city that never sleeps.',
    },
    {
        id: 'rio',
        name: 'Rio de Janeiro',
        country: 'Brazil',
        continent: 'America',
        rating: 4.7,
        price: 899,
        image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        description: 'Carnival spirit, Copacabana, and Christ the Redeemer.',
    },
    {
        id: 'machu-picchu',
        name: 'Machu Picchu',
        country: 'Peru',
        continent: 'America',
        rating: 4.9,
        price: 1049,
        image: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        description: 'Ancient Inca citadel high in the Andes.',
    },
];

const CONTINENTS = [
    { name: 'Asia', icon: '🏯' },
    { name: 'Europe', icon: '🏰' },
    { name: 'America', icon: '🗽' },
];

// ─── Destination Card ─────────────────────────────────────────────────────────
function DestinationCard({
    item,
    onPress,
}: {
    item: Destination;
    onPress: () => void;
}) {
    const [liked, setLiked] = useState(false);

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
            {/* Full-bleed image */}
            <Image source={{ uri: item.image }} style={styles.cardImage} />

            {/* Bottom dark gradient overlay — top half transparent, bottom half dark */}
            <View style={styles.cardGradientTop} />
            <View style={styles.cardGradientBottom} />

            {/* Rating badge — top left */}
            <BlurView intensity={60} tint="dark" style={styles.ratingBadge}>
                <Star size={14} color="#FACC15" fill="#FACC15" />
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </BlurView>

            {/* Heart button — top right */}
            <TouchableOpacity
                style={styles.heartButton}
                onPress={() => setLiked(v => !v)}
                activeOpacity={0.8}
            >
                <BlurView intensity={50} tint="light" style={styles.heartBlur}>
                    <Text style={{ fontSize: 16 }}>{liked ? '❤️' : '🤍'}</Text>
                </BlurView>
            </TouchableOpacity>

            {/* Bottom content: country, name, price, arrow */}
            <View style={styles.cardBottom}>
                <BlurView intensity={30} tint="light" style={styles.cardGlassContent}>
                    <View style={{ flex: 1, marginRight: Spacing.md }}>
                        <View style={styles.countryRow}>
                            <MapPin size={13} color={Colors.primaryContainer} />
                            <Text style={styles.countryText}>{item.country}</Text>
                        </View>
                        <Text style={styles.destinationName}>{item.name}</Text>
                        <Text style={styles.priceText}>From <Text style={styles.priceBold}>₹{(item.price * 85).toLocaleString('en-IN')}</Text><Text style={{fontSize: 10, opacity: 0.8}}>/person</Text></Text>
                    </View>
                    <TouchableOpacity style={styles.arrowButton} onPress={onPress} activeOpacity={0.8}>
                        <ArrowUpRight size={24} color={Colors.text} />
                    </TouchableOpacity>
                </BlurView>
            </View>
        </TouchableOpacity>
    );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [selectedContinent, setSelectedContinent] = useState('Europe');
    const [notifCount] = useState(3);

    const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Explorer';
    const firstName = userName.split(' ')[0];

    const filteredDestinations = DESTINATIONS.filter(d => d.continent === selectedContinent);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header ── */}
                <View style={styles.header}>
                    <View style={styles.headerRow}>
                        {/* Menu button */}
                        <TouchableOpacity style={styles.iconButton}>
                            <Menu size={20} color={Colors.text} />
                        </TouchableOpacity>

                        {/* Bell */}
                        <View style={styles.headerRight}>
                            <TouchableOpacity style={styles.iconButton}>
                                <Bell size={20} color={Colors.text} />
                                {notifCount > 0 && (
                                    <View style={styles.notifBadge}>
                                        <Text style={styles.notifBadgeText}>{notifCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Greeting Dropdown */}
                    <Text style={styles.greetingTitle}>Welcome back</Text>
                    <Text style={styles.greeting}>
                        Hello, <Text style={styles.greetingName}>{firstName}</Text>
                    </Text>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Search size={20} color={Colors.primary} />
                        <TextInput 
                            style={styles.searchInput}
                            placeholder="Where will your nature take you?"
                            placeholderTextColor={Colors.textSecondary}
                        />
                    </View>
                </View>

                {/* ── Continent Filter Pills ── */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.pillsContainer}
                >
                    {CONTINENTS.map(c => (
                        <TouchableOpacity
                            key={c.name}
                            style={[styles.pill, selectedContinent === c.name && styles.pillActive]}
                            onPress={() => setSelectedContinent(c.name)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.pillIcon}>{c.icon}</Text>
                            <Text style={[styles.pillText, selectedContinent === c.name && styles.pillTextActive]}>
                                {c.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* ── Destination Cards ── */}
                <View style={styles.cardsSection}>
                    {filteredDestinations.map(dest => (
                        <DestinationCard
                            key={dest.id}
                            item={dest}
                            onPress={() => router.push('/(tabs)/explore')}
                        />
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 100 },

    // Header
    header: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
    },
    headerRight: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.sm,
        position: 'relative',
    },
    notifBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.background,
    },
    notifBadgeText: {
        fontFamily: FontFamily.bold,
        fontSize: 9,
        color: '#FFFFFF',
    },
    greetingTitle: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.xs,
        color: Colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        opacity: 0.8,
        marginBottom: 4,
    },
    greeting: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize['3xl'],
        color: Colors.text,
        letterSpacing: -0.5,
    },
    greetingName: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize['3xl'],
        color: Colors.text,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        marginTop: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        height: 64,
        borderRadius: 32,
        gap: Spacing.md,
        ...Shadows.sm,
    },
    searchInput: {
        flex: 1,
        fontFamily: FontFamily.medium,
        fontSize: FontSize.base,
        color: Colors.text,
        height: '100%',
    },

    // Continent Pills
    pillsContainer: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
        paddingTop: Spacing.sm,
        gap: Spacing.sm,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        ...Shadows.sm,
    },
    pillActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 6,
    },
    pillIcon: {
        fontSize: 20,
    },
    pillText: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.base,
        color: Colors.textSecondary,
    },
    pillTextActive: {
        color: '#FFFFFF',
        fontFamily: FontFamily.semiBold,
    },

    // Cards
    cardsSection: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
    },
    card: {
        height: 480,
        borderRadius: 32,
        overflow: 'hidden',
        backgroundColor: Colors.surface,
        ...Shadows.lg,
    },
    cardImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    cardGradientTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '40%',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    cardGradientBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '65%',
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    // Real gradient simulate: overlay the bottom half only
    ratingBadge: {
        position: 'absolute',
        top: 16,
        left: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        overflow: 'hidden',
    },
    ratingText: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.sm,
        color: '#FFFFFF',
    },
    heartButton: {
        position: 'absolute',
        top: 14,
        right: 14,
        width: 38,
        height: 38,
        borderRadius: 19,
        overflow: 'hidden',
    },
    heartBlur: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardBottom: {
        position: 'absolute',
        bottom: Spacing.lg,
        left: Spacing.lg,
        right: Spacing.lg,
    },
    cardGlassContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.lg,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.2)', // tint fallback
    },
    countryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    countryText: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.sm,
        color: 'rgba(255,255,255,0.85)',
    },
    destinationName: {
        fontFamily: FontFamily.bold,
        fontSize: 24,
        color: '#FFFFFF',
        marginBottom: 8,
    },
    priceText: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.sm,
        color: 'rgba(255,255,255,0.9)',
    },
    priceBold: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.lg,
        color: '#FFFFFF',
    },
    arrowButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.md,
        shadowColor: Colors.primary,
    },
});
