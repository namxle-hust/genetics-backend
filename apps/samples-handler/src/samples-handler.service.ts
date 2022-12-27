import { FASTQ_ANALYZING, FASTQ_ANALYZE_EVENT } from '@app/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class SamplesHandlerService {
    private readonly logger = new Logger(SamplesHandlerService.name)

    constructor(@Inject(FASTQ_ANALYZING) private fastqAnalyzeClient: ClientProxy) {

    }

    getHello(): string {
        return 'Hello World!';
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    handleCron() {
        this.logger.debug('Called when the current second is 45');
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
