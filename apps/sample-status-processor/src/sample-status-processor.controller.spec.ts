import { Test, TestingModule } from '@nestjs/testing';
import { SampleStatusProcessorController } from './sample-status-processor.controller';
import { SampleStatusProcessorService } from './sample-status-processor.service';

describe('SampleStatusProcessorController', () => {
  let sampleStatusProcessorController: SampleStatusProcessorController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SampleStatusProcessorController],
      providers: [SampleStatusProcessorService],
    }).compile();

    sampleStatusProcessorController = app.get<SampleStatusProcessorController>(SampleStatusProcessorController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(sampleStatusProcessorController.getHello()).toBe('Hello World!');
    });
  });
});
