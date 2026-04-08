// Design System Typography — Curatr Design Guide
// Using Inter font family

export const FontFamily = {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
} as const;

export const FontSize = {
    xs: 11,
    sm: 13,    // Caption
    base: 15,  // Body
    lg: 17,    // Subheading
    xl: 20,
    '2xl': 24, // Heading
    '3xl': 28,
    '4xl': 34, // Large title
    '5xl': 42, // Hero
} as const;

export const LineHeight = {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
} as const;
