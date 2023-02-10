import { Module } from '@nestjs/common';
import { FileRepository, SampleRepository } from '../core/repository';
import { CommonService, SampleService } from '../core/services';
import { FileService } from '../core/services/file.service';
import { SampleController } from './sample.controller';

@Module({
    controllers: [SampleController],
    providers: [SampleService, SampleRepository, FileService, FileRepository, CommonService]
})
export class SampleModule { }
