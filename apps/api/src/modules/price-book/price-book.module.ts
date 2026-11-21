import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceBookVersionEntity } from '../../database/entities/price-book-versions.entity';
import { QuoteEntity } from '../../database/entities/quotes.entity';
import { PriceBookController } from './price-book.controller';
import { PriceBookService } from './price-book.service';

@Module({
  imports: [TypeOrmModule.forFeature([PriceBookVersionEntity, QuoteEntity])],
  controllers: [PriceBookController],
  providers: [PriceBookService],
  exports: [PriceBookService],
})
export class PriceBookModule {}
