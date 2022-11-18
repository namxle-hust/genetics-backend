import { Test, TestingModule } from '@nestjs/testing';
import { InformationController } from './information.controller';
import { InformationService } from './information.service';

describe('InformationController', () => {
  let informationController: InformationController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [InformationController],
      providers: [InformationService],
    }).compile();

    informationController = app.get<InformationController>(InformationController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(informationController.getHello()).toBe('Hello World!');
    });
  });
});
