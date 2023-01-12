import { RmqService, FASTQ_ANALYZE_EVENT } from '@app/common';
import { Analysis } from '@app/prisma';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { AnalysisModel } from './analysis.model';
import { FastqAnalyzingService } from './fastq-analyzing.service';

@Controller('fastq')
export class FastqAnalyzingController {
    constructor(
        private readonly fastqAnalyzingService: FastqAnalyzingService,
        private readonly rmqService: RmqService
    ) { }

    @EventPattern(FASTQ_ANALYZE_EVENT)
    async getFastqAnalysis(@Payload() data: AnalysisModel, @Ctx() context: RmqContext) {
        await this.fastqAnalyzingService.analyzeFastq(data);
        this.rmqService.ack(context)
    }

    @Post('test')
    async test(@Body() data: AnalysisModel) {
        await this.fastqAnalyzingService.analyzeFastq(data);
        return true
    }
}
