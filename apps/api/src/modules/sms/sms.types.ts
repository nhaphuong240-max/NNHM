export const SMS_TEMPLATES = {
  OTP: 'sms_otp_v1',
  SIGN_LINK: 'sms_esign_link_v1',
  BOOKING_CONFIRM: 'sms_booking_confirm_v1',
  TRANSACTION_NOTIFY: 'sms_txn_notify_v1',
} as const;

/** Sign-link copy must not include an OTP. OTP stays on sms_otp_v1. */
export const SMS_TEMPLATE_COPY: Record<string, string> = {
  sms_otp_v1: 'Ma OTP ky hop dong: {{otp}}',
  sms_esign_link_v1: 'Mo link ky hop dong WEREAL. Khong chia se link nay.',
  sms_booking_confirm_v1: 'Dat cho thanh cong.',
  sms_txn_notify_v1: 'Thong bao giao dich.',
};

export type SmsTemplateId = (typeof SMS_TEMPLATES)[keyof typeof SMS_TEMPLATES];

export type SmsGraphMode = 'SANDBOX' | 'LIVE' | 'UNCONFIGURED';

export interface SmsSendInput {
  templateId: string;
  phone: string;
  params?: Record<string, unknown>;
  persistOtp?: boolean;
  maskStoredDest?: boolean;
  source?: { type: 'MANUAL' | 'PAYMENT_OTP' | 'PAYMENT_SUCCESS' | 'ESIGN_OTP' | 'ESIGN_LINK'; id: string };
}

export interface SmsSendResult {
  deliveryId: string;
  status: string;
  providerRef?: string | null;
  sandbox: boolean;
  graphMode: SmsGraphMode;
  idempotentReplay?: boolean;
  otp?: string;
}
