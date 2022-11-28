import { FASTQ_ANALYZING, FASTQ_ANALYZE_EVENT } from '@app/common';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class SamplesHandlerService {
    constructor(@Inject(FASTQ_ANALYZING) private fastqAnalyzeClient: ClientProxy) {

    }

    getHello(): string {
        return 'Hello World!';
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
