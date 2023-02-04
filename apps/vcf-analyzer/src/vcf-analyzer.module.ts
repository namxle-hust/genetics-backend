import { RmqModule, SAMPLE_STATUS_PROCESSOR } from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import * as Joi from 'joi'
import { AnnovarService, CommunicationService, VcfService } from './services';
import { CalculateService } from './services/calculate.service';
import { CommonService } from './services/common.service';
import { GlobalService } from './services/global.service';
import { VcfAnalyzerController } from './vcf-analyzer.controller';
import { VcfAnalyzerService } from './vcf-analyzer.service';

@Module({
    imports: [
        EventEmitterModule.forRoot(),
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: Joi.object({
                RABBIT_MQ_URI: Joi.string().required(),
                RABBIT_MQ_SAMPLE_STATUS_QUEUE: Joi.string().required(),
                RABBIT_MQ_VCF_ANALYZING_QUEUE: Joi.string().required()
            })
        }),
        RmqModule,
        RmqModule.register({
            name: SAMPLE_STATUS_PROCESSOR
        })
    ],
    controllers: [VcfAnalyzerController],
    providers: [
        VcfAnalyzerService,
        CommunicationService,
        CommonService,
        AnnovarService,
        VcfService,
        CalculateService,
        GlobalService
    ],
})
export class VcfAnalyzerModule { }
