import { SAMPLE_STATUS_PROCESSOR } from '@app/common';
import { UPDATE_SAMPLE_STATUS_EVENT } from '@app/common/constants/event';
import { Analysis } from '@app/prisma';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { BehaviorSubject, lastValueFrom, Observable } from 'rxjs';

@Injectable()
export class FastqAnalyzingService {

    private readonly logger = new Logger(FastqAnalyzingService.name)

    async analyzeFastq(data: Analysis) {
        this.logger.log('Analyzing')
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                this.logger.log(`Done ${data.id}`)
                resolve(true);
            }, 50000)
        })
        this.logger.log(data)
    }


    getHello(): string {
        return 'Hello World!';
    }
}
