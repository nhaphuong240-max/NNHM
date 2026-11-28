import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CONTRACT_SIGN_TOKEN_TTL_MS } from './contract-sign-token';
import { sandboxOutboxEnabled } from './esign-link.policy';

const MAX_ENTRIES = 64;

type OutboxRow = { url: string; exp: number };

/** Holds sandbox signing URLs in process memory. Never returned on send APIs. Production is always off. */
@Injectable()
export class SandboxEsignOutbox {
  private readonly links = new Map<string, OutboxRow>();

  constructor(private readonly config: ConfigService) {}

  enabled(): boolean {
    return sandboxOutboxEnabled(this.config.get<string>('NODE_ENV'), this.config.get<string>('ESIGN_SANDBOX_OUTBOX'));
  }

  put(deliveryId: string, signingUrl: string): void {
    if (!this.enabled() || !deliveryId.trim() || !signingUrl.trim()) return;
    this.prune(Date.now());
    this.links.set(deliveryId, { url: signingUrl, exp: Date.now() + CONTRACT_SIGN_TOKEN_TTL_MS });
  }

  peek(deliveryId: string): string | null {
    return this.read(deliveryId, false);
  }

  get(deliveryId: string): string | null {
    if (!this.enabled()) return null;
    return this.read(deliveryId, true);
  }

  private read(deliveryId: string, requireEnabled: boolean): string | null {
    if (requireEnabled && !this.enabled()) return null;
    const row = this.links.get(deliveryId);
    if (!row) return null;
    if (row.exp <= Date.now()) {
      this.links.delete(deliveryId);
      return null;
    }
    return row.url;
  }

  private prune(now: number): void {
    for (const [id, row] of this.links) {
      if (row.exp <= now) this.links.delete(id);
    }
    while (this.links.size >= MAX_ENTRIES) {
      const oldest = this.links.keys().next().value as string | undefined;
      if (!oldest) break;
      this.links.delete(oldest);
    }
  }
}
