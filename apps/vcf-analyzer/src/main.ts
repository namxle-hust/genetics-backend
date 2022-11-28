import { RmqService, VCF_ANALYZING } from '@app/common';
import { NestFactory } from '@nestjs/core';
import { VcfAnalyzerModule } from './vcf-analyzer.module';

async function bootstrap() {
    const app = await NestFactory.create(VcfAnalyzerModule);

    const rmqService = app.get<RmqService>(RmqService)
    app.connectMicroservice(rmqService.getOptions(VCF_ANALYZING))

    await app.startAllMicroservices()

    await app.listen(4500);
}
bootstrap();
