import { RmqService } from '@app/common';
import { UPDATE_SAMPLE_STATUS_EVENT } from '@app/common/constants/event';
import { Controller, Get } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { SampleStatusProcessorService } from './sample-status-processor.service';

@Controller()
export class SampleStatusProcessorController {
    constructor(
        private readonly sampleStatusProcessorService: SampleStatusProcessorService,
        private readonly rmqService: RmqService
    ) { }

    @Get()
    getHello(): string {
        return this.sampleStatusProcessorService.getHello();
    }

    @EventPattern(UPDATE_SAMPLE_STATUS_EVENT)
    async handleSampleStatus(@Payload() data: any, @Ctx() context: RmqContext) {
        await this.sampleStatusProcessorService.updateStatus(data);
        this.rmqService.ack(context)
    }
}
