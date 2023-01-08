import { FASTQ_ANALYZING, RmqModule, VCF_ANALYZING } from '@app/common';
import { PrismaModule } from '@app/prisma';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi'
import { AnalysisRepository } from './analysis.repository';
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
        RmqModule.register({
            name: VCF_ANALYZING
        }),
        PrismaModule.forRootAsync({
            isGlobal: true,
            useFactory: async (configService: ConfigService) => {
                return {
                    // prismaOptions: {
                    //     log: ['query']
                    // },
                };
            },
            inject: [ConfigService],
        }),
        ScheduleModule.forRoot()
    ],
    controllers: [SamplesHandlerController],
    providers: [SamplesHandlerService, AnalysisRepository],
})
export class SamplesHandlerModule { }
