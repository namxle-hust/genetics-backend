import { Injectable } from '@nestjs/common';

@Injectable()
export class MailServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
