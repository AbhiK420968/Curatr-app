export { Colors, type ColorName } from './colors';
export { FontFamily, FontSize, LineHeight } from './typography';
export { Spacing, BorderRadius, IconSize, HitSlop, Shadows } from './spacing';

// API Configuration
// Platform-aware base URL so the same code works in web browser, iOS simulator, and Android emulator
const getApiBaseUrl = () => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        // Web browser — use localhost directly
        return 'http://localhost:5000/api';
    }
    if (__DEV__) {
        // Native dev: 10.0.2.2 is the Android emulator's alias for host machine localhost
        // For iOS simulator, localhost works directly — but 10.0.2.2 won't hurt iOS
        return 'http://10.0.2.2:5000/api';
    }
    return 'https://your-production-backend.com/api';
};

export const API_BASE_URL = getApiBaseUrl();
