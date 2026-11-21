import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExceptionItemEntity } from '../../database/entities/exception-items.entity';
import { ExceptionItemController } from './exception-item.controller';
import { ExceptionItemService } from './exception-item.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExceptionItemEntity])],
  controllers: [ExceptionItemController],
  providers: [ExceptionItemService],
  exports: [ExceptionItemService],
})
export class ExceptionItemModule {}
