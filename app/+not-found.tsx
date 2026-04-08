import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius } from '@/constants';

export default function NotFound() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>404</Text>
            <Text style={styles.subtitle}>Page not found</Text>
            <TouchableOpacity
                style={styles.button}
                onPress={() => router.replace('/')}
            >
                <Text style={styles.buttonText}>Go Home</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    title: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize['5xl'],
        color: Colors.primary,
    },
    subtitle: {
        fontFamily: FontFamily.regular,
        fontSize: FontSize.lg,
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    button: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    buttonText: {
        fontFamily: FontFamily.semiBold,
        fontSize: FontSize.base,
        color: Colors.textInverse,
    },
});
