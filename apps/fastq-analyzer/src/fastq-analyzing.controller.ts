import { RmqService, FASTQ_ANALYZE_EVENT } from '@app/common';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { FastqAnalyzingService } from './fastq-analyzing.service';

@Controller()
export class FastqAnalyzingController {
    constructor(
        private readonly fastqAnalyzingService: FastqAnalyzingService,
        private readonly rmqService: RmqService
    ) { }

    @Get()
    getHello(): string {
        return this.fastqAnalyzingService.getHello();
    }

    // @Post('signup')
    // signup(@Body() request: any) {
    //     return this.fastqAnalyzingService.updateStatus()
    // }

    @EventPattern(FASTQ_ANALYZE_EVENT)
    async handleSampleStatus(@Payload() data: any, @Ctx() context: RmqContext) {
        await this.fastqAnalyzingService.analyzeFastq(data);
        this.rmqService.ack(context)
    }
}
