import { AnalysisStatus } from '@app/prisma';
import { Injectable, Logger } from '@nestjs/common';
import { AnalysisRepository } from './status-processor.repository';

@Injectable()
export class SampleStatusProcessorService {
    private readonly logger = new Logger(SampleStatusProcessorService.name)


    constructor(private repository: AnalysisRepository) {}

    getHello(): string {
        return 'Hello World!';
    }

    async updateStatus(data: { id: number, status: AnalysisStatus }) {
        this.logger.log('Update status: ', data);
        await this.repository.update(data.id, data.status)
        return;
    }
}
