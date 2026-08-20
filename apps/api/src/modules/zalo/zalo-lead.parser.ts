import { normalizeVnPhone } from '../meta/meta-lead.parser';

const NAME_PATTERNS = [
  /(?:tên|ho ten|họ tên|hoten)\s*[:：]\s*(.+)/i,
  /^(.+?)\s*[-–—|]\s*(?:0|\+84)\d{8,10}/,
];

const PHONE_PATTERN = /(?:\+84|84|0)\d{8,10}/;

export function parseZaloLeadMessage(text: string, senderId: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Zalo message text is empty');
  }

  let fullName: string | undefined;
  for (const pattern of NAME_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]?.trim()) {
      fullName = match[1].trim();
      break;
    }
  }

  const phoneMatch = trimmed.match(PHONE_PATTERN);
  if (!phoneMatch) {
    throw new Error('Zalo message missing phone number');
  }

  const phone = normalizeVnPhone(phoneMatch[0]);
  if (!fullName) {
    const firstLine = trimmed.split('\n')[0]?.trim() ?? '';
    if (firstLine && !PHONE_PATTERN.test(firstLine)) {
      fullName = firstLine.slice(0, 120);
    } else {
      fullName = `Zalo ${senderId.slice(-6)}`;
    }
  }

  return {
    fullName,
    phone,
    message: trimmed,
  };
}
