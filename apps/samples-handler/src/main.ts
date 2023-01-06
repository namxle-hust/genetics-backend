import { NestFactory, Reflector } from '@nestjs/core';
import { SamplesHandlerModule } from './samples-handler.module';
import { useContainer } from 'class-validator';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create(SamplesHandlerModule);


    // app.useGlobalPipes(new ValidationPipe({
    //     whitelist: true
    // }));

    // // apply transform to all responses
    // app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));


    // useContainer(app.select(SamplesHandlerModule), { fallbackOnErrors: true });

    await app.init()
}
bootstrap();
