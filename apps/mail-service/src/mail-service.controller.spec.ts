import { Test, TestingModule } from '@nestjs/testing';
import { MailServiceController } from './mail-service.controller';
import { MailServiceService } from './mail-service.service';

describe('MailServiceController', () => {
  let mailServiceController: MailServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [MailServiceController],
      providers: [MailServiceService],
    }).compile();

    mailServiceController = app.get<MailServiceController>(MailServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(mailServiceController.getHello()).toBe('Hello World!');
    });
  });
});
