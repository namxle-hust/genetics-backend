import { Module } from '@nestjs/common';
import { BatchExistsRule, WorkspaceExistRule } from '../core/constraints';
import { BatchExists } from '../core/decorators';
import { BatchRepository, SampleRepository, WorkspaceRepository } from '../core/repository';
import { VariantRepository } from '../core/repository/variant.repository';
import { VariantService, SampleDetailService, SampleService } from '../core/services';
import { SamplesController } from './samples.controller';

@Module({
    controllers: [SamplesController],
    providers: [
        SampleService,
        SampleRepository,
        BatchRepository,
        WorkspaceRepository,
        BatchExistsRule,
        WorkspaceExistRule,
        SampleDetailService,
        VariantService,
        VariantRepository
    ]

})
export class SamplesModule { }
