/** UC-AN-04 — normalize UTM / platform campaign ids onto LeadEntity columns */
export interface LeadAttributionInput {
  utm?: Record<string, string>;
  channelMeta?: Record<string, unknown> | null;
  campaignId?: string;
}

export interface LeadAttributionFields {
  utmCampaign: string | null;
  campaignId: string | null;
}

function readCampaignIdFromMeta(meta?: Record<string, unknown> | null): string | null {
  if (!meta) return null;
  const raw = meta.campaignId ?? meta.campaign_id;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return null;
}

export function resolveLeadAttribution(input: LeadAttributionInput): LeadAttributionFields {
  const utmCampaignRaw = input.utm?.utm_campaign?.trim();
  const metaCampaignId = readCampaignIdFromMeta(input.channelMeta);
  const explicitCampaignId = input.campaignId?.trim() || metaCampaignId;

  const utmCampaign = utmCampaignRaw || explicitCampaignId || null;
  const campaignId = explicitCampaignId || utmCampaignRaw || null;

  return { utmCampaign, campaignId };
}
