export interface ZaloWebhookSender {
  id: string;
}

export interface ZaloWebhookRecipient {
  id: string;
}

export interface ZaloWebhookMessage {
  text?: string;
  msg_id?: string;
}

export interface ZaloWebhookPayload {
  app_id?: string;
  event_name?: string;
  timestamp?: string;
  sender?: ZaloWebhookSender;
  recipient?: ZaloWebhookRecipient;
  message?: ZaloWebhookMessage;
  oa_id?: string;
}

export interface ZaloLeadChannelMeta {
  channel: 'ZALO';
  msgId: string;
  oaId: string;
  senderId: string;
  eventName: string;
  appId?: string;
  rawText?: string;
}

export const ZALO_LEAD_EVENTS = ['user_send_text', 'user_submit_info'] as const;

export type ZaloLeadEventName = (typeof ZALO_LEAD_EVENTS)[number];

export const ZALO_ZNS_TEMPLATES = {
  LEAD_ACK: 'zns_lead_ack_v1',
  BOOKING_CONFIRM: 'zns_booking_confirm_v1',
  OTP: 'zns_otp_v1',
} as const;
