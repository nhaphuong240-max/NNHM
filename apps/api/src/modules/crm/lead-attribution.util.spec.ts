import { resolveLeadAttribution } from './lead-attribution.util';

describe('resolveLeadAttribution', () => {
  it('maps utm_campaign from public form UTM', () => {
    expect(
      resolveLeadAttribution({
        utm: { utm_source: 'google', utm_campaign: 'q7_launch' },
      }),
    ).toEqual({ utmCampaign: 'q7_launch', campaignId: 'q7_launch' });
  });

  it('prefers Meta campaign_id in channelMeta', () => {
    expect(
      resolveLeadAttribution({
        utm: { utm_campaign: 'camp_july' },
        channelMeta: { campaignId: 'camp_meta_123' },
      }),
    ).toEqual({ utmCampaign: 'camp_july', campaignId: 'camp_meta_123' });
  });

  it('falls back to Zalo OA id as utm_campaign', () => {
    expect(
      resolveLeadAttribution({
        utm: { utm_source: 'zalo', utm_campaign: 'oa_sunrise_dev' },
      }),
    ).toEqual({ utmCampaign: 'oa_sunrise_dev', campaignId: 'oa_sunrise_dev' });
  });
});
