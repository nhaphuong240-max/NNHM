import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'WEREAL Buyer',
  slug: 'wereal-buyer',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  scheme: 'wereal-buyer',
  ios: {
    bundleIdentifier: 'vn.wereal.buyer',
  },
  android: {
    package: 'vn.wereal.buyer',
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
    tenantId: process.env.EXPO_PUBLIC_TENANT_ID ?? 'ten_dev_01',
  },
  plugins: ['expo-secure-store', 'expo-notifications'],
};

export default config;
