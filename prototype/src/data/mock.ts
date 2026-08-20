export interface Unit {
  id: string;
  code: string;
  project: string;
  block: string;
  floor: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  direction: string;
  price: number;
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD';
  verified: boolean;
  description: string;
  highlights: string[];
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  score: number;
  tier: 'HOT' | 'WARM' | 'COLD';
  source: string;
  unitCode: string;
  project: string;
  stage: string;
  assignedTo: string;
  minutesAgo: number;
  contacted: boolean;
}

export interface Listing {
  id: string;
  unitCode: string;
  title: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';
  agent: string;
  antiDrift: 'PASS' | 'FLAG' | 'BLOCK';
  verified: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  type: 'DEVELOPER' | 'AGENCY';
  status: 'ACTIVE' | 'PENDING_SETUP';
  users: number;
}

export const projects = [
  { name: 'Vinhomes Grand Park', district: 'Q9', units: 1200 },
  { name: 'Masteri Thảo Điền', district: 'Q2', units: 450 },
  { name: 'Lumiere Riverside', district: 'Q2', units: 800 },
  { name: 'EcoPark Hà Nội', district: 'Long Biên', units: 2000 },
];

export const units: Unit[] = [
  {
    id: 'un_01',
    code: 'A-12-05',
    project: 'Vinhomes Grand Park',
    block: 'Block A',
    floor: 12,
    area: 85.5,
    bedrooms: 3,
    bathrooms: 2,
    direction: 'Đông Nam',
    price: 3_500_000_000,
    status: 'AVAILABLE',
    verified: true,
    description: 'Căn hộ 3 phòng ngủ view sông, nội thất cao cấp, gần metro Bến Thành — Suối Tiên.',
    highlights: ['View sông', 'Gần metro', 'Nội thất cao cấp'],
  },
  {
    id: 'un_02',
    code: 'B-08-12',
    project: 'Vinhomes Grand Park',
    block: 'Block B',
    floor: 8,
    area: 82,
    bedrooms: 3,
    bathrooms: 2,
    direction: 'Tây Nam',
    price: 3_200_000_000,
    status: 'AVAILABLE',
    verified: true,
    description: 'Căn góc 3PN thoáng mát, view công viên nội khu.',
    highlights: ['Căn góc', 'View công viên'],
  },
  {
    id: 'un_03',
    code: 'C-15-03',
    project: 'Masteri Thảo Điền',
    block: 'Tower C',
    floor: 15,
    area: 72,
    bedrooms: 2,
    bathrooms: 2,
    direction: 'Đông',
    price: 4_800_000_000,
    status: 'RESERVED',
    verified: true,
    description: 'Căn 2PN premium Thảo Điền, full nội thất.',
    highlights: ['Premium', 'Full nội thất'],
  },
  {
    id: 'un_04',
    code: 'D-05-08',
    project: 'Lumiere Riverside',
    block: 'Block D',
    floor: 5,
    area: 95,
    bedrooms: 3,
    bathrooms: 2,
    direction: 'Nam',
    price: 5_200_000_000,
    status: 'AVAILABLE',
    verified: true,
    description: 'Căn hộ ven sông Sài Gòn, tiện ích resort.',
    highlights: ['View sông', 'Resort amenities'],
  },
];

export const leads: Lead[] = [
  {
    id: 'ld_01',
    name: 'Nguyễn Thu Trang',
    phone: '+84901234567',
    email: 'trang@gmail.com',
    score: 85,
    tier: 'HOT',
    source: 'Public form / Google Ads',
    unitCode: 'A-12-05',
    project: 'Vinhomes Grand Park',
    stage: 'QUALIFIED',
    assignedTo: 'Hoàng Nam',
    minutesAgo: 5,
    contacted: false,
  },
  {
    id: 'ld_02',
    name: 'Nguyễn Văn A',
    phone: '+84987654321',
    email: 'nguyenvana@email.com',
    score: 45,
    tier: 'COLD',
    source: 'Walk-in',
    unitCode: 'B-08-12',
    project: 'Vinhomes Grand Park',
    stage: 'NEW',
    assignedTo: 'Hoàng Nam',
    minutesAgo: 120,
    contacted: true,
  },
  {
    id: 'ld_03',
    name: 'Trần Minh',
    phone: '+84911223344',
    email: 'minh.tran@email.com',
    score: 82,
    tier: 'HOT',
    source: 'Zalo OA',
    unitCode: 'B-08-12',
    project: 'Vinhomes Grand Park',
    stage: 'CONTACTED',
    assignedTo: 'Lan Hương',
    minutesAgo: 12,
    contacted: true,
  },
  {
    id: 'ld_04',
    name: 'Lê Hùng',
    phone: '+84955667788',
    email: 'lehung@email.com',
    score: 90,
    tier: 'HOT',
    source: 'Referral',
    unitCode: 'D-05-08',
    project: 'Lumiere Riverside',
    stage: 'BOOKING',
    assignedTo: 'Hoàng Nam',
    minutesAgo: 30,
    contacted: true,
  },
];

export const listings: Listing[] = [
  {
    id: 'ls_042',
    unitCode: 'A-12-05',
    title: 'Căn 3PN view sông Block A',
    status: 'PENDING_REVIEW',
    agent: 'Hoàng Nam',
    antiDrift: 'PASS',
    verified: true,
  },
  {
    id: 'ls_043',
    unitCode: 'B-08-12',
    title: 'Căn 3PN view công viên',
    status: 'PENDING_REVIEW',
    agent: 'Hoàng Nam',
    antiDrift: 'FLAG',
    verified: false,
  },
  {
    id: 'ls_040',
    unitCode: 'D-05-08',
    title: 'Căn premium ven sông',
    status: 'PUBLISHED',
    agent: 'Lan Hương',
    antiDrift: 'PASS',
    verified: true,
  },
];

export const tenants: Tenant[] = [
  { id: 'ten_01', name: 'Dev Pilot Vinhomes', type: 'DEVELOPER', status: 'ACTIVE', users: 12 },
  { id: 'ten_02', name: 'Agency ABC', type: 'AGENCY', status: 'ACTIVE', users: 28 },
  { id: 'ten_03', name: 'Agency XYZ', type: 'AGENCY', status: 'PENDING_SETUP', users: 3 },
];

export const auditLogs = [
  {
    id: 'aud_01',
    event: 'UNIT_PRICE_CHANGED',
    entity: 'un_01',
    actor: 'usr_dev',
    detail: '3.5 tỷ → 3.6 tỷ',
    time: '28/07 10:00',
  },
  {
    id: 'aud_02',
    event: 'LISTING_APPROVED',
    entity: 'ls_040',
    actor: 'usr_ops',
    detail: 'Published to search index',
    time: '28/07 09:30',
  },
  {
    id: 'aud_03',
    event: 'BOOKING_CREATED',
    entity: 'bk_018',
    actor: 'usr_agent',
    detail: 'RESERVED A-12-05',
    time: '28/07 08:15',
  },
];

export const pipelineStages = [
  { code: 'NEW', label: 'Mới', count: 12, leads: ['Thu Trang', 'Văn B'] },
  { code: 'QUALIFIED', label: 'Qualified', count: 8, leads: ['Minh', 'Hoa'] },
  { code: 'CONTACTED', label: 'Đã liên hệ', count: 5, leads: ['Trần Minh'] },
  { code: 'BOOKING', label: 'Booking', count: 3, leads: ['Lê Hùng'] },
];

export function formatPrice(vnd: number): string {
  if (vnd >= 1_000_000_000) {
    return `${(vnd / 1_000_000_000).toFixed(1).replace('.0', '')} tỷ`;
  }
  return new Intl.NumberFormat('vi-VN').format(vnd) + ' ₫';
}

export function formatFullPrice(vnd: number): string {
  return new Intl.NumberFormat('vi-VN').format(vnd) + ' VND';
}
