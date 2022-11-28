import { SAMPLE_STATUS_PROCESSOR } from '@app/common';
import { UPDATE_SAMPLE_STATUS_EVENT } from '@app/common/constants/event';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class FastqAnalyzingService {

    private readonly logger = new Logger(FastqAnalyzingService.name)




    async analyzeFastq(data) {
        this.logger.log(data)
    }


    getHello(): string {
        return 'Hello World!';
    }
}
