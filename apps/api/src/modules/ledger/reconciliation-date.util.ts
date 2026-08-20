/** ICT (Asia/Ho_Chi_Minh) business-day boundaries for reconciliation */
export function ictDayRange(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00+07:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function ictYesterday(): string {
  const now = new Date();
  const ictNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  ictNow.setDate(ictNow.getDate() - 1);
  const y = ictNow.getFullYear();
  const m = String(ictNow.getMonth() + 1).padStart(2, '0');
  const d = String(ictNow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function ictToday(): string {
  const now = new Date();
  const ictNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const y = ictNow.getFullYear();
  const m = String(ictNow.getMonth() + 1).padStart(2, '0');
  const d = String(ictNow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function lastNDatesIct(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  const ictNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));

  for (let i = 0; i < days; i++) {
    const d = new Date(ictNow);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
  }

  return dates;
}
