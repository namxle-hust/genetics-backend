import { Controller, Get } from '@nestjs/common';
import { SampleImportService } from './sample-import.service';

@Controller()
export class SampleImportController {
  constructor(private readonly sampleImportService: SampleImportService) {}

  @Get()
  getHello(): string {
    return this.sampleImportService.getHello();
  }
}
