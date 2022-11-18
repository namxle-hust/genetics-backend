import { Injectable } from '@nestjs/common';

@Injectable()
export class SamplesHandlerService {
  getHello(): string {
    return 'Hello World!';
  }
}
