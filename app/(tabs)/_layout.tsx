import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Tabs, usePathname } from 'expo-router';
import { View, StyleSheet, Platform, TouchableOpacity, Animated, Easing } from 'react-native';
import { Home, Compass, PlusCircle, User, Receipt, ChevronRight } from 'lucide-react-native';
import { Colors, FontFamily, FontSize, Shadows } from '@/constants';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const TABS = [
    { name: 'index', icon: Home, title: 'Home' },
    { name: 'create', icon: PlusCircle, title: 'Create' },
    { name: 'explore', icon: Compass, title: 'Explore' },
    { name: 'splitwise', icon: Receipt, title: 'Splitwise' },
    { name: 'profile', icon: User, title: 'Profile' },
];

const COLLAPSED_SIZE = 56;
const EXPANDED_HEIGHT = 56;
const ICON_SIZE = 22;

function NeumorphicTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const [expanded, setExpanded] = useState(true);
    const expandAnim = useRef(new Animated.Value(1)).current;
    const iconOpacity = useRef(new Animated.Value(1)).current;
    const autoCollapseTimer = useRef<NodeJS.Timeout | null>(null);

    const expand = useCallback(() => {
        if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current);
        setExpanded(true);
        Animated.parallel([
            Animated.spring(expandAnim, {
                toValue: 1,
                friction: 8,
                tension: 65,
                useNativeDriver: false,
            }),
            Animated.timing(iconOpacity, {
                toValue: 1,
                duration: 250,
                delay: 100,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto-collapse after 4 seconds of inactivity
        autoCollapseTimer.current = setTimeout(() => collapse(), 4000);
    }, []);

    const collapse = useCallback(() => {
        setExpanded(false);
        Animated.parallel([
            Animated.spring(expandAnim, {
                toValue: 0,
                friction: 8,
                tension: 65,
                useNativeDriver: false,
            }),
            Animated.timing(iconOpacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const toggle = useCallback(() => {
        if (expanded) {
            collapse();
        } else {
            expand();
        }
    }, [expanded, expand, collapse]);

    // Reset auto-collapse on tab press
    const handleTabPress = useCallback((routeName: string, index: number) => {
        if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current);
        autoCollapseTimer.current = setTimeout(() => collapse(), 4000);

        const event = navigation.emit({
            type: 'tabPress',
            target: state.routes[index].key,
            canPreventDefault: true,
        });
        if (!event.defaultPrevented) {
            navigation.navigate(routeName);
        }
    }, [navigation, state, collapse]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current);
        };
    }, []);

    // Interpolations
    const containerWidth = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [COLLAPSED_SIZE, 360],
    });
    const containerBorderRadius = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [COLLAPSED_SIZE / 2, 28],
    });
    const arrowRotation = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    return (
        <View style={styles.tabBarOuter} pointerEvents="box-none">
            <Animated.View style={[
                styles.neuContainer,
                {
                    width: containerWidth,
                    borderRadius: containerBorderRadius,
                    height: EXPANDED_HEIGHT,
                },
            ]}>
                {/* Expanded: tab icons */}
                <Animated.View style={[styles.iconsRow, { opacity: iconOpacity }]} pointerEvents={expanded ? 'auto' : 'none'}>
                    {TABS.map((tab, index) => {
                        const isFocused = state.index === index;
                        const Icon = tab.icon;
                        return (
                            <TouchableOpacity
                                key={tab.name}
                                style={[styles.tabButton, isFocused && styles.tabButtonActive]}
                                onPress={() => handleTabPress(tab.name, index)}
                                activeOpacity={0.7}
                            >
                                <Icon
                                    size={ICON_SIZE}
                                    color={isFocused ? Colors.primary : '#888888'}
                                    strokeWidth={isFocused ? 2.5 : 1.8}
                                />
                            </TouchableOpacity>
                        );
                    })}
                </Animated.View>

                {/* Toggle button (always visible, overlaps when collapsed) */}
                <TouchableOpacity
                    style={[styles.toggleBtn, expanded && styles.toggleBtnExpanded]}
                    onPress={toggle}
                    activeOpacity={0.8}
                >
                    <Animated.View style={{ transform: [{ rotate: arrowRotation }] }}>
                        <ChevronRight size={18} color="#666666" strokeWidth={2.5} />
                    </Animated.View>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{ headerShown: false }}
            tabBar={(props) => <NeumorphicTabBar {...props} />}
        >
            <Tabs.Screen name="index" options={{ title: 'Home' }} />
            <Tabs.Screen name="create" options={{ title: 'Create' }} />
            <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
            <Tabs.Screen name="splitwise" options={{ title: 'Splitwise' }} />
            <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBarOuter: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 32 : 18,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    neuContainer: {
        backgroundColor: '#EEEEEE',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        // Neumorphic shadows
        shadowColor: '#d1d1d1',
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 10,
    },
    iconsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        flex: 1,
        paddingLeft: 8,
        paddingRight: 44, // Ensures icons don't overlap the toggle button
    },
    tabButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabButtonActive: {
        backgroundColor: 'rgba(39, 169, 130, 0.12)',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    toggleBtn: {
        position: 'absolute',
        right: 0,
        width: COLLAPSED_SIZE,
        height: COLLAPSED_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toggleBtnExpanded: {
        width: 36,
        height: 36,
        borderRadius: 18,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.04)',
    },
});
