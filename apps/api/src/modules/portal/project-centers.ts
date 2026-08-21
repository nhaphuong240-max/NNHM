/** Geo centers for public map pins — keyed by project id */
export const PROJECT_CENTERS: Record<string, { lat: number; lng: number; label: string }> = {
  prj_sunrise: { lat: 21.0285, lng: 105.8042, label: 'Sunrise Tower A · Hà Nội' },
  prj_mkp_hcm: { lat: 10.7871, lng: 106.7498, label: 'Saigon Pearl · Quận 2, TP.HCM' },
  prj_mkp_dn: { lat: 16.0544, lng: 108.2022, label: 'Danang Bay · Hải Châu, Đà Nẵng' },
  default: { lat: 21.0285, lng: 105.8042, label: 'Ngôi Nhà Hôm Nay · Việt Nam' },
};

export function mapCenterForProject(projectId?: string | null) {
  return PROJECT_CENTERS[projectId ?? 'default'] ?? PROJECT_CENTERS.default;
}
