import { NestFactory } from '@nestjs/core';
import { InformationModule } from './information.module';

async function bootstrap() {
  const app = await NestFactory.create(InformationModule);
    await app.listen(3001);
}
bootstrap();
