export type MetaGraphLeadField = {
  name: string;
  values: string[];
};

export type MetaGraphLeadResponse = {
  id?: string;
  created_time?: string;
  field_data?: MetaGraphLeadField[];
  ad_id?: string;
  adgroup_id?: string;
  campaign_id?: string;
  form_id?: string;
  page_id?: string;
  error?: { message?: string; type?: string; code?: number };
};
