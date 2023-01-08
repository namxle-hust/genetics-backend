import { RmqService, FASTQ_ANALYZE_EVENT } from '@app/common';
import { Analysis } from '@app/prisma';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { FastqAnalyzingService } from './fastq-analyzing.service';

@Controller()
export class FastqAnalyzingController {
    constructor(
        private readonly fastqAnalyzingService: FastqAnalyzingService,
        private readonly rmqService: RmqService
    ) { }

    @EventPattern(FASTQ_ANALYZE_EVENT)
    async getFastqAnalysis(@Payload() data: Analysis, @Ctx() context: RmqContext) {
        await this.fastqAnalyzingService.analyzeFastq(data);
        this.rmqService.ack(context)
    }
}
