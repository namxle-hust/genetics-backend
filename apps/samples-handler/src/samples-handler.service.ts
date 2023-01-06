import { FASTQ_ANALYZING, FASTQ_ANALYZE_EVENT } from '@app/common';
import { SampleStatus } from '@app/prisma';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
import { lastValueFrom } from 'rxjs';
import { SampleRepository } from './sample.repository';

@Injectable()
export class SamplesHandlerService {
    private readonly logger = new Logger(SamplesHandlerService.name)

    constructor(@Inject(FASTQ_ANALYZING) private fastqAnalyzeClient: ClientProxy,
        private sampleRepository: SampleRepository
    ) {

    }

    getHello(): string {
        return 'Hello World!';
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async handleCron() {
        const sample =  await this.sampleRepository.getSampleByStatus(SampleStatus.VCF_QUEUING)
        this.logger.debug(sample);
        this.logger.debug('Called Every 30 seconds');
    }

    async analyzeFastq(request: any) {
        try {
            await lastValueFrom(this.fastqAnalyzeClient.emit(FASTQ_ANALYZE_EVENT, {
                request
            }))
            return { status: 'success' }
        } catch (error) {
            throw error
        }
    }
}
