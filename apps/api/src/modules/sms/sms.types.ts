export const SMS_TEMPLATES = {
  OTP: 'sms_otp_v1',
  BOOKING_CONFIRM: 'sms_booking_confirm_v1',
  TRANSACTION_NOTIFY: 'sms_txn_notify_v1',
} as const;

export type SmsTemplateId = (typeof SMS_TEMPLATES)[keyof typeof SMS_TEMPLATES];

export type SmsGraphMode = 'SANDBOX' | 'LIVE' | 'UNCONFIGURED';

export interface SmsSendInput {
  templateId: string;
  phone: string;
  params?: Record<string, unknown>;
  source?: { type: 'MANUAL' | 'PAYMENT_OTP' | 'PAYMENT_SUCCESS' | 'ESIGN_OTP'; id: string };
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
