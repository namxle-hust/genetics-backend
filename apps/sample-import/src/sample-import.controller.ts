import { Controller, Get, Post } from '@nestjs/common';
import { SampleImportService } from './sample-import.service';

@Controller()
export class SampleImportController {
  constructor(private readonly sampleImportService: SampleImportService) {}

  @Get()
  getHello(): string {
    return this.sampleImportService.getHello();
  }

  @Get('test2')
  test2() {
    return this.sampleImportService.test2()
  }

    @Post('test')
    test() {
        return this.sampleImportService.test();
    }
}
