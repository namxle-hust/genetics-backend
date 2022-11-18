import { Injectable } from '@nestjs/common';

@Injectable()
export class InformationService {
  getHello(): string {
    return 'Hello World!';
  }
}
