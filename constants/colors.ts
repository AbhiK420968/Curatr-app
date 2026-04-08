// Design System Colors — Antigravity "Personal Interests Selection" Theme (Green/Light)
export const Colors = {
    // Primary (Deep Green from Stitch Project)
    primary: '#266829', // or #1B5E20 from Home Screen
    primaryDark: '#185c1e',
    primaryLight: '#b2faa9',
    onPrimary: '#FFFFFF',
    primaryContainer: '#b2faa9',
    onPrimaryContainer: '#1f6223',

    // Secondary
    secondary: '#416441',
    secondaryContainer: '#c5edc1',

    // Backgrounds & Surfaces
    background: '#F5F5F5',
    surface: '#F6F6F6', 
    surfaceElevated: '#FFFFFF',
    surfaceContainerLow: '#f0f1f1',
    surfaceContainerHighest: '#dbdddd',
    card: '#FFFFFF',

    // Text
    text: '#2d2f2f', // on-surface
    textSecondary: '#5a5c5c', // on-surface-variant
    textMuted: '#767777', // outline
    textInverse: '#FFFFFF',

    // Borders & Dividers
    border: '#E5E7EB',
    borderLight: 'rgba(255, 255, 255, 0.4)', // Used for glass cards
    outline: '#767777',

    // Status
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#b02500',

    // Overlays & Glass
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
    glassBackground: 'rgba(255, 255, 255, 0.7)', // Default glass
    glassBackgroundLight: 'rgba(255, 255, 255, 0.4)', // Light glass

    // Tab bar
    tabBarBackground: 'rgba(255, 255, 255, 0.7)',
    tabBarActive: '#266829', 
    tabBarInactive: '#9CA3AF',

    // Gradients
    gradientStart: 'rgba(0, 0, 0, 0)',
    gradientEnd: 'rgba(0, 0, 0, 0.7)',

    // Card shadows
    shadow: '#000000',
} as const;

export type ColorName = keyof typeof Colors;

