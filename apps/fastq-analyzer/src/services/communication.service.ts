import { SAMPLE_STATUS_PROCESSOR, UPDATE_SAMPLE_STATUS_EVENT } from '@app/common';
import { AnalysisStatus } from '@app/prisma';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class CommunicationService {
    constructor(@Inject(SAMPLE_STATUS_PROCESSOR) private sampleStatusClient: ClientProxy) {

    }


    async updateSampleStatusStatus(status: AnalysisStatus, id: number
    ) {
        try {
            await lastValueFrom(this.sampleStatusClient.emit(UPDATE_SAMPLE_STATUS_EVENT, {
                id: id,
                status: status
            }))
        } catch (error) {
            throw error;
        }
    }
}
