import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants';
import { Mail, Lock, Eye, EyeOff, Chrome, Apple, KeyRound } from 'lucide-react-native';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [needs2FA, setNeeds2FA] = useState(false);
    const [otp, setOtp] = useState('');
    const { signIn, verifySignIn } = useAuth();
    const router = useRouter();

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Missing fields', 'Please enter your email and password.');
            return;
        }
        setIsLoading(true);
        try {
            await signIn(email.trim(), password);
            router.replace('/(tabs)');
        } catch (err: any) {
            if (err?.message?.includes('needs_second_factor')) {
                setNeeds2FA(true);
            } else {
                Alert.alert(
                    'Sign In Failed',
                    err?.errors?.[0]?.longMessage ?? err?.message ?? 'Invalid email or password.',
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp.trim()) {
            Alert.alert('Missing code', 'Please enter your verification code.');
            return;
        }
        setIsLoading(true);
        try {
            await verifySignIn(otp.trim());
            router.replace('/(tabs)');
        } catch (err: any) {
            Alert.alert(
                'Verification Failed',
                err?.errors?.[0]?.longMessage ?? err?.message ?? 'Invalid verification code.',
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.logo}>Curatr</Text>
                    <Text style={styles.tagline}>Plan better trips in minutes</Text>
                </View>

                {/* Form Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{needs2FA ? 'Two-Factor Authentication' : 'Welcome back'}</Text>
                    <Text style={styles.cardSubtitle}>
                        {needs2FA ? 'Enter the verification code sent to you' : 'Sign in to continue planning your trips'}
                    </Text>

                    {!needs2FA ? (
                        <>
                            {/* Email Input */}
                            <View style={styles.inputContainer}>
                        <Mail size={18} color={Colors.textMuted} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email address"
                            placeholderTextColor={Colors.textMuted}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                        />
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                        <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor={Colors.textMuted}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            style={styles.eyeIcon}
                        >
                            {showPassword ? (
                                <EyeOff size={18} color={Colors.textMuted} />
                            ) : (
                                <Eye size={18} color={Colors.textMuted} />
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Forgot Password */}
                    <TouchableOpacity style={styles.forgotPassword}>
                        <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                    </TouchableOpacity>

                    {/* Sign In Button */}
                    <TouchableOpacity
                        style={[styles.signInButton, isLoading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={isLoading}
                        activeOpacity={0.85}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={Colors.textInverse} />
                        ) : (
                            <Text style={styles.signInButtonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or continue with</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* OAuth Buttons (wired via Clerk OAuth — requires Expo build) */}
                    <View style={styles.oauthRow}>
                        <TouchableOpacity style={styles.oauthButton} activeOpacity={0.7}>
                            <Chrome size={20} color={Colors.text} />
                            <Text style={styles.oauthButtonText}>Google</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.oauthButton} activeOpacity={0.7}>
                            <Apple size={20} color={Colors.text} />
                            <Text style={styles.oauthButtonText}>Apple</Text>
                        </TouchableOpacity>
                    </View>
                 </>
                ) : (
                    <>
                        <View style={styles.inputContainer}>
                            <KeyRound size={18} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Verification Code"
                                placeholderTextColor={Colors.textMuted}
                                value={otp}
                                onChangeText={setOtp}
                                keyboardType="number-pad"
                                autoCapitalize="none"
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.signInButton, isLoading && styles.buttonDisabled]}
                            onPress={handleVerifyOtp}
                            disabled={isLoading}
                            activeOpacity={0.85}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={Colors.textInverse} />
                            ) : (
                                <Text style={styles.signInButtonText}>Verify & Sign In</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={{marginTop: Spacing.md, alignItems: 'center'}}
                            onPress={() => setNeeds2FA(false)}
                            disabled={isLoading}
                        >
                            <Text style={styles.forgotPasswordText}>Back to login</Text>
                        </TouchableOpacity>
                    </>
                )}
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account?</Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                        <Text style={styles.footerLink}> Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing['2xl'],
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    logo: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize['5xl'],
        color: Colors.primary,
        letterSpacing: -1.5,
    },
    tagline: {
        fontFamily: FontFamily.regular,
        fontSize: FontSize.base,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xxl,
        padding: Spacing.lg,
        ...Shadows.lg,
    },
    cardTitle: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize['2xl'],
        color: Colors.text,
        marginBottom: 4,
    },
    cardSubtitle: {
        fontFamily: FontFamily.regular,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.lg,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        height: 52,
        marginBottom: Spacing.md,
    },
    inputIcon: {
        marginRight: Spacing.sm,
    },
    input: {
        flex: 1,
        fontFamily: FontFamily.regular,
        fontSize: FontSize.base,
        color: Colors.text,
        height: '100%',
    },
    eyeIcon: {
        padding: Spacing.sm,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: Spacing.md,
    },
    forgotPasswordText: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.sm,
        color: Colors.primary,
    },
    signInButton: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    signInButtonText: {
        fontFamily: FontFamily.semiBold,
        fontSize: FontSize.base,
        color: Colors.textInverse,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Spacing.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.border,
    },
    dividerText: {
        fontFamily: FontFamily.regular,
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        marginHorizontal: Spacing.md,
    },
    oauthRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    oauthButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        height: 48,
        backgroundColor: Colors.surface,
    },
    oauthButtonText: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.base,
        color: Colors.text,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: Spacing.xl,
    },
    footerText: {
        fontFamily: FontFamily.regular,
        fontSize: FontSize.base,
        color: Colors.textSecondary,
    },
    footerLink: {
        fontFamily: FontFamily.semiBold,
        fontSize: FontSize.base,
        color: Colors.primary,
    },
});
