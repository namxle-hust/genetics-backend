import { MAIL_SERVICE, RmqModule } from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi'
import { SampleStatusProcessorController } from './sample-status-processor.controller';
import { SampleStatusProcessorService } from './sample-status-processor.service';
import { AnalysisRepository } from './status-processor.repository';

@Module({
    imports: [
        RmqModule,
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: Joi.object({
                RABBIT_MQ_URI: Joi.string().required(),
                RABBIT_MQ_SAMPLE_STATUS_QUEUE: Joi.string().required(),
                RABBIT_MQ_MAIL_SERVICE_QUEUE: Joi.string().required()
            }),
        }),
        RmqModule.register({
            name: MAIL_SERVICE
        })
    ],
    controllers: [SampleStatusProcessorController],
    providers: [SampleStatusProcessorService, AnalysisRepository],
})
export class SampleStatusProcessorModule { }
