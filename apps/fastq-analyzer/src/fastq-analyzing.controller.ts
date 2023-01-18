import { RmqService, FASTQ_ANALYZE_EVENT } from '@app/common';
import { Analysis, AnalysisStatus } from '@app/prisma';
import { Body, Controller, Get, Logger, Post } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { AnalysisModel } from './models';
import { CommunicationService, FastqAnalyzingService } from './services';

@Controller('fastq')
export class FastqAnalyzingController {
    private readonly logger = new Logger(FastqAnalyzingController.name)

    constructor(
        private readonly fastqAnalyzingService: FastqAnalyzingService,
        private readonly rmqService: RmqService,
        private communicationService: CommunicationService
    ) { }

    @EventPattern(FASTQ_ANALYZE_EVENT)
    async getFastqAnalysis(@Payload() data: AnalysisModel, @Ctx() context: RmqContext) {
        try {
            await this.fastqAnalyzingService.analyzeFastq(data);
            this.rmqService.ack(context)
        } catch (error) {
            this.logger.error(error)
            await this.communicationService.updateSampleStatusStatus(AnalysisStatus.ERROR, data.id)
            this.rmqService.ack(context)
        }
    }

    @Post('test')
    async test(@Body() data: AnalysisModel) {
        await this.fastqAnalyzingService.analyzeFastq(data);
        return true
    }
}
