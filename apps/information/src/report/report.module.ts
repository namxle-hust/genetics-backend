import { Module } from '@nestjs/common';
import { PgxRepository, VariantRepository } from '../core/repository';
import { ReportService, VariantService } from '../core/services';
import { ReportController } from './report.controller';

@Module({
    controllers: [ReportController],
    providers: [
        VariantService,
        ReportService,
        VariantRepository,
        PgxRepository
    ]
})
export class ReportModule { }
