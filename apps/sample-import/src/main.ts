import { NestFactory } from '@nestjs/core';
import { SampleImportModule } from './sample-import.module';

async function bootstrap() {
    const app = await NestFactory.create(SampleImportModule);
    app.enableShutdownHooks();
    await app.init()
}
bootstrap();
