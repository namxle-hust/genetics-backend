import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { InformationModule } from './information.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';

async function bootstrap() {
  const app = await NestFactory.create(InformationModule);
    app.enableCors({
        origin: [
            'http://localhost:4200',
            'http://localhost:3000',
            'http://apps.genetics.vn',
            'http://www.apps.genetics.vn'
        ]
    }
    );
    
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true
    }));

    // apply transform to all responses
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    

    useContainer(app.select(InformationModule), { fallbackOnErrors: true });
    
    // Swagger Module

    const config = new DocumentBuilder()
        .setTitle('Information Backend')
        .setDescription('API description')
        .setVersion('1.0')
        .build();
        
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);



    await app.listen(3900);
}
bootstrap();
