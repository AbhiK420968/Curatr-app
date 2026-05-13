import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Image,
    TextInput,
    Switch,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants';
import {
    User, Mail, LogOut, Settings, Globe, Edit3, Bell, Shield,
    UserPlus, Users, Check, X, Trash2, KeyRound, Compass,
    Calendar, MapPin, Award, Zap, Star, ChevronRight,
} from 'lucide-react-native';
import {
    getFriends, getPendingRequests, sendFriendRequest, acceptFriendRequest,
    rejectFriendRequest, removeFriend, calculateTravelStats,
    type Friend, type FriendRequest,
} from '@/services/friendsService';
import { tripService } from '@/services/tripService';
import { useRouter } from 'expo-router';
import type { Itinerary } from '@/types';

// ── Achievement badge definitions ──
const ACHIEVEMENTS = [
    { id: 'first_trip', icon: '✈️', label: 'First Flight', desc: 'Planned your first trip', minTrips: 1 },
    { id: 'explorer', icon: '🗺️', label: 'Explorer', desc: 'Visited 3+ countries', minCountries: 3 },
    { id: 'adventurer', icon: '🏔️', label: 'Adventurer', desc: 'Planned 5+ trips', minTrips: 5 },
    { id: 'globetrotter', icon: '🌍', label: 'Globetrotter', desc: 'Visited 10+ countries', minCountries: 10 },
    { id: 'marathon', icon: '📅', label: 'Marathon', desc: '30+ travel days', minDays: 30 },
    { id: 'legendary', icon: '👑', label: 'Legendary', desc: '10+ trips planned', minTrips: 10 },
];

function getEarnedBadges(stats: { totalTrips: number; totalCountries: number; totalDays: number }) {
    return ACHIEVEMENTS.filter(a => {
        if (a.minTrips && stats.totalTrips >= a.minTrips) return true;
        if (a.minCountries && stats.totalCountries >= a.minCountries) return true;
        if (a.minDays && stats.totalDays >= a.minDays) return true;
        return false;
    });
}

// ── Trip Preview Card ──
function TripCard({ trip }: { trip: Itinerary }) {
    const COVER_IMAGES: Record<string, string> = {
        'kyoto': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&q=80',
        'tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=80',
        'paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=80',
        'bali': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&q=80',
        'london': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=80',
        'dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=80',
        'default': 'https://images.unsplash.com/photo-1506905925224-b03a108b604e?w=400&q=80',
    };
    const dest = (trip.destination || '').toLowerCase();
    const imgKey = Object.keys(COVER_IMAGES).find(k => dest.includes(k)) || 'default';

    return (
        <View style={tripCardStyles.card}>
            <Image source={{ uri: COVER_IMAGES[imgKey] }} style={tripCardStyles.image} />
            <View style={tripCardStyles.overlay} />
            <View style={tripCardStyles.content}>
                <Text style={tripCardStyles.dest} numberOfLines={1}>{trip.destination}</Text>
                <Text style={tripCardStyles.meta}>{trip.duration}d</Text>
            </View>
        </View>
    );
}

const tripCardStyles = StyleSheet.create({
    card: { width: 130, height: 100, borderRadius: 16, overflow: 'hidden', marginRight: 12, ...Shadows.sm },
    image: { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
    content: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 },
    dest: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: '#FFF' },
    meta: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
});

// ── Stat Card (gradient-like) ──
function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: string | number; label: string; color: string }) {
    return (
        <View style={[statCardStyles.card, { borderTopColor: color }]}>
            <View style={[statCardStyles.iconWrap, { backgroundColor: color + '18' }]}>{icon}</View>
            <Text style={[statCardStyles.value, { color }]}>{value}</Text>
            <Text style={statCardStyles.label}>{label}</Text>
        </View>
    );
}

const statCardStyles = StyleSheet.create({
    card: {
        flex: 1, alignItems: 'center', backgroundColor: Colors.surface,
        borderRadius: 16, padding: 14, borderTopWidth: 3, ...Shadows.sm, shadowOpacity: 0.06,
    },
    iconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    value: { fontFamily: FontFamily.bold, fontSize: 22 },
    label: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
});

// ── Achievement Badge ──
function AchievementBadge({ badge }: { badge: typeof ACHIEVEMENTS[0] }) {
    return (
        <View style={badgeStyles.badge}>
            <Text style={badgeStyles.icon}>{badge.icon}</Text>
            <Text style={badgeStyles.label}>{badge.label}</Text>
        </View>
    );
}

const badgeStyles = StyleSheet.create({
    badge: {
        alignItems: 'center', gap: 4, backgroundColor: Colors.primaryContainer,
        borderRadius: 14, padding: 12, minWidth: 80, ...Shadows.sm, shadowOpacity: 0.05,
    },
    icon: { fontSize: 24 },
    label: { fontFamily: FontFamily.semiBold, fontSize: 10, color: Colors.primary, textAlign: 'center' },
});

// ── Section Card ──
function SectionCard({ title, icon, children, rightAction }: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    rightAction?: React.ReactNode;
}) {
    return (
        <View style={sectionCardStyles.card}>
            <View style={sectionCardStyles.header}>
                <View style={sectionCardStyles.titleRow}>
                    <View style={sectionCardStyles.iconWrap}>{icon}</View>
                    <Text style={sectionCardStyles.title}>{title}</Text>
                </View>
                {rightAction}
            </View>
            <View style={sectionCardStyles.divider} />
            {children}
        </View>
    );
}

const sectionCardStyles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
        marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
        padding: Spacing.lg, ...Shadows.sm, shadowOpacity: 0.06,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconWrap: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryContainer,
        justifyContent: 'center', alignItems: 'center',
    },
    title: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.text },
    divider: { height: 1, backgroundColor: Colors.borderLight, marginBottom: 12 },
});

// ── Toggle Row ──
function ToggleRow({ label, subtitle, value, onValueChange }: {
    label: string; subtitle: string; value: boolean; onValueChange: (v: boolean) => void;
}) {
    return (
        <View style={toggleStyles.row}>
            <View style={{ flex: 1 }}>
                <Text style={toggleStyles.label}>{label}</Text>
                <Text style={toggleStyles.subtitle}>{subtitle}</Text>
            </View>
            <Switch value={value} onValueChange={onValueChange}
                trackColor={{ false: Colors.borderLight, true: Colors.primary }} thumbColor="#FFFFFF" />
        </View>
    );
}
const toggleStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
    label: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.text },
    subtitle: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
});

// ── Security Row ──
function SecurityItem({ icon, label, sub, actionLabel, onAction, danger = false, loading = false }: {
    icon: React.ReactNode; label: string; sub: string;
    actionLabel: string; onAction: () => void; danger?: boolean; loading?: boolean;
}) {
    return (
        <View style={[securityStyles.row, danger && securityStyles.dangerRow]}>
            <View style={[securityStyles.iconWrap, danger && securityStyles.dangerIcon]}>{icon}</View>
            <View style={{ flex: 1 }}>
                <Text style={[securityStyles.label, danger && { color: Colors.error }]}>{label}</Text>
                <Text style={securityStyles.sub}>{sub}</Text>
            </View>
            <TouchableOpacity
                style={[securityStyles.btn, danger && securityStyles.dangerBtn]}
                onPress={onAction} disabled={loading}
            >
                {loading
                    ? <ActivityIndicator size="small" color={danger ? Colors.error : Colors.text} />
                    : <Text style={[securityStyles.btnText, danger && { color: Colors.error }]}>{actionLabel}</Text>
                }
            </TouchableOpacity>
        </View>
    );
}
const securityStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 8 },
    dangerRow: {
        backgroundColor: 'rgba(180, 19, 64, 0.04)', borderRadius: BorderRadius.lg,
        padding: Spacing.sm, marginTop: 4,
    },
    iconWrap: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.borderLight, justifyContent: 'center', alignItems: 'center',
    },
    dangerIcon: { backgroundColor: 'rgba(180, 19, 64, 0.1)' },
    label: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.text },
    sub: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
    btn: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 8,
        ...Shadows.sm,
    },
    dangerBtn: { backgroundColor: 'rgba(180, 19, 64, 0.08)' },
    btnText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.text },
});

// ── Main Profile Screen ──────────────────────────────────────────────────────
export default function ProfileScreen() {
    const { user, signOut } = useAuth();
    const router = useRouter();

    // user.user_metadata is populated from Clerk data via AuthContext
    const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Traveler';
    const userEmail = user?.email || '';
    const avatarUrl: string | undefined = user?.user_metadata?.avatar_url;
    const memberSince = user?.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear();
    const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    const preferences = user?.user_metadata?.travelPreferences;

    const [stats, setStats] = useState({ totalTrips: 0, totalCountries: 0, totalDays: 0 });
    const [recentTrips, setRecentTrips] = useState<Itinerary[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
    const [addFriendEmail, setAddFriendEmail] = useState('');
    const [addingFriend, setAddingFriend] = useState(false);
    const [friendsLoading, setFriendsLoading] = useState(true);
    const [emailNotifs, setEmailNotifs] = useState(true);
    const [tripAlerts, setTripAlerts] = useState(true);
    const [marketingEmails, setMarketingEmails] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);

    const earnedBadges = getEarnedBadges(stats);

    const loadData = useCallback(async () => {
        try {
            const trips = await tripService.getTrips(user?.id ?? '');
            const travelStats = calculateTravelStats(trips);
            setStats({ totalTrips: travelStats.totalTrips, totalCountries: travelStats.totalCountries, totalDays: travelStats.totalDays });
            setRecentTrips(trips.slice(0, 5));
        } catch { /* unavailable */ }
        try {
            const [f, p] = await Promise.all([getFriends(), getPendingRequests()]);
            setFriends(f); setPendingRequests(p);
        } catch { /* unavailable */ } finally { setFriendsLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: async () => { setIsSigningOut(true); try { await signOut(); } finally { setIsSigningOut(false); } } },
        ]);
    };

    const handleResetPassword = async () => {
        // Password reset is managed by Clerk — direct the user to Clerk's built-in flow
        Alert.alert(
            'Reset Password',
            'Password management is handled via your account settings. Please visit your Clerk account portal or contact support.',
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert('Delete Account', 'This action is permanent and irreversible.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete Account', style: 'destructive', onPress: () => Alert.alert('Contact support to delete your account.') },
        ]);
    };

    const handleAddFriend = async () => {
        if (!addFriendEmail.trim()) return;
        setAddingFriend(true);
        try {
            await sendFriendRequest(addFriendEmail.trim());
            Alert.alert('Request Sent', `Friend request sent to ${addFriendEmail.trim()}.`);
            setAddFriendEmail('');
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Could not send friend request');
        } finally { setAddingFriend(false); }
    };

    const vibeChips = preferences?.travelStyles || preferences?.interests || [];

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Hero Cover ──────────────────────────────────── */}
                <View style={styles.cover}>
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1506905925224-b03a108b604e?q=100&w=1200&auto=format&fit=crop' }}
                        style={styles.coverImage}
                    />
                    <View style={styles.coverGradient} />
                    <SafeAreaView style={styles.coverHeader} edges={['top']}>
                        <Text style={styles.coverTitle}>My Profile</Text>
                        <TouchableOpacity style={styles.settingsBtn}>
                            <Settings size={20} color="#FFF" />
                        </TouchableOpacity>
                    </SafeAreaView>
                </View>

                {/* ── Profile Card ────────────────────────────────── */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarWrap}>
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarInitials}>{initials}</Text>
                            </View>
                        )}
                        <TouchableOpacity style={styles.editAvatarBtn}>
                            <Edit3 size={13} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userName}>{userName}</Text>
                    <View style={styles.emailRow}>
                        <Mail size={12} color={Colors.textMuted} />
                        <Text style={styles.userEmail}>{userEmail}</Text>
                    </View>
                    <View style={styles.proBadge}>
                        <Zap size={12} color={Colors.primary} />
                        <Text style={styles.proBadgeText}>Pro Plan</Text>
                    </View>
                    <Text style={styles.memberSinceText}>Traveling since {memberSince}</Text>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <StatCard icon={<MapPin size={16} color={Colors.primary} />} value={stats.totalTrips} label="Trips" color={Colors.primary} />
                        <StatCard icon={<Globe size={16} color={Colors.secondary} />} value={stats.totalCountries} label="Countries" color={Colors.secondary} />
                        <StatCard icon={<Calendar size={16} color={Colors.tertiary} />} value={stats.totalDays} label="Days" color={Colors.tertiary} />
                    </View>
                </View>

                {/* ── Achievement Badges ──────────────────────────── */}
                {earnedBadges.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionTitleRow}>
                            <Award size={18} color={Colors.primary} />
                            <Text style={styles.sectionTitle}>Achievements</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.badgesScroll}>
                            {earnedBadges.map(b => <AchievementBadge key={b.id} badge={b} />)}
                            {/* Locked badges as placeholder */}
                            {ACHIEVEMENTS.filter(a => !earnedBadges.includes(a)).slice(0, 2).map(b => (
                                <View key={b.id} style={[badgeStyles.badge, { opacity: 0.3 }]}>
                                    <Text style={badgeStyles.icon}>🔒</Text>
                                    <Text style={badgeStyles.label}>{b.label}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}
                {earnedBadges.length === 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionTitleRow}>
                            <Award size={18} color={Colors.primary} />
                            <Text style={styles.sectionTitle}>Achievements</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.badgesScroll}>
                            {ACHIEVEMENTS.slice(0, 4).map(b => (
                                <View key={b.id} style={[badgeStyles.badge, { opacity: 0.3 }]}>
                                    <Text style={badgeStyles.icon}>🔒</Text>
                                    <Text style={badgeStyles.label}>{b.label}</Text>
                                </View>
                            ))}
                        </ScrollView>
                        <Text style={styles.badgesHint}>Plan your first trip to earn badges!</Text>
                    </View>
                )}

                {/* ── Recent Trips ────────────────────────────────── */}
                {recentTrips.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionTitleRow}>
                            <MapPin size={18} color={Colors.primary} />
                            <Text style={styles.sectionTitle}>Recent Trips</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.tripsScroll}>
                            {recentTrips.map((trip, i) => <TripCard key={trip.id || i} trip={trip} />)}
                        </ScrollView>
                    </View>
                )}

                {/* ── Travel Preferences ─────────────────────────── */}
                <SectionCard
                    title="Travel Preferences"
                    icon={<Compass size={16} color={Colors.primary} />}
                    rightAction={
                        <TouchableOpacity style={styles.editChip}>
                            <Text style={styles.editChipText}>Edit</Text>
                        </TouchableOpacity>
                    }
                >
                    {vibeChips.length > 0 ? (
                        <View style={styles.chipGrid}>
                            {vibeChips.map((chip: string, i: number) => (
                                <View key={i} style={styles.prefChip}>
                                    <Text style={styles.prefChipText}>{chip}</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.chipGrid}>
                            {['Adventure', 'Culture', 'Foodie', 'Budget'].map(v => (
                                <View key={v} style={[styles.prefChip, { opacity: 0.4 }]}>
                                    <Text style={styles.prefChipText}>{v}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                    <Text style={styles.cardHint}>
                        {preferences?.budget ? `Budget: ${preferences.budget}` : 'These help us generate better itineraries.'}
                    </Text>
                </SectionCard>

                {/* ── Friends ─────────────────────────────────────── */}
                <SectionCard title="Friends" icon={<Users size={16} color={Colors.primary} />}>
                    <View style={styles.addFriendRow}>
                        <TextInput
                            style={styles.addFriendInput}
                            placeholder="Add friend by email…"
                            placeholderTextColor={Colors.textMuted}
                            value={addFriendEmail}
                            onChangeText={setAddFriendEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={[styles.addFriendBtn, addingFriend && { opacity: 0.6 }]}
                            onPress={handleAddFriend}
                            disabled={addingFriend || !addFriendEmail.trim()}
                        >
                            {addingFriend
                                ? <ActivityIndicator size="small" color="#FFF" />
                                : <UserPlus size={18} color="#FFF" />
                            }
                        </TouchableOpacity>
                    </View>

                    {pendingRequests.length > 0 && (
                        <View style={{ marginBottom: Spacing.sm }}>
                            <Text style={styles.pendingTitle}>Pending Requests</Text>
                            {pendingRequests.map(req => (
                                <View key={req.id} style={styles.friendRow}>
                                    <View style={styles.friendAvatar}>
                                        <Text style={styles.friendAvatarText}>{req.userId.name.charAt(0).toUpperCase()}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.friendName}>{req.userId.name}</Text>
                                        <Text style={styles.friendEmail}>{req.userId.email}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptFriendRequest(req.id).then(loadData)}>
                                        <Check size={14} color="#FFF" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectFriendRequest(req.id).then(() => setPendingRequests(p => p.filter(r => r.id !== req.id)))}>
                                        <X size={14} color={Colors.error} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    {friendsLoading ? (
                        <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 12 }} />
                    ) : friends.length === 0 ? (
                        <View style={styles.emptyFriends}>
                            <Users size={26} color={Colors.textMuted} />
                            <Text style={styles.emptyFriendsText}>No friends yet</Text>
                        </View>
                    ) : (
                        friends.map(friend => (
                            <View key={friend.id} style={styles.friendRow}>
                                {friend.user.avatar_url ? (
                                    <Image source={{ uri: friend.user.avatar_url }} style={styles.friendAvatarImg} />
                                ) : (
                                    <View style={styles.friendAvatar}>
                                        <Text style={styles.friendAvatarText}>{friend.user.name.charAt(0).toUpperCase()}</Text>
                                    </View>
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.friendName}>{friend.user.name}</Text>
                                    <Text style={styles.friendEmail}>{friend.user.email}</Text>
                                </View>
                                <TouchableOpacity onPress={() => Alert.alert('Remove Friend', `Remove ${friend.user.name}?`, [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Remove', style: 'destructive', onPress: () => removeFriend(friend.id).then(() => setFriends(f => f.filter(ff => ff.id !== friend.id))) },
                                ])}>
                                    <Trash2 size={16} color={Colors.textMuted} />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </SectionCard>

                {/* ── Notifications ───────────────────────────────── */}
                <SectionCard title="Notifications" icon={<Bell size={16} color={Colors.primary} />}>
                    <ToggleRow label="Email Notifications" subtitle="Trip updates and offers." value={emailNotifs} onValueChange={setEmailNotifs} />
                    <View style={styles.divider} />
                    <ToggleRow label="Trip Alerts" subtitle="Itinerary change notifications." value={tripAlerts} onValueChange={setTripAlerts} />
                    <View style={styles.divider} />
                    <ToggleRow label="Marketing Emails" subtitle="New features and promotions." value={marketingEmails} onValueChange={setMarketingEmails} />
                </SectionCard>

                {/* ── Account Security ─────────────────────────────── */}
                <SectionCard title="Account Security" icon={<Shield size={16} color={Colors.primary} />}>
                    <SecurityItem
                        icon={<LogOut size={18} color={Colors.textSecondary} />}
                        label="Sign Out" sub="Log out from this device."
                        actionLabel={isSigningOut ? 'Signing out…' : 'Sign Out'}
                        onAction={handleSignOut} loading={isSigningOut}
                    />
                    <View style={styles.divider} />
                    <SecurityItem
                        icon={<KeyRound size={18} color={Colors.textSecondary} />}
                        label="Reset Password" sub={`Send reset link to ${userEmail || 'your email'}.`}
                        actionLabel={isResettingPassword ? 'Sending…' : 'Send Link'}
                        onAction={handleResetPassword} loading={isResettingPassword}
                    />
                    <View style={styles.divider} />
                    <SecurityItem
                        icon={<Trash2 size={18} color={Colors.error} />}
                        label="Delete Account" sub="Permanently delete all your data."
                        actionLabel="Delete" onAction={handleDeleteAccount} danger
                    />
                </SectionCard>

                <Text style={styles.version}>Curatr v1.0.0</Text>
                <View style={{ height: 110 }} />
            </ScrollView>

            {/* ── Floating Plan Trip CTA ─────────────────────────── */}
            <TouchableOpacity
                style={styles.planTripFAB}
                onPress={() => router.push('/(tabs)/create' as any)}
                activeOpacity={0.9}
            >
                <MapPin size={20} color="#FFF" />
                <Text style={styles.planTripFABText}>Plan New Trip</Text>
            </TouchableOpacity>
        </View>
    );
}

// ── Styles ──
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scroll: { paddingBottom: 180 },

    // Cover
    cover: { width: '100%', height: 280, position: 'relative' },
    coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    coverGradient: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.42)',
    },
    coverHeader: {
        position: 'absolute', top: 0, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.lg, paddingTop: 10,
    },
    coverTitle: {
        fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: '#FFF',
        textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
    },
    settingsBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
    },

    // Profile card
    profileCard: {
        backgroundColor: Colors.surface, borderRadius: 24,
        marginHorizontal: Spacing.lg, marginTop: -60, padding: Spacing.lg,
        alignItems: 'center', ...Shadows.md, marginBottom: Spacing.lg,
    },
    avatarWrap: { position: 'relative', marginTop: -48, marginBottom: Spacing.md },
    avatarImg: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: Colors.surface },
    avatarPlaceholder: {
        width: 96, height: 96, borderRadius: 48,
        backgroundColor: Colors.primaryContainer, justifyContent: 'center', alignItems: 'center',
        borderWidth: 4, borderColor: Colors.surface,
    },
    avatarInitials: { fontFamily: FontFamily.bold, fontSize: 32, color: Colors.primary },
    editAvatarBtn: {
        position: 'absolute', bottom: 0, right: 0,
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: Colors.surface,
    },
    userName: { fontFamily: FontFamily.bold, fontSize: 22, color: Colors.text, marginBottom: 4 },
    emailRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
    userEmail: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textMuted },
    proBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: Colors.primaryContainer, paddingHorizontal: 12, paddingVertical: 5,
        borderRadius: 20, marginBottom: 6,
    },
    proBadgeText: { fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.primary },
    memberSinceText: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.md },
    statsRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },

    // Sections
    section: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.text },

    // Badges
    badgesScroll: { gap: 10, paddingBottom: 2 },
    badgesHint: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 8 },

    // Trips
    tripsScroll: { paddingBottom: 4 },

    // Preferences
    editChip: {
        backgroundColor: Colors.primaryContainer, borderRadius: BorderRadius.md,
        paddingHorizontal: 12, paddingVertical: 5,
    },
    editChipText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.primary },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    prefChip: {
        backgroundColor: Colors.primaryContainer, borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 7,
    },
    prefChipText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.primary },
    cardHint: {
        fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textMuted,
        marginTop: 4, lineHeight: 18,
    },

    // Friends
    addFriendRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    addFriendInput: {
        flex: 1, backgroundColor: Colors.background, borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md, fontFamily: FontFamily.medium,
        fontSize: FontSize.sm, color: Colors.text, height: 44,
    },
    addFriendBtn: {
        width: 44, height: 44, borderRadius: BorderRadius.lg,
        backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    },
    pendingTitle: {
        fontFamily: FontFamily.semiBold, fontSize: FontSize.sm,
        color: Colors.textSecondary, marginBottom: Spacing.sm,
    },
    friendRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    friendAvatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.primaryContainer, justifyContent: 'center', alignItems: 'center',
    },
    friendAvatarImg: { width: 40, height: 40, borderRadius: 20 },
    friendAvatarText: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.primary },
    friendName: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.text },
    friendEmail: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textMuted },
    acceptBtn: {
        width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.primary,
        justifyContent: 'center', alignItems: 'center',
    },
    rejectBtn: {
        width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(180, 19, 64, 0.1)',
        justifyContent: 'center', alignItems: 'center',
    },
    emptyFriends: { alignItems: 'center', gap: 8, paddingVertical: Spacing.lg },
    emptyFriendsText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textMuted },

    // Divider
    divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 4 },

    // Version
    version: {
        fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.textMuted,
        textAlign: 'center', marginBottom: Spacing.xl,
    },

    // FAB
    planTripFAB: {
        position: 'absolute', bottom: 100, alignSelf: 'center',
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: Colors.primary, paddingHorizontal: 28, paddingVertical: 16,
        borderRadius: 32, ...Shadows.lg,
    },
    planTripFABText: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: '#FFF' },
});
