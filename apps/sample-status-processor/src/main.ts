import { RmqService, SAMPLE_STATUS_PROCESSOR } from '@app/common';
import { NestFactory } from '@nestjs/core';
import { SampleStatusProcessorModule } from './sample-status-processor.module';

async function bootstrap() {
    const app = await NestFactory.create(SampleStatusProcessorModule);

    const rmqService = app.get<RmqService>(RmqService)
    app.connectMicroservice(rmqService.getOptions(SAMPLE_STATUS_PROCESSOR))

    await app.startAllMicroservices()
}
bootstrap();
