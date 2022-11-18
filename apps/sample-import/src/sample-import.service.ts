import { Injectable } from '@nestjs/common';

@Injectable()
export class SampleImportService {
  getHello(): string {
    return 'Hello World!';
  }
}
