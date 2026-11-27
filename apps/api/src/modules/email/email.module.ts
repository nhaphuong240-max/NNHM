import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailDeliveryEntity } from '../../database/entities/email-delivery.entity';
import { AuditModule } from '../audit/audit.module';
import { EmailService } from './email.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmailDeliveryEntity]), AuditModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
