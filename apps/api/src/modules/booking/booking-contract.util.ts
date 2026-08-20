import type { ContractMergeContext, ContractTemplateRecord } from './booking-contract.types';

export const CONTRACT_TEMPLATES: ContractTemplateRecord[] = [
  {
    id: 'tpl_deposit_agreement',
    label: 'Hợp đồng đặt cọc',
    description: 'UC-BK-06 · Giữ chỗ căn + số tiền cọc · booking RESERVED/DEPOSITED',
    category: 'DEPOSIT',
    version: '2026.07',
  },
  {
    id: 'tpl_sale_agreement',
    label: 'Hợp đồng mua bán căn hộ',
    description: 'Khung HĐMB căn hộ chung cư — merge giá GR + buyer',
    category: 'SALE',
    version: '2026.07',
  },
  {
    id: 'tpl_agency_authorization',
    label: 'Giấy ủy quyền giao dịch',
    description: 'Buyer ủy quyền agency thực hiện thủ tục',
    category: 'AUTHORIZATION',
    version: '2026.07',
  },
];

const TEMPLATE_BODIES: Record<string, string> = {
  tpl_deposit_agreement: `HỢP ĐỒNG ĐẶT CỌC GIỮ CHỖ CĂN HỘ

Dự án: {{projectName}}
Mã căn (Golden Record): {{unitCode}}
Diện tích: {{unitArea}} m²
Giá niêm yết GR: {{basePrice}} VND
Số tiền cọc: {{depositAmount}} VND
Mã booking: {{bookingId}}

BÊN MUA (Bên A): {{buyerName}} · ĐT {{buyerPhone}}{{buyerEmailLine}}
Đại diện bán hàng: {{agentLabel}}
Ngày lập: {{contractDate}}

Điều 1. Bên A đồng ý đặt cọc giữ chỗ căn hộ nêu trên theo bảng hàng chính thức của Chủ đầu tư.
Điều 2. Số tiền cọc được thanh toán qua cổng WEREAL; trạng thái booking được khóa Redis chống double-book.
Điều 3. Hợp đồng này là bản DRAFT phục vụ UC-BK-06; ký điện tử thực hiện tại UC-BK-07.

[DRAFT — chưa có hiệu lực pháp lý cho đến khi e-sign]`,

  tpl_sale_agreement: `HỢP ĐỒNG MUA BÁN CĂN HỘ (KHUNG)

Dự án {{projectName}} · Căn {{unitCode}} · Diện tích {{unitArea}} m²
Giá mua: {{basePrice}} VND
Booking ref: {{bookingId}}

Người mua: {{buyerName}} · {{buyerPhone}}{{buyerEmailLine}}
Môi giới: {{agentLabel}} · Ngày {{contractDate}}

Các bên thống nhất giá trị giao dịch bám Golden Record tại thời điểm booking; anti-drift áp dụng cho listing published.

[DRAFT HĐMB — preview UC-BK-06]`,

  tpl_agency_authorization: `GIẤY ỦY QUYỀN GIAO DỊCH BẤT ĐỘNG SẢN

Tôi là {{buyerName}}, CMND/CCCD …, điện thoại {{buyerPhone}}{{buyerEmailLine}}
Ủy quyền cho {{agentLabel}} thực hiện thủ tục đặt cọc, ký HĐMB căn {{unitCode}} tại {{projectName}}.
Phạm vi: booking {{bookingId}} · giá tham chiếu {{basePrice}} VND.

Ngày: {{contractDate}}
[DRAFT — UC-BK-06]`,
};

export function getContractTemplate(id: string): ContractTemplateRecord | undefined {
  return CONTRACT_TEMPLATES.find((t) => t.id === id);
}

export function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')} đ`;
}

/** UC-BK-07 demo OTP — production would integrate SMS gateway (UC-NW-03) */
export const ESIGN_DEMO_OTP = '123456';

export function validateEsignOtp(otp: string): boolean {
  return otp.trim() === ESIGN_DEMO_OTP;
}

export function buildSignedDocumentRef(documentId: string): string {
  return documentId;
}

export function mergeContractTemplate(templateId: string, ctx: ContractMergeContext): string {
  const body = TEMPLATE_BODIES[templateId];
  if (!body) {
    throw new Error(`Unknown contract template ${templateId}`);
  }

  const buyerEmailLine = ctx.buyerEmail ? ` · Email ${ctx.buyerEmail}` : '';
  const replacements: Record<string, string> = {
    projectName: ctx.projectName,
    unitCode: ctx.unitCode,
    unitArea: ctx.unitArea ?? '—',
    basePrice: formatVnd(ctx.basePrice),
    depositAmount: ctx.depositAmount ? formatVnd(ctx.depositAmount) : '—',
    bookingId: ctx.bookingId,
    buyerName: ctx.buyerName,
    buyerPhone: ctx.buyerPhone,
    buyerEmailLine,
    agentLabel: ctx.agentLabel,
    contractDate: ctx.contractDate,
  };

  return Object.entries(replacements).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    body,
  );
}
