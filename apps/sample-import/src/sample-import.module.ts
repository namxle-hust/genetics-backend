import { MongodbModule, SampleSchema } from '@app/common';
import { SampleRepository, Sample } from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as Joi from 'joi'
import { SampleImportController } from './sample-import.controller';
import { SampleImportService } from './sample-import.service';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: Joi.object({
                MONGODB_URI: Joi.string().required
            }),
            envFilePath: './apps/sample-import/.env'
        }),
        MongodbModule,
        MongooseModule.forFeature([{ name: Sample.name, schema: SampleSchema }])
    ],
    controllers: [SampleImportController],
    providers: [SampleImportService, SampleRepository],
})
export class SampleImportModule { }
