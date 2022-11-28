import { Injectable } from '@nestjs/common';

@Injectable()
export class VcfAnalyzerService {
  getHello(): string {
    return 'Hello World!';
  }
}
