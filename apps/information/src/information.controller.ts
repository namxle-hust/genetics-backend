import { Controller, Get } from '@nestjs/common';
import { InformationService } from './information.service';

@Controller()
export class InformationController {
  constructor(private readonly informationService: InformationService) {}

  @Get()
  getHello(): string {
    return this.informationService.getHello();
  }
}
