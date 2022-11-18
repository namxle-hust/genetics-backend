import { Controller, Get } from '@nestjs/common';
import { SamplesHandlerService } from './samples-handler.service';

@Controller()
export class SamplesHandlerController {
  constructor(private readonly samplesHandlerService: SamplesHandlerService) {}

  @Get()
  getHello(): string {
    return this.samplesHandlerService.getHello();
  }
}
