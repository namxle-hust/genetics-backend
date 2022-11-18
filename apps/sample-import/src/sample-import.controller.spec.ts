import { Test, TestingModule } from '@nestjs/testing';
import { SampleImportController } from './sample-import.controller';
import { SampleImportService } from './sample-import.service';

describe('SampleImportController', () => {
  let sampleImportController: SampleImportController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SampleImportController],
      providers: [SampleImportService],
    }).compile();

    sampleImportController = app.get<SampleImportController>(SampleImportController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(sampleImportController.getHello()).toBe('Hello World!');
    });
  });
});
