import { Global, Module } from '@nestjs/common';
import { StreamController } from './stream.controller';
import { StreamEventsService } from './stream-events.service';

@Global()
@Module({
  controllers: [StreamController],
  providers: [StreamEventsService],
  exports: [StreamEventsService],
})
export class StreamModule {}
