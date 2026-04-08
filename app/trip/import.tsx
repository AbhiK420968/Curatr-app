import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
    Linking, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants';
import { ChevronLeft, Link2, Instagram, Youtube, Globe, Clipboard as ClipboardIcon, Sparkles, MessageSquare } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { generateItineraryWithPuter } from '@/services/puterItineraryService';
import { tripService } from '@/services';
import { useItineraryContext } from '@/contexts/itinerary-context';

// Source detection from URL
function detectSource(url: string): string {
    const lower = url.toLowerCase();
    if (lower.includes('instagram.com') || lower.includes('instagr.am')) return 'Instagram';
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'YouTube';
    if (lower.includes('reddit.com') || lower.includes('redd.it')) return 'Reddit';
    if (lower.includes('tiktok.com')) return 'TikTok';
    if (lower.includes('twitter.com') || lower.includes('x.com')) return 'X / Twitter';
    return 'Other';
}

function getSourceIcon(source: string) {
    switch (source) {
        case 'Instagram': return <Instagram size={20} color="#E1306C" />;
        case 'YouTube': return <Youtube size={20} color="#FF0000" />;
        case 'Reddit': return <MessageSquare size={20} color="#FF4500" />;
        default: return <Globe size={20} color={Colors.primary} />;
    }
}

const SOURCES = [
    { key: 'Instagram Reel', icon: '📹', color: '#E1306C' },
    { key: 'Instagram Post', icon: '📸', color: '#833AB4' },
    { key: 'YouTube', icon: '▶️', color: '#FF0000' },
    { key: 'Reddit', icon: '🔗', color: '#FF4500' },
    { key: 'Blog / Other', icon: '🌐', color: Colors.primary },
];

export default function ImportTripScreen() {
    const router = useRouter();
    const { setItinerary } = useItineraryContext();

    const [url, setUrl] = useState('');
    const [selectedSource, setSelectedSource] = useState('');
    const [additionalContext, setAdditionalContext] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progressText, setProgressText] = useState('');

    const detectedSource = url.trim() ? detectSource(url) : '';

    const handlePaste = async () => {
        try {
            // Note: Clipboard is deprecated in RN but works; expo-clipboard is better for production
            const text = await Clipboard.getString();
            if (text) setUrl(text);
        } catch {
            // Silently fail
        }
    };

    const handleImport = async () => {
        if (!url.trim()) {
            Alert.alert('Enter URL', 'Please paste a link to import from.');
            return;
        }

        setIsProcessing(true);
        setProgressText('Analyzing content...');

        // Build a prompt that asks AI to extract travel info from the URL
        const source = selectedSource || detectedSource || 'Unknown';
        const importPrompt = `
You are a travel itinerary extractor. The user wants to create a travel itinerary from content they found online.

Source: ${source}
URL: ${url.trim()}
${additionalContext ? `Additional context from user: ${additionalContext}` : ''}

Based on this ${source} content about travel, create a detailed day-by-day itinerary. 
Infer the destination, duration, and activities from the URL and context.
If you can identify the destination from the URL (e.g., "bali-travel-guide" or "paris-vlog"), use that.
If not clear, use the additional context or make a reasonable guess.

Return a JSON object with this exact structure:
{
    "id": "imported-<random-4-chars>",
    "userId": "import",
    "destination": "<city, country>",
    "duration": <number>,
    "overview": "<2-3 sentence overview>",
    "days": [
        {
            "day": 1,
            "theme": "<day theme>",
            "activities": [
                {
                    "time": "09:00 AM",
                    "title": "<activity>",
                    "description": "<description>",
                    "duration": "2 hours",
                    "estimatedCost": "₹<amount>",
                    "location": "<location name>"
                }
            ]
        }
    ],
    "budgetBreakdown": { "total": "₹<amount>", "accommodation": "₹<amount>", "food": "₹<amount>", "activities": "₹<amount>", "transportation": "₹<amount>" },
    "tips": ["<tip1>", "<tip2>"],
    "createdAt": "${new Date().toISOString()}"
}

Create at least 3-5 activities per day. Make it realistic and detailed.
Return ONLY valid JSON, no markdown or extra text.
`;

        try {
            let itinerary: any;

            try {
                setProgressText('Reading content with AI...');
                // Use puter with a custom prompt approach
                const prefs = {
                    destination: 'Import from URL',
                    duration: 3,
                    budget: 'Moderate',
                    travelStyle: 'Cultural' as any,
                    interests: ['Sightseeing'],
                    groupSize: 1,
                    _customPrompt: importPrompt,
                };
                itinerary = await generateItineraryWithPuter(prefs);
                setProgressText('Building itinerary...');
            } catch (puterErr: any) {
                if (puterErr?.message?.includes('PUTER_UNAVAILABLE')) {
                    setProgressText('Using backend AI...');
                    // Fallback to backend — pass URL info in destination
                    itinerary = await tripService.generateItinerary({
                        destination: `Imported from ${source}: ${url.trim()}${additionalContext ? '. Context: ' + additionalContext : ''}`,
                        duration: 3,
                        budget: 'Moderate',
                        travelStyle: 'Cultural' as any,
                        interests: ['Sightseeing'],
                    });
                } else {
                    throw puterErr;
                }
            }

            setProgressText('Done!');
            setItinerary(itinerary);
            router.push('/trip/itinerary-result');
        } catch (err: any) {
            Alert.alert(
                'Import Failed',
                err?.message || 'Could not process this content. Try adding more context.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsProcessing(false);
            setProgressText('');
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Import Trip</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Hero text */}
                    <View style={styles.heroSection}>
                        <Text style={styles.heroEmoji}>🔗</Text>
                        <Text style={styles.heroTitle}>Import from anywhere</Text>
                        <Text style={styles.heroSubtitle}>
                            Paste a link from Instagram, YouTube, Reddit, or any travel content and our AI will generate an editable itinerary for you.
                        </Text>
                    </View>

                    {/* URL Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Paste URL</Text>
                        <View style={styles.urlInputRow}>
                            <View style={styles.urlInputContainer}>
                                <Link2 size={18} color={Colors.textMuted} />
                                <TextInput
                                    style={styles.urlInput}
                                    placeholder="https://www.instagram.com/reel/..."
                                    placeholderTextColor={Colors.textMuted}
                                    value={url}
                                    onChangeText={setUrl}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="url"
                                />
                            </View>
                            <TouchableOpacity style={styles.pasteBtn} onPress={handlePaste} activeOpacity={0.8}>
                                <ClipboardIcon size={18} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* Detected source badge */}
                        {detectedSource !== '' && (
                            <View style={styles.detectedBadge}>
                                {getSourceIcon(detectedSource)}
                                <Text style={styles.detectedText}>Detected: {detectedSource}</Text>
                            </View>
                        )}
                    </View>

                    {/* Source chips */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Source Type <Text style={styles.labelHint}>(optional)</Text></Text>
                        <View style={styles.sourceGrid}>
                            {SOURCES.map(s => (
                                <TouchableOpacity
                                    key={s.key}
                                    style={[styles.sourceChip, selectedSource === s.key && { backgroundColor: s.color + '15', borderColor: s.color }]}
                                    onPress={() => setSelectedSource(selectedSource === s.key ? '' : s.key)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.sourceEmoji}>{s.icon}</Text>
                                    <Text style={[styles.sourceText, selectedSource === s.key && { color: s.color, fontFamily: FontFamily.bold }]}>
                                        {s.key}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Additional context */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Additional Context <Text style={styles.labelHint}>(optional)</Text></Text>
                        <TextInput
                            style={styles.contextInput}
                            placeholder="e.g., 'This reel is about a 5-day Bali trip with temples and beaches...'"
                            placeholderTextColor={Colors.textMuted}
                            value={additionalContext}
                            onChangeText={setAdditionalContext}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Progress */}
                    {isProcessing && (
                        <View style={styles.progressRow}>
                            <ActivityIndicator size="small" color={Colors.primary} />
                            <Text style={styles.progressText}>{progressText}</Text>
                        </View>
                    )}

                    {/* Import Button */}
                    <TouchableOpacity
                        style={[styles.importBtn, (!url.trim() || isProcessing) && styles.importBtnDisabled]}
                        onPress={handleImport}
                        disabled={!url.trim() || isProcessing}
                        activeOpacity={0.8}
                    >
                        <BlurView intensity={isProcessing ? 50 : 80} tint="dark" style={styles.importBtnBlur}>
                            {isProcessing ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Sparkles size={20} color="#FFFFFF" />
                            )}
                            <Text style={styles.importBtnText}>
                                {isProcessing ? 'Importing...' : 'Import & Generate Itinerary'}
                            </Text>
                        </BlurView>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    },
    headerTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.text },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },

    // Hero
    heroSection: { alignItems: 'center', paddingVertical: Spacing.xl },
    heroEmoji: { fontSize: 48, marginBottom: Spacing.md },
    heroTitle: { fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.text, textAlign: 'center' },
    heroSubtitle: {
        fontFamily: FontFamily.regular, fontSize: FontSize.base, color: Colors.textSecondary,
        textAlign: 'center', marginTop: Spacing.sm, lineHeight: 22, paddingHorizontal: Spacing.md,
    },

    // Input groups
    inputGroup: { marginBottom: Spacing.xl },
    label: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.text, marginBottom: Spacing.sm },
    labelHint: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.textMuted },

    // URL input
    urlInputRow: { flexDirection: 'row', gap: Spacing.sm },
    urlInputContainer: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
        height: 52, paddingHorizontal: Spacing.md, ...Shadows.sm, shadowOpacity: 0.05,
    },
    urlInput: { flex: 1, fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.text, height: '100%' },
    pasteBtn: {
        width: 52, height: 52, borderRadius: BorderRadius.xl,
        backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center',
        ...Shadows.sm, shadowOpacity: 0.05,
    },
    detectedBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginTop: Spacing.sm, paddingHorizontal: 12, paddingVertical: 6,
        backgroundColor: Colors.primaryContainer, borderRadius: 16, alignSelf: 'flex-start',
    },
    detectedText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: Colors.primary },

    // Source chips
    sourceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    sourceChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
        backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.borderLight,
    },
    sourceEmoji: { fontSize: 16 },
    sourceText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary },

    // Context input
    contextInput: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
        padding: Spacing.md, minHeight: 80,
        fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.text,
        ...Shadows.sm, shadowOpacity: 0.05, lineHeight: 20,
    },

    // Progress
    progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: Spacing.md },
    progressText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary },

    // Import button
    importBtn: { height: 60, borderRadius: 30, overflow: 'hidden', marginTop: Spacing.md, ...Shadows.md },
    importBtnDisabled: { opacity: 0.5 },
    importBtnBlur: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(39,169,130,0.5)', width: '100%', height: '100%', gap: 12,
    },
    importBtnText: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: '#FFFFFF' },
});
