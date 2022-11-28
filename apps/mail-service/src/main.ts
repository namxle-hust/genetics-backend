import { NestFactory } from '@nestjs/core';
import { MailServiceModule } from './mail-service.module';

async function bootstrap() {
  const app = await NestFactory.create(MailServiceModule);
  await app.listen(3000);
}
bootstrap();
