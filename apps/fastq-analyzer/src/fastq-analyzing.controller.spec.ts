import { Test, TestingModule } from '@nestjs/testing';
import { FastqAnalyzingController } from './fastq-analyzing.controller';
import { FastqAnalyzingService } from './fastq-analyzing.service';

describe('FastqAnalyzingController', () => {
  let fastqAnalyzingController: FastqAnalyzingController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [FastqAnalyzingController],
      providers: [FastqAnalyzingService],
    }).compile();

    fastqAnalyzingController = app.get<FastqAnalyzingController>(FastqAnalyzingController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(fastqAnalyzingController.getHello()).toBe('Hello World!');
    });
  });
});
