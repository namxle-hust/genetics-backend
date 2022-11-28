import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SampleStatusProcessorService {
    private readonly logger = new Logger(SampleStatusProcessorService.name)


    getHello(): string {
        return 'Hello World!';
    }

    updateStatus(data: any) {
        this.logger.log('Update status: ', data);
    }
}
