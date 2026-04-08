import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Animated,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontFamily, FontSize, Spacing, Shadows } from '@/constants';
import { ArrowRight } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';

// Full-bleed background — Florence / Italian coastal town (matching Curatr Splash)
const BG_IMAGE =
    'https://images.unsplash.com/photo-1681844931449-e0992a27d157?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';

export default function OnboardingScreen() {
    const router = useRouter();
    const { width, height } = useWindowDimensions();

    // Subtle fade-in animation for the content
    const fadeIn = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeIn, {
            toValue: 1,
            duration: 800,
            delay: 200,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleContinue = () => {
        router.replace('/(auth)/login');
    };

    return (
        <View style={[styles.container, { width, height }]}>
            <StatusBar style="light" />

            {/* Full-bleed background image */}
            <Image source={{ uri: BG_IMAGE }} style={styles.bgImage} />

            {/* Gradient overlays — match Curatr "from-transparent via-transparent to-black/50" */}
            <View style={styles.gradientTop} />
            <View style={styles.gradientBottom} />

            {/* Content layer */}
            <Animated.View style={[styles.fullscreen, { opacity: fadeIn }]}>
                <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

                    {/* Logo — top left, black text (matching Curatr) */}
                    <View style={styles.logoSection}>
                        <Text style={styles.logoText}>Curatr</Text>
                    </View>

                    {/* Bottom content */}
                    <View style={styles.bottomSection}>
                        {/* Headline + tagline */}
                        <View style={styles.textBlock}>
                            <Text style={styles.headline}>
                                Journeys{'\n'}Made Simple
                            </Text>
                            <Text style={styles.tagline}>Travel smarter with Curatr</Text>
                        </View>

                        {/* Buttons row — Continue (wide) + arrow slide (compact) */}
                        <View style={styles.buttonsRow}>
                            {/* Continue button */}
                            <TouchableOpacity
                                style={styles.continueButtonWrap}
                                onPress={handleContinue}
                                activeOpacity={0.85}
                            >
                                <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
                                    <Text style={styles.buttonText}>Continue</Text>
                                </BlurView>
                            </TouchableOpacity>

                            {/* Slide / arrow button */}
                            <TouchableOpacity
                                style={styles.arrowButtonWrap}
                                onPress={handleContinue}
                                activeOpacity={0.85}
                            >
                                <BlurView intensity={60} tint="dark" style={styles.buttonBlur}>
                                    <Text style={styles.buttonText}>Slide</Text>
                                    <ArrowRight size={16} color="#FFFFFF" />
                                </BlurView>
                            </TouchableOpacity>
                        </View>

                        {/* Privacy link */}
                        <TouchableOpacity style={styles.privacyButton}>
                            <Text style={styles.privacyText}>Privacy Policy</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    bgImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },

    // Two-layer gradient: light vignette at top, dark fade at bottom
    gradientTop: {
        ...StyleSheet.absoluteFillObject,
        bottom: '40%',
        backgroundColor: 'rgba(0,0,0,0.08)',
    },
    gradientBottom: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '55%',
        backgroundColor: 'rgba(0,0,0,0.55)',
    },

    fullscreen: {
        ...StyleSheet.absoluteFillObject,
    },
    safeArea: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 32,
        paddingTop: 12,
        paddingBottom: 16,
    },

    // Logo — black text matching Curatr Splash (appears on lighter photo top)
    logoSection: {
        marginTop: 4,
    },
    logoText: {
        fontFamily: FontFamily.bold,
        fontSize: 36,
        color: '#1A1A1A',
        letterSpacing: -1,
        // Text shadow so it pops on any background section
        textShadowColor: 'rgba(255,255,255,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },

    // Bottom block
    bottomSection: {
        gap: Spacing.lg,
    },
    textBlock: {
        gap: 8,
    },
    headline: {
        fontFamily: FontFamily.bold,
        fontSize: 52,
        lineHeight: 58,
        color: '#FFFFFF',
        letterSpacing: -1.5,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    tagline: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.base,
        color: 'rgba(255,255,255,0.88)',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },

    // Buttons
    buttonsRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        alignItems: 'center',
    },
    continueButtonWrap: {
        flex: 1,
        height: 52,
        borderRadius: 26,
        overflow: 'hidden',
        ...Shadows.md,
    },
    arrowButtonWrap: {
        height: 52,
        borderRadius: 26,
        overflow: 'hidden',
        paddingHorizontal: 0,
        ...Shadows.md,
    },
    buttonBlur: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.30)',
        width: '100%',
        height: '100%',
        paddingHorizontal: 24,
        gap: 8,
    },
    buttonText: {
        fontFamily: FontFamily.semiBold,
        fontSize: FontSize.base,
        color: '#FFFFFF',
    },

    privacyButton: {
        alignSelf: 'center',
        paddingVertical: 8,
    },
    privacyText: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.sm,
        color: 'rgba(255,255,255,0.75)',
    },
});
