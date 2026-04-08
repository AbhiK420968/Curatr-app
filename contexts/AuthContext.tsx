/**
 * AuthContext — Clerk-backed auth provider
 *
 * Wraps Clerk's hooks into a simple, stable API that the rest of the app
 * already uses (session / user / isLoading / signIn / signUp / signOut).
 * The `user` shape is mapped so that all existing screens keep working.
 */
import React, { createContext, useContext } from 'react';
import {
    useAuth as useClerkAuth,
    useUser,
    useSignIn,
    useSignUp,
} from '@clerk/clerk-expo';

// ── Minimal compatible User shape ─────────────────────────────────────────────
export interface AppUser {
    id: string;
    email: string;
    user_metadata: {
        name?: string;
        full_name?: string;
        avatar_url?: string;
        travelPreferences?: Record<string, any>;
    };
    created_at: string;
}

interface AuthContextType {
    session: boolean;            // true = signed in
    user: AppUser | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string) => Promise<void>;
    verifySignUp: (code: string) => Promise<void>;
    verifySignIn: (code: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: false,
    user: null,
    isLoading: true,
    signIn: async () => { },
    signUp: async () => { },
    verifySignUp: async () => { },
    verifySignIn: async () => { },
    signOut: async () => { },
});

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { isLoaded: authLoaded, isSignedIn, signOut: clerkSignOut } = useClerkAuth();
    const { isLoaded: userLoaded, user: clerkUser } = useUser();
    const { signIn: clerkSignIn, isLoaded: signInLoaded, setActive: setSignInActive } = useSignIn();
    const { signUp: clerkSignUp, isLoaded: signUpLoaded, setActive: setSignUpActive } = useSignUp();

    const currentSignInStrategy = React.useRef<string | null>(null);

    const isLoading = !authLoaded || !userLoaded;

    // Map Clerk user → AppUser shape existing screens expect
    const user: AppUser | null = clerkUser
        ? {
            id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
            user_metadata: {
                name: clerkUser.fullName ?? clerkUser.firstName ?? undefined,
                full_name: clerkUser.fullName ?? undefined,
                avatar_url: clerkUser.imageUrl ?? undefined,
                travelPreferences: (clerkUser.unsafeMetadata as any)?.travelPreferences,
            },
            created_at: clerkUser.createdAt
                ? new Date(clerkUser.createdAt).toISOString()
                : new Date().toISOString(),
        }
        : null;

    const signIn = async (email: string, password: string) => {
        if (!signInLoaded) return;
        const result = await clerkSignIn.create({
            identifier: email,
            password,
        });
        if (result.status === 'complete') {
            await setSignInActive({ session: result.createdSessionId });
        } else if (result.status === 'needs_second_factor') {
            const factor = result.supportedSecondFactors?.find(
                (f) => f.strategy === 'email_code' || f.strategy === 'phone_code' || f.strategy === 'totp'
            );
            if (factor) {
                currentSignInStrategy.current = factor.strategy;
                if (factor.strategy === 'email_code') {
                    await clerkSignIn.prepareSecondFactor({
                        strategy: 'email_code',
                        emailAddressId: (factor as any).emailAddressId,
                    });
                } else if (factor.strategy === 'phone_code') {
                    await clerkSignIn.prepareSecondFactor({
                        strategy: 'phone_code',
                        phoneNumberId: (factor as any).phoneNumberId,
                    });
                }
            }
            throw new Error('needs_second_factor');
        } else {
            throw new Error('Sign-in incomplete: ' + result.status);
        }
    };

    const signUp = async (email: string, password: string, name: string) => {
        if (!signUpLoaded) return;
        const [firstName, ...rest] = name.trim().split(' ');
        const lastName = rest.join(' ') || firstName; // Fallback to first name if missing
        const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random() * 1000); // Unique username

        const result = await clerkSignUp.create({
            emailAddress: email,
            password,
            firstName,
            lastName,
            username,
        });

        // Start email verification if required
        if (result.status === 'missing_requirements') {
            await clerkSignUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        }
    };

    const verifySignUp = async (code: string) => {
        if (!signUpLoaded) return;
        const result = await clerkSignUp.attemptEmailAddressVerification({ code });
        if (result.status === 'complete') {
            await setSignUpActive({ session: result.createdSessionId });
        } else {
            console.error('VERIFY COMPLETE OBJECT:', JSON.stringify(result, null, 2));
            const missing = result.missingFields?.join(', ') || 'unknown';
            const unverified = result.unverifiedFields?.join(', ') || 'unknown';
            throw new Error(`Verification failed. Status: ${result.status}. Missing: ${missing}. Unverified: ${unverified}`);
        }
    };

    const verifySignIn = async (code: string) => {
        if (!signInLoaded) return;
        const strategy = currentSignInStrategy.current || 'email_code';
        const result = await clerkSignIn.attemptSecondFactor({
            strategy: strategy as any,
            code,
        });
        if (result.status === 'complete') {
            await setSignInActive({ session: result.createdSessionId });
        } else {
            throw new Error('Verification failed. Status: ' + result.status);
        }
    };

    const signOut = async () => {
        await clerkSignOut();
    };

    return (
        <AuthContext.Provider
            value={{
                session: !!isSignedIn,
                user,
                isLoading,
                signIn,
                signUp,
                verifySignUp,
                verifySignIn,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
