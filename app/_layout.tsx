import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import * as SplashScreen from 'expo-splash-screen';
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider } from '@/contexts/AuthContext';
import { ItineraryProvider } from '@/contexts/itinerary-context';
import { Colors } from '@/constants';

// Keep splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

// Secure token cache for Clerk session persistence
const tokenCache = {
    async getToken(key: string) {
        try {
            return await SecureStore.getItemAsync(key);
        } catch {
            return null;
        }
    },
    async saveToken(key: string, value: string) {
        try {
            await SecureStore.setItemAsync(key, value);
        } catch { }
    },
    async clearToken(key: string) {
        try {
            await SecureStore.deleteItemAsync(key);
        } catch { }
    },
};

const PUBLISHABLE_KEY =
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        PlusJakartaSans_400Regular,
        PlusJakartaSans_500Medium,
        PlusJakartaSans_600SemiBold,
        PlusJakartaSans_700Bold,
        PlusJakartaSans_800ExtraBold,
    });

    useEffect(() => {
        if (fontsLoaded) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return null;
    }

    return (
        <ClerkProvider publishableKey={PUBLISHABLE_KEY} tokenCache={tokenCache}>
            <ClerkLoaded>
                <AuthProvider>
                    <ItineraryProvider>
                        <StatusBar style="dark" />
                        <Stack
                            screenOptions={{
                                headerShown: false,
                                contentStyle: { backgroundColor: Colors.background },
                                animation: 'slide_from_right',
                            }}
                        >
                            <Stack.Screen name="index" options={{ headerShown: false }} />
                            <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
                            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                            <Stack.Screen
                                name="trip/create"
                                options={{
                                    headerShown: false,
                                    presentation: 'modal',
                                    animation: 'slide_from_bottom',
                                }}
                            />
                            <Stack.Screen
                                name="trip/[id]"
                                options={{
                                    headerShown: false,
                                    animation: 'slide_from_right',
                                }}
                            />
                            <Stack.Screen
                                name="trip/itinerary-result"
                                options={{
                                    headerShown: false,
                                    animation: 'slide_from_right',
                                }}
                            />
                            <Stack.Screen
                                name="trip/import"
                                options={{
                                    headerShown: false,
                                    presentation: 'modal',
                                    animation: 'slide_from_bottom',
                                }}
                            />
                        </Stack>
                    </ItineraryProvider>
                </AuthProvider>
            </ClerkLoaded>
        </ClerkProvider>
    );
}
