import { Test, TestingModule } from '@nestjs/testing';
import { SamplesHandlerController } from './samples-handler.controller';
import { SamplesHandlerService } from './samples-handler.service';

describe('SamplesHandlerController', () => {
  let samplesHandlerController: SamplesHandlerController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SamplesHandlerController],
      providers: [SamplesHandlerService],
    }).compile();

    samplesHandlerController = app.get<SamplesHandlerController>(SamplesHandlerController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(samplesHandlerController.getHello()).toBe('Hello World!');
    });
  });
});
