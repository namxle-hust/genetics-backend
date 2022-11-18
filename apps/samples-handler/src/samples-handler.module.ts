import { Module } from '@nestjs/common';
import { SamplesHandlerController } from './samples-handler.controller';
import { SamplesHandlerService } from './samples-handler.service';

@Module({
  imports: [],
  controllers: [SamplesHandlerController],
  providers: [SamplesHandlerService],
})
export class SamplesHandlerModule {}
