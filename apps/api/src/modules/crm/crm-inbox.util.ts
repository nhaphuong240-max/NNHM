export type InboxChannel = 'ZALO' | 'META' | 'SMS' | 'WEB' | 'CALL';

export type InboxThread = {
  id: string;
  leadId: string;
  leadName: string;
  channel: InboxChannel;
  preview: string;
  unread: boolean;
  lastMessageAt: string;
  status: string;
};

const CHANNEL_PRIORITY: Record<InboxChannel, number> = {
  ZALO: 0,
  META: 1,
  SMS: 2,
  CALL: 3,
  WEB: 4,
};

export function buildInboxPreview(text: string, max = 80): string {
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

/** OPS-S4-03 — unread + omnichannel (Zalo/Meta) before CSV/WEB, then recency. */
export function sortThreads(threads: InboxThread[]): InboxThread[] {
  return [...threads].sort((a, b) => {
    if (a.unread !== b.unread) return a.unread ? -1 : 1;
    const channelDiff = CHANNEL_PRIORITY[a.channel] - CHANNEL_PRIORITY[b.channel];
    if (channelDiff !== 0) return channelDiff;
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });
}
