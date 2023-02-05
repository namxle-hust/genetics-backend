import { MAIL_SERVICE, RmqModule } from '@app/common';
import { MongoModule } from '@app/common/mongodb/mongo.module';
import { PrismaModule } from '@app/prisma';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi'
import { DBModule, MongoConfigService } from '@app/common/mongodb';
import { SampleImportController } from './sample-import.controller';
import { SampleImportService } from './sample-import.service';
import { ImportRepository } from './import.repository';
import { AnalysisImportRepository } from './analysis-import.repository';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonService } from './common.service';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: Joi.object({
                MONGODB_URI: Joi.string().required(),
                RABBIT_MQ_URI: Joi.string().required(),
                RABBIT_MQ_MAIL_SERVICE_QUEUE: Joi.string().required(),
                POSTGRES_URI: Joi.string().required()
            }),
            envFilePath: '.env',
        }),
        RmqModule.register({
            name: MAIL_SERVICE
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
        MongoModule.forRootAsync({
            imports: [DBModule],
            useExisting: MongoConfigService
        }),
        ScheduleModule.forRoot()
    ],
    controllers: [SampleImportController],
    providers: [SampleImportService, ImportRepository, AnalysisImportRepository, CommonService],
})
export class SampleImportModule { }
