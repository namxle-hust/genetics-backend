import { MongoModule } from '@app/common/mongodb/mongo.module';
import { PrismaModule } from '@app/prisma';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DBModule, MongoConfigService } from '@app/common/mongodb';
import * as Joi from 'joi'
import { WorkspaceController } from './workspace/workspace.controller';
import { AuthModule } from './auth/auth.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { FileModule } from './file/file.module';
import { BatchModule } from './batch/batch.module';
import { SamplesModule } from './samples/samples.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: Joi.object({
                MONGODB_URI: Joi.string().required(),
                POSTGRES_URI: Joi.string().required(),
                S3_UPLOADER_ACCESS_KEY: Joi.string().required(),
                S3_UPLOADER_SECRET_KEY: Joi.string().required(),
                S3_BUCKET: Joi.string().required()
            }),
            envFilePath: '.env',
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
        AuthModule,
        WorkspaceModule,
        FileModule,
        BatchModule,
        SamplesModule
    ],
    controllers: []
})
export class InformationModule { }
