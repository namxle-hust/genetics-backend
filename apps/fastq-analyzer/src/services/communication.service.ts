import { SAMPLE_STATUS_PROCESSOR } from '@app/common';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class CommunicationService {
    constructor(@Inject(SAMPLE_STATUS_PROCESSOR) private sampleStatusClient: ClientProxy) {

    }


    // async updateSampleStatusStatus() {
    //     try {
    //         await lastValueFrom(this.sampleStatusClient.emit(UPDATE_SAMPLE_STATUS_EVENT, {
    //             id: 3120
    //         }))
    //         return { id: 3120 }
    //     } catch (error) {
    //         throw error
    //     }
    // }
}
