import type { ExpoConfig } from 'expo/config';

/**
 * Dynamic Expo config — EAS Build preview (G2.4).
 * `eas init` adds `extra.eas.projectId` after linking expo.dev project.
 */
const config: ExpoConfig = {
  name: 'WEREAL Agent',
  slug: 'wereal-agent',
  version: '0.2.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'wereal',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'vn.wereal.agent',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'WEREAL ghi nhận vị trí khi agent log hoạt động hiện trường (UC-UX-01).',
    },
  },
  android: {
    package: 'vn.wereal.agent',
    adaptiveIcon: {
      backgroundColor: '#0F4C81',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
    ...(process.env.EAS_PROJECT_ID
      ? { eas: { projectId: process.env.EAS_PROJECT_ID } }
      : {}),
  },
  plugins: [
    'expo-secure-store',
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#0F4C81',
      },
    ],
  ],
};

export default config;
