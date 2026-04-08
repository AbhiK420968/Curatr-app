/**
 * Profile Store — Storage Layer
 *
 * Saves the user's travel preferences (profile object) to AsyncStorage.
 * Returning users have their profile pre-loaded so they never fill onboarding twice.
 *
 * Data flow: Onboarding UI → Profile object → profileStore.saveProfile()
 *            App start     → profileStore.loadProfile() → pre-fill wizard state
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = '@curatr:user_profile';

export interface UserProfile {
    /** Wizard step 0 — last used destination (optional, for convenience) */
    lastDestination?: string;
    /** Wizard step 1 — days index in DAYS_OPTIONS array */
    daysIndex: number;
    /** Wizard step 2 — vibe index in VIBES array */
    vibeIndex: number;
    /** Wizard step 3 — budget index in BUDGET_TIERS array */
    budgetIndex: number;
    /** Wizard step 4 — people index in PEOPLE_OPTIONS array */
    peopleIndex: number;
    /** ISO timestamp of last save */
    updatedAt: string;
}

const DEFAULT_PROFILE: UserProfile = {
    daysIndex: 2,
    vibeIndex: 0,
    budgetIndex: 1,
    peopleIndex: 0,
    updatedAt: new Date().toISOString(),
};

/**
 * Save the user's wizard selections to persistent storage.
 * Call this whenever the user generates a trip so preferences are remembered.
 */
export async function saveProfile(profile: Omit<UserProfile, 'updatedAt'>): Promise<void> {
    try {
        const data: UserProfile = { ...profile, updatedAt: new Date().toISOString() };
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(data));
    } catch (err) {
        console.warn('[ProfileStore] Failed to save profile:', err);
    }
}

/**
 * Load the persisted user profile. Returns DEFAULT_PROFILE if nothing is saved yet.
 */
export async function loadProfile(): Promise<UserProfile> {
    try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (!raw) return DEFAULT_PROFILE;
        return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
    } catch (err) {
        console.warn('[ProfileStore] Failed to load profile:', err);
        return DEFAULT_PROFILE;
    }
}

/**
 * Clear the saved profile (e.g. on sign-out).
 */
export async function clearProfile(): Promise<void> {
    try {
        await AsyncStorage.removeItem(PROFILE_KEY);
    } catch (err) {
        console.warn('[ProfileStore] Failed to clear profile:', err);
    }
}
