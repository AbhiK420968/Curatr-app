// Using Plus Jakarta Sans font family

export const FontFamily = {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semiBold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
    extraBold: 'PlusJakartaSans_800ExtraBold',
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
