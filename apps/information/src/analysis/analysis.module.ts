import { Module } from '@nestjs/common';
import { SampleExistsRule, WorkspaceExistRule } from '../core/constraints';
import { AnalysisRepository, SampleRepository, WorkspaceRepository } from '../core/repository';
import { VariantRepository } from '../core/repository/variant.repository';
import { VariantService, AnalysisDetailService, S3Service, CommonService, AnalysisService } from '../core/services';
import { AnalysisController } from './analysis.controller';

@Module({
    controllers: [AnalysisController],
    providers: [
        AnalysisRepository,
        AnalysisService,
        WorkspaceRepository,
        SampleRepository,
        SampleExistsRule,
        WorkspaceExistRule,
        AnalysisDetailService,
        VariantService,
        VariantRepository,
        S3Service,
        CommonService
    ]

})
export class AnalysisModule { }
