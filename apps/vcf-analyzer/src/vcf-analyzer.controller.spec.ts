import { Test, TestingModule } from '@nestjs/testing';
import { VcfAnalyzerController } from './vcf-analyzer.controller';
import { VcfAnalyzerService } from './vcf-analyzer.service';

describe('VcfAnalyzerController', () => {
  let vcfAnalyzerController: VcfAnalyzerController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [VcfAnalyzerController],
      providers: [VcfAnalyzerService],
    }).compile();

    vcfAnalyzerController = app.get<VcfAnalyzerController>(VcfAnalyzerController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(vcfAnalyzerController.getHello()).toBe('Hello World!');
    });
  });
});
