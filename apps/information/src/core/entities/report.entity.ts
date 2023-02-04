import { Sample } from '@app/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { IPgxReportData, IReportData } from '../models';

export class ReportDataEntity implements IReportData {
    @ApiProperty()
    categories: string[];
    
    @ApiProperty()
    pgxData: IPgxReportData[];

    @ApiProperty()
    sample: Sample

    constructor(partial: Partial<ReportDataEntity>) {
        Object.assign(this, partial);
    }

}