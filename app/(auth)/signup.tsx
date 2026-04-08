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
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, Chrome, Apple } from 'lucide-react-native';

export default function SignUpScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [pendingVerification, setPendingVerification] = useState(false);
    const [code, setCode] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    
    const { signUp, verifySignUp } = useAuth();
    const router = useRouter();

    const handleSignUp = async () => {
        setErrorMessage('');
        if (!name.trim() || !email.trim() || !password.trim()) {
            setErrorMessage('Please fill in all fields');
            return;
        }
        if (password.length < 6) {
            setErrorMessage('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        try {
            await signUp(email.trim(), password, name.trim());
            setPendingVerification(true);
        } catch (error: any) {
            console.error('SignUp Error:', JSON.stringify(error, null, 2));
            const msg =
                error?.errors?.[0]?.longMessage ??
                error?.errors?.[0]?.message ??
                error?.message ??
                'Something went wrong. Please try again.';
            setErrorMessage(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async () => {
        setErrorMessage('');
        if (!code.trim()) {
            setErrorMessage('Please enter the verification code');
            return;
        }

        setIsLoading(true);
        try {
            await verifySignUp(code.trim());
            // Once verified, the AuthContext automatically sets the session 
            // and `app/index.tsx` will redirect to /(tabs)
            router.replace('/(tabs)');
        } catch (error: any) {
            console.error('Verify Error:', JSON.stringify(error, null, 2));
            const msg =
                error?.errors?.[0]?.longMessage ??
                error?.errors?.[0]?.message ??
                error?.message ??
                'Invalid verification code. Please try again.';
            setErrorMessage(msg);
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
                {/* Back button */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <View style={styles.backButtonCircle}>
                        <ArrowLeft size={20} color={Colors.text} />
                    </View>
                </TouchableOpacity>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>{pendingVerification ? 'Verify Email' : 'Create Account'}</Text>
                    <Text style={styles.subtitle}>
                        {pendingVerification 
                            ? 'Enter the 6-digit code sent to your email' 
                            : 'Start planning your dream trips'}
                    </Text>
                </View>

                {/* Form Card */}
                {!pendingVerification ? (
                    <View style={styles.card}>
                        {errorMessage ? (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{errorMessage}</Text>
                            </View>
                        ) : null}

                        {/* Name Input */}
                        <View style={styles.inputContainer}>
                            <User size={18} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Full Name"
                                placeholderTextColor={Colors.textMuted}
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                            />
                        </View>

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
                                placeholder="Password (min 6 characters)"
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

                        {/* Sign Up Button */}
                        <TouchableOpacity
                            style={[styles.signUpButton, isLoading && styles.buttonDisabled]}
                            onPress={handleSignUp}
                            disabled={isLoading}
                            activeOpacity={0.85}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={Colors.textInverse} />
                            ) : (
                                <Text style={styles.signUpButtonText}>Create Account</Text>
                            )}
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or continue with</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* OAuth Buttons */}
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
                    </View>
                ) : (
                    <View style={styles.card}>
                        {errorMessage ? (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{errorMessage}</Text>
                            </View>
                        ) : null}

                        {/* OTP Input */}
                        <View style={styles.inputContainer}>
                            <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="6-digit code"
                                placeholderTextColor={Colors.textMuted}
                                value={code}
                                onChangeText={setCode}
                                keyboardType="number-pad"
                            />
                        </View>
                        
                        {/* Verify Button */}
                        <TouchableOpacity
                            style={[styles.signUpButton, isLoading && styles.buttonDisabled]}
                            onPress={handleVerify}
                            disabled={isLoading}
                            activeOpacity={0.85}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={Colors.textInverse} />
                            ) : (
                                <Text style={styles.signUpButtonText}>Verify Email</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        {pendingVerification ? 'Didn\'t receive a code?' : 'Already have an account?'}
                    </Text>
                    <TouchableOpacity onPress={() => pendingVerification ? null : router.back()}>
                        <Text style={[styles.footerLink, pendingVerification && { color: Colors.textMuted }]}>
                            {pendingVerification ? ' Check your spam folder' : ' Sign In'}
                        </Text>
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
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing['2xl'],
    },
    backButton: {
        marginBottom: Spacing.md,
    },
    backButtonCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.sm,
    },
    header: {
        marginBottom: Spacing.lg,
    },
    title: {
        fontFamily: FontFamily.bold,
        fontSize: FontSize['4xl'],
        color: Colors.text,
    },
    subtitle: {
        fontFamily: FontFamily.regular,
        fontSize: FontSize.lg,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    errorContainer: {
        backgroundColor: '#FEE2E2',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
    },
    errorText: {
        fontFamily: FontFamily.medium,
        fontSize: FontSize.sm,
        color: '#DC2626',
        textAlign: 'center',
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xxl,
        padding: Spacing.lg,
        ...Shadows.lg,
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
    signUpButton: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.sm,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    signUpButtonText: {
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
