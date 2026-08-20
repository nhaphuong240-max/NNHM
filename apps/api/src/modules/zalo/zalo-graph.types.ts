export interface ZaloOAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: string | number;
  error?: number;
  error_name?: string;
  error_reason?: string;
  message?: string;
}

export interface ZaloZnsSendResponse {
  error: number;
  message: string;
  data?: {
    msg_id?: string;
    sent_time?: string;
    quota?: Record<string, unknown>;
  };
}

export interface ZaloZnsSendInput {
  phone: string;
  templateId: string;
  templateData: Record<string, unknown>;
  trackingId: string;
  accessToken: string;
}

export interface ZaloOaProfileResponse {
  error: number;
  message: string;
  data?: {
    oa_id?: string;
    name?: string;
    is_verified?: boolean;
  };
}

/** Zalo ZNS expects `84xxxxxxxxx` without `+`. */
export function formatPhoneForZaloApi(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith('84')) return digits;
  if (digits.startsWith('0')) return `84${digits.slice(1)}`;
  return `84${digits}`;
}

export function buildZnsTemplateData(
  templateId: string,
  params: Record<string, unknown>,
): Record<string, unknown> {
  if (Object.keys(params).length > 0) return params;

  if (templateId.includes('otp')) {
    return { otp: '000000' };
  }
  if (templateId.includes('booking')) {
    return { customer_name: 'Khách hàng', unit_code: 'A-01-05', amount: '100.000.000' };
  }
  return { customer_name: 'Khách hàng', project_name: 'Sunrise Tower' };
}
