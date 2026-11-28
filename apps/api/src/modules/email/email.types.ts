export const EMAIL_TEMPLATES = {
  SIGN_LINK: 'email_esign_link_v1',
  OTP: 'email_esign_otp_v1',
  CHANNEL_VERIFY: 'email_channel_verify_v1',
  COMPLETION: 'email_esign_completion_v1',
} as const;

export const EMAIL_TEMPLATE_COPY: Record<string, string> = {
  email_esign_link_v1: 'Open the signing page from the registered channel. This message does not include the verification code.',
  email_esign_otp_v1: 'Signing OTP: {{otp}}',
  email_channel_verify_v1: 'Channel verification code: {{otp}}',
  email_esign_completion_v1: 'Hello {{buyer_name}}. The signed contract is complete. This message does not include a download link, signing token, or verification code.',
};

export type EmailTemplateId = (typeof EMAIL_TEMPLATES)[keyof typeof EMAIL_TEMPLATES];

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export type EmailSendInput = {
  to: string;
  templateId: string;
  params: Record<string, unknown>;
  trackingId: string;
};

export type EmailSendResult = { providerRef: string };

export interface EmailSender {
  send(input: EmailSendInput): Promise<EmailSendResult>;
}
