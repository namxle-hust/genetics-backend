import { Controller, Get } from '@nestjs/common';
import { MailServiceService } from './mail-service.service';

@Controller()
export class MailServiceController {
  constructor(private readonly mailServiceService: MailServiceService) {}

  @Get()
  getHello(): string {
    return this.mailServiceService.getHello();
  }
}
