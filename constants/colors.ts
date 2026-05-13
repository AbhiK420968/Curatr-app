// Design System Colors — "Ember Glass" Theme
export const Colors = {
    // Primary (Charcoal)
    primary: '#5c5b5b',
    primaryDark: '#454444',
    primaryLight: '#edeaea',
    onPrimary: '#f5f2f1',
    primaryContainer: '#edeaea',
    onPrimaryContainer: '#575756',

    // Secondary (Warm Peach/Orange)
    secondary: '#a4351c',
    secondaryContainer: '#ffc4b7',
    secondaryDim: '#942911',
    onSecondary: '#ffefec',

    // Tertiary
    tertiary: '#864c3c',
    tertiaryContainer: '#fdb19c',

    // Backgrounds & Surfaces (Physical Stack)
    background: '#f5f6f7',
    surface: '#f5f6f7', 
    surfaceElevated: '#ffffff', // surface_container_lowest
    surfaceContainerLow: '#eff1f2',
    surfaceContainerHighest: '#dadddf',
    card: '#ffffff', // surface_container_lowest

    // Text
    text: '#2c2f30', // on_surface
    textSecondary: '#595c5d', // on_surface_variant
    textMuted: '#9b9d9e', // inverse_on_surface (used for muted)
    textInverse: '#ffffff', // inverse_primary

    // Borders & Dividers
    border: '#e6e8ea', // surface_container
    borderLight: 'rgba(255, 255, 255, 0.4)', 
    outline: '#757778',
    outlineVariant: 'rgba(171, 173, 174, 0.15)', // "Ghost Border" (15% opacity outline_variant)

    // Status
    success: '#22C55E', // keeping utility color
    warning: '#F59E0B', // keeping utility color
    error: '#b41340',

    // Overlays & Glass
    overlay: 'rgba(12, 15, 16, 0.5)', // inverse_surface at 50%
    overlayLight: 'rgba(12, 15, 16, 0.3)',
    glassBackground: 'rgba(255, 255, 255, 0.6)', // 60% opacity per spec
    glassBackgroundLight: 'rgba(255, 255, 255, 0.4)', 

    // Tab bar
    tabBarBackground: 'rgba(255, 255, 255, 0.8)',
    tabBarActive: '#a4351c', // secondary
    tabBarInactive: '#9b9d9e', 

    // Gradients
    gradientStart: '#a4351c', // secondary
    gradientEnd: '#fdb19c', // tertiary_container

    // Card shadows
    shadow: '#2c2f30', // on_surface for ambient shadows
} as const;

export type ColorName = keyof typeof Colors;

