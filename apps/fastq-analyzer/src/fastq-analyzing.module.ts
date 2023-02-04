import { RmqModule, SAMPLE_STATUS_PROCESSOR } from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi'
import { FastqAnalyzingController } from './fastq-analyzing.controller';
import { FastqAnalyzingService, CommunicationService, AnalyzeService } from './services';
import { VcfService } from './services/vcf.service'
import { CommonService } from './services/common.service';
import { GlobalService } from './services/global.service';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: Joi.object({
                RABBIT_MQ_URI: Joi.string().required(),
                RABBIT_MQ_SAMPLE_STATUS_QUEUE: Joi.string().required(),
                RABBIT_MQ_FASTQ_ANALYZING_QUEUE: Joi.string().required()
            })
        }),
        RmqModule,
        RmqModule.register({
            name: SAMPLE_STATUS_PROCESSOR
        })
    ],
    controllers: [FastqAnalyzingController],
    providers: [
        FastqAnalyzingService, 
        CommunicationService,
        AnalyzeService,
        VcfService,
        CommonService,
        GlobalService
    ],
})
export class FastqAnalyzingModule {}
