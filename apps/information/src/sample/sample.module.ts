import { Module } from '@nestjs/common';
import { FileRepository, SampleRepository } from '../core/repository';
import { SampleService } from '../core/services';
import { FileService } from '../core/services/file.service';
import { SampleController } from './sample.controller';

@Module({
    controllers: [SampleController],
    providers: [SampleService, SampleRepository, FileService, FileRepository]
})
export class SampleModule { }
