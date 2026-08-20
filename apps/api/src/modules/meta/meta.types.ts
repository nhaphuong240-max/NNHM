export interface MetaFieldData {
  name: string;
  values: string[];
}

export interface MetaLeadgenValue {
  leadgen_id: string;
  page_id: string;
  form_id?: string;
  ad_id?: string;
  adgroup_id?: string;
  campaign_id?: string;
  created_time?: number;
  field_data?: MetaFieldData[];
}

export interface MetaWebhookChange {
  field: string;
  value: MetaLeadgenValue;
}

export interface MetaWebhookEntry {
  id: string;
  time: number;
  changes: MetaWebhookChange[];
}

export interface MetaWebhookPayload {
  object: string;
  entry: MetaWebhookEntry[];
}

export interface MetaLeadChannelMeta {
  channel: 'META';
  leadgenId: string;
  pageId: string;
  formId?: string;
  adId?: string;
  adgroupId?: string;
  campaignId?: string;
  createdTime?: number;
}
