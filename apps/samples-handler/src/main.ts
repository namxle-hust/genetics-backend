import { NestFactory } from '@nestjs/core';
import { SamplesHandlerModule } from './samples-handler.module';

async function bootstrap() {
  const app = await NestFactory.create(SamplesHandlerModule);
  await app.listen(3000);
}
bootstrap();
