import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants';

import { Redirect } from 'expo-router';

export default function Index() {
    const { session, isLoading } = useAuth();

    if (isLoading) {
        return (
        <View style={styles.container}>
            <View style={styles.logoContainer}>
                <Text style={styles.logo}>Curatr</Text>
                <Text style={styles.tagline}>Plan better trips in minutes</Text>
            </View>
            <View style={styles.loadingDots}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
            </View>
        </View>
        );
    }

    if (!session) {
        return <Redirect href="/onboarding" />;
    }

    return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.primary,
    },
    logoContainer: {
        alignItems: 'center',
    },
    logo: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize['5xl'],
        color: '#FFFFFF',
        letterSpacing: -1.5,
    },
    tagline: {
        fontFamily: FontFamily.regular,
        fontSize: FontSize.lg,
        color: 'rgba(255, 255, 255, 0.6)',
        marginTop: Spacing.sm,
    },
    loadingDots: {
        flexDirection: 'row',
        gap: 8,
        marginTop: Spacing['2xl'],
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    dot1: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
    dot2: {
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    dot3: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
});
