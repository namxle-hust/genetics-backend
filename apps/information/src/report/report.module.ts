import { Module } from '@nestjs/common';
import { AnalysisRepository, PgxRepository, SampleRepository, VariantRepository } from '../core/repository';
import { ReportService, VariantService } from '../core/services';
import { ReportController } from './report.controller';

@Module({
    controllers: [ReportController],
    providers: [
        VariantService,
        ReportService,
        VariantRepository,
        PgxRepository,
        SampleRepository,
        AnalysisRepository
    ]
})
export class ReportModule { }
