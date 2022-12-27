import { Module } from '@nestjs/common';
import { BatchExistsRule, WorkspaceExistRule } from '../core/constraints';
import { BatchExists } from '../core/decorators';
import { BatchRepository, SampleRepository, WorkspaceRepository } from '../core/repository';
import { SampleService } from '../core/services';
import { SamplesController } from './samples.controller';

@Module({
    controllers: [SamplesController],
    providers: [
        SampleService,
        SampleRepository,
        BatchRepository,
        WorkspaceRepository,
        BatchExistsRule,
        WorkspaceExistRule
    ]

})
export class SamplesModule { }
