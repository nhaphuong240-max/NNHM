import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RailResolverService } from '../tenant-config/rail-resolver.service';

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
};

export type ExpoPushTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly rails: RailResolverService,
  ) {}

  /** OPS-S4-05 — tenant LIVE_RAILS.pushLiveEnabled wins over PUSH_LIVE_ENABLED env. */
  async isLiveEnabled(tenantId: string): Promise<boolean> {
    const resolved = await this.rails.resolve(tenantId);
    return resolved.pushLiveEnabled;
  }

  isLiveEnabledSync(): boolean {
    return this.config.get<string>('PUSH_LIVE_ENABLED', 'false') === 'true';
  }

  async sendBatch(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    if (messages.length === 0) return [];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const accessToken = this.config.get<string>('EXPO_ACCESS_TOKEN');
    if (accessToken?.trim()) {
      headers.Authorization = `Bearer ${accessToken.trim()}`;
    }

    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers,
        body: JSON.stringify(messages),
      });

      if (!res.ok) {
        this.logger.warn(`Expo push HTTP ${res.status}`);
        return messages.map(() => ({
          status: 'error' as const,
          message: `HTTP ${res.status}`,
        }));
      }

      const body = (await res.json()) as { data?: ExpoPushTicket[] } | ExpoPushTicket[];
      return Array.isArray(body) ? body : (body.data ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'network_error';
      this.logger.warn(`Expo push failed: ${message}`);
      return messages.map(() => ({ status: 'error' as const, message }));
    }
  }
}
