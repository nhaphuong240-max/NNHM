export const brand = {
  primary: '#0F4C81',
  primaryDark: '#0A3558',
  background: '#F4F7FB',
  surface: '#FFFFFF',
  border: '#D8E2EE',
  muted: '#64748B',
  success: '#059669',
  warning: '#D97706',
  destructive: '#DC2626',
};

export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
  tenantId: process.env.EXPO_PUBLIC_TENANT_ID ?? 'ten_dev_01',
};
