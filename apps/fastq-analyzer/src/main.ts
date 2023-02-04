import { FASTQ_ANALYZING, RmqService } from '@app/common';
import { NestFactory } from '@nestjs/core';
import { FastqAnalyzingModule } from './fastq-analyzing.module';

async function bootstrap() {
    const app = await NestFactory.create(FastqAnalyzingModule);

    const rmqService = app.get<RmqService>(RmqService)
    app.connectMicroservice(rmqService.getOptions(FASTQ_ANALYZING))

    await app.startAllMicroservices()

    await app.listen(4000);
}
bootstrap();
