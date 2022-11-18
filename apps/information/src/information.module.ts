import { Module } from '@nestjs/common';
import { InformationController } from './information.controller';
import { InformationService } from './information.service';

@Module({
  imports: [],
  controllers: [InformationController],
  providers: [InformationService],
})
export class InformationModule {}
