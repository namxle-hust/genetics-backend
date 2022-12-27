import { FASTQ_ANALYZING, RmqModule } from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi'
import { SamplesHandlerController } from './samples-handler.controller';
import { SamplesHandlerService } from './samples-handler.service';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: Joi.object({
                RABBIT_MQ_URI: Joi.string().required(),
                RABBIT_MQ_FASTQ_ANALYZING_QUEUE: Joi.string().required()
            })
        }),
        RmqModule.register({
            name: FASTQ_ANALYZING
        }),
        ScheduleModule.forRoot()
    ],
    controllers: [SamplesHandlerController],
    providers: [SamplesHandlerService],
})
export class SamplesHandlerModule { }
