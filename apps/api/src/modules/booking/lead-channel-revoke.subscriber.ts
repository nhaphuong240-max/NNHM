import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntitySubscriberInterface, EventSubscriber, UpdateEvent } from 'typeorm';
import { LeadEntity } from '../../database/entities/lead.entity';
import { SignerChannelVerificationEntity } from '../../database/entities/signer-channel-verification.entity';

/** Lead phone/email change voids VERIFIED channel rows. Email code does not prove SMS ownership (plan 9.3). */
@Injectable()
@EventSubscriber()
export class LeadChannelRevokeSubscriber implements EntitySubscriberInterface<LeadEntity> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return LeadEntity;
  }

  async afterUpdate(event: UpdateEvent<LeadEntity>): Promise<void> {
    const names = event.updatedColumns.map((col) => col.propertyName);
    if (!names.includes('phone') && !names.includes('email')) return;
    const lead = (event.entity ?? event.databaseEntity) as LeadEntity | undefined;
    if (!lead?.id || !lead.tenantId) return;
    await event.manager.getRepository(SignerChannelVerificationEntity).update(
      { tenantId: lead.tenantId, leadId: lead.id, status: 'VERIFIED' },
      { status: 'REVOKED' },
    );
  }
}
