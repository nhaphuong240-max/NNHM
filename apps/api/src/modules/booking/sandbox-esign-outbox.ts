import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sandboxOutboxEnabled } from './esign-link.policy';

/** Holds sandbox signing URLs in process memory. Never returned on send APIs. */
@Injectable()
export class SandboxEsignOutbox {
  private readonly links = new Map<string, string>();

  constructor(private readonly config: ConfigService) {}

  enabled(): boolean {
    return sandboxOutboxEnabled(this.config.get<string>('NODE_ENV'), this.config.get<string>('ESIGN_SANDBOX_OUTBOX'));
  }

  put(deliveryId: string, signingUrl: string): void {
    if (!deliveryId.trim() || !signingUrl.trim()) return;
    this.links.set(deliveryId, signingUrl);
  }

  peek(deliveryId: string): string | null {
    return this.links.get(deliveryId) ?? null;
  }

  get(deliveryId: string): string | null {
    if (!this.enabled()) return null;
    return this.peek(deliveryId);
  }
}
