import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize, Spacing, Shadows } from '@/constants';
import { ChevronLeft, Heart, MapPin, Star, Bed, Map, Utensils, ArrowRight } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

const GALLERY_IMAGES = [
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?q=80&w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1504280390227-8090886fdb53?q=80&w=200&auto=format&fit=crop',
];

export default function ExploreScreen() {
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* Header Image Section */}
                <View style={[styles.imageContainer, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.45 }]}>
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=100&w=1200&auto=format&fit=crop' }}
                        style={styles.mainImage}
                    />
                    
                    {/* Floating Header Buttons */}
                    <SafeAreaView style={styles.floatingHeader} edges={['top']}>
                        <TouchableOpacity style={styles.iconButton}>
                            <ChevronLeft size={24} color={Colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton}>
                            <Heart size={20} color={Colors.text} />
                        </TouchableOpacity>
                    </SafeAreaView>

                    {/* Gallery Thumbnails Overlay */}
                    <View style={styles.galleryOverlay}>
                        {GALLERY_IMAGES.map((img, index) => (
                            <Image key={index} source={{ uri: img }} style={styles.galleryThumbnail} />
                        ))}
                        <View style={styles.galleryMore}>
                            <Text style={styles.galleryMoreText}>+16</Text>
                        </View>
                    </View>
                </View>

                {/* Content Section */}
                <View style={styles.contentContainer}>
                    {/* Drag Handle */}
                    <View style={styles.dragHandle} />

                    {/* Title & Rating */}
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>Passo Rolle, TN</Text>
                        <View style={styles.ratingContainer}>
                            <Star size={14} color="#D1D5DB" />
                            <Text style={styles.ratingText}>4.7<Text style={styles.reviewText}>(9k review)</Text></Text>
                        </View>
                    </View>

                    {/* Location & Map direction */}
                    <View style={styles.locationRow}>
                        <View style={styles.locationLeft}>
                            <MapPin size={14} color={Colors.textMuted} />
                            <Text style={styles.locationText}>Italia</Text>
                        </View>
                        <TouchableOpacity style={styles.mapDirectionBtn}>
                            <MapPin size={14} color={Colors.primary} />
                            <Text style={styles.mapDirectionText}>Map Direction</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Facilities Section */}
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Facilities</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See all {'>'}</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.facilitiesScroll}>
                        {/* Facility Item 1 */}
                        <View style={styles.facilityItem}>
                            <View style={styles.facilityIconCircle}>
                                <Bed size={18} color={Colors.textMuted} />
                            </View>
                            <Text style={styles.facilityText}>1 Bed</Text>
                        </View>
                        
                        {/* Facility Item 2 (Active/Selected) */}
                        <View style={styles.facilityItemActive}>
                            <View style={styles.facilityIconCircleActive}>
                                <Map size={18} color={Colors.text} />
                            </View>
                            <Text style={styles.facilityTextActive}>Guide</Text>
                        </View>

                        {/* Facility Item 3 */}
                        <View style={styles.facilityItem}>
                            <View style={styles.facilityIconCircle}>
                                <Utensils size={18} color={Colors.textMuted} />
                            </View>
                            <Text style={styles.facilityText}>Dinner</Text>
                        </View>
                    </ScrollView>

                    {/* Description Section */}
                    <View style={styles.descriptionSection}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text style={styles.descriptionText}>
                            The Rolle Pass is a high mountain pass in Trentino in Italy. It connects the Fiemme and Primiero valleys, and the communities of Predazzo, San Martino di Castrozza and Fiera di Primiero. The pass road was built between 18...
                        </Text>
                        <TouchableOpacity>
                            <Text style={styles.readMoreText}>Read More {'>'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Sticky Action Bar */}
            <View style={styles.bottomBarContainer}>
                <BlurView intensity={80} tint="light" style={styles.bottomBar}>
                    <View style={styles.priceContainer}>
                        <Text style={styles.priceAmount}>$780</Text>
                        <Text style={styles.pricePeriod}>/ person</Text>
                    </View>
                    <TouchableOpacity style={styles.bookButtonContainer} activeOpacity={0.8}>
                        <BlurView intensity={80} tint="dark" style={styles.bookButtonBlur}>
                            <Text style={styles.bookButtonText}>Book Now</Text>
                            <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
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
        paddingBottom: 140, // Account for sticky bottom bar AND tab bar combined
    },
    imageContainer: {
        backgroundColor: Colors.background,
    },
    mainImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    floatingHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: 10,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.sm,
    },
    galleryOverlay: {
        position: 'absolute',
        bottom: 40,
        right: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    galleryThumbnail: {
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    galleryMore: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    galleryMoreText: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.sm,
        color: '#FFFFFF',
    },
    contentContainer: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        marginTop: -30, // Overlap the image
        paddingTop: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: Colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: Spacing.lg,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    title: {
        fontFamily: FontFamily.bold,
        fontSize: 26,
        color: Colors.text,
        flex: 1,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.sm,
        color: Colors.textMuted,
    },
    reviewText: {
        fontFamily: FontFamily.regular,
        fontSize: FontSize.xs,
        color: Colors.textMuted,
    },
    locationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    locationLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationText: {
        fontFamily: FontFamily.regular,
        fontSize: FontSize.sm,
        color: Colors.textMuted,
    },
    mapDirectionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    mapDirectionText: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.sm,
        color: Colors.primary,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.lg,
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    seeAllText: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.sm,
        color: Colors.textMuted,
    },
    facilitiesScroll: {
        paddingRight: Spacing.lg,
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    facilityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 24,
        gap: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    facilityItemActive: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 24,
        gap: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        ...Shadows.sm,
        shadowColor: 'rgba(0,0,0,0.05)',
    },
    facilityIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    facilityIconCircleActive: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    facilityText: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        marginRight: 4,
    },
    facilityTextActive: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.sm,
        color: Colors.text,
        marginRight: 4,
    },
    descriptionSection: {
        marginBottom: Spacing.xl,
    },
    descriptionText: {
        fontFamily: FontFamily.regular,
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        lineHeight: 22,
        marginBottom: Spacing.xs,
    },
    readMoreText: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.sm,
        color: Colors.primary,
    },
    bottomBarContainer: {
        position: 'absolute',
        bottom: 80, // Sit just above the bottom tab bar
        left: Spacing.lg,
        right: Spacing.lg,
        borderRadius: 32,
        overflow: 'hidden',
        ...Shadows.lg,
    },
    bottomBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    priceContainer: {
        justifyContent: 'center',
    },
    priceAmount: {
        fontFamily: FontFamily.bold,
        fontSize: 28,
        color: Colors.text,
    },
    pricePeriod: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.sm,
        color: Colors.textMuted,
    },
    bookButtonContainer: {
        borderRadius: 28,
        overflow: 'hidden',
        height: 56,
        ...Shadows.md,
        shadowColor: Colors.primary,
        shadowOpacity: 0.3,
    },
    bookButtonBlur: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(39, 169, 130, 0.5)',
        height: '100%',
        paddingHorizontal: 28,
        gap: 8,
    },
    bookButtonText: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize.base,
        color: '#FFFFFF',
    },
});
