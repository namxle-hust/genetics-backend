import { Controller, Get } from '@nestjs/common';
import { VcfAnalyzerService } from './vcf-analyzer.service';

@Controller()
export class VcfAnalyzerController {
  constructor(private readonly vcfAnalyzerService: VcfAnalyzerService) {}

  @Get()
  getHello(): string {
    return this.vcfAnalyzerService.getHello();
  }
}
