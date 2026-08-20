import type { CopilotTone, ListingCopilotContext } from './copilot.types';

export const COPILOT_MODEL_VERSION = 'template-vi-v1-2026';

const TONE_INTROS: Record<CopilotTone, string> = {
  premium:
    'Khám phá không gian sống đẳng cấp tại dự án {project} — căn {code} thiết kế tinh tế, tối ưu ánh sáng tự nhiên.',
  standard:
    'Căn hộ {code} tại {project} — diện tích thoáng, bố trí hợp lý, phù hợp gia đình trẻ và nhu cầu an cư thực.',
  investment:
    'Cơ hội đầu tư tại {project} — căn {code} vị trí thuận lợi, tiềm năng cho thuê và tăng trưởng giá trị dài hạn.',
};

const TONE_DETAILS: Record<CopilotTone, string> = {
  premium:
    'Nội thất cao cấp, view thoáng, tiện ích nội khu đồng bộ. Phù hợp khách hàng ưu tiên chất lượng sống và thương hiệu chủ đầu tư uy tín.',
  standard:
    'Gần trục giao thông chính, tiện di chuyển khu vực. Không gian sinh hoạt linh hoạt, dễ bố trí nội thất theo nhu cầu gia đình.',
  investment:
    'Thị trường cho thuê ổn định, dòng tiền hấp dẫn. Sản phẩm minh bạch từ Golden Record — agent hỗ trợ pháp lý và thủ tục nhanh gọn.',
};

function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} VND`;
}

export function generateListingCopilotCopy(
  ctx: ListingCopilotContext,
  tone: CopilotTone = 'premium',
): { title: string; content: string } {
  const floorLabel = ctx.floor != null ? `tầng ${ctx.floor}` : 'tầng cao';
  const priceRef = ctx.priceDisplay ?? ctx.basePrice;

  const title =
    tone === 'investment'
      ? `Đầu tư ${ctx.bedrooms}PN · ${ctx.unitCode} · ${ctx.projectName}`
      : tone === 'standard'
        ? `Căn ${ctx.bedrooms}PN ${ctx.unitCode} · ${ctx.projectName}`
        : `Căn hộ cao cấp ${ctx.bedrooms}PN · ${ctx.unitCode} · view đẹp`;

  const intro = TONE_INTROS[tone]
    .replace('{project}', ctx.projectName)
    .replace('{code}', ctx.unitCode);

  const details = TONE_DETAILS[tone];

  const content = [
    intro,
    '',
    `• Mã căn: ${ctx.unitCode} · ${floorLabel}`,
    `• Diện tích: ${ctx.area} m² · ${ctx.bedrooms} phòng ngủ`,
    `• Giá tham chiếu marketing: ${formatVnd(priceRef)} (đối chiếu Golden Record)`,
    '',
    details,
    '',
    'Liên hệ agent để xem nhà thực tế và nhận tư vấn chi tiết.',
  ].join('\n');

  return { title, content };
}
