import { ApiProperty } from '@nestjs/swagger';
import { IPgxReportData, IReportData } from '../models';

export class ReportDataEntity implements IReportData {
    @ApiProperty()
    categories: string[];
    
    @ApiProperty()
    pgxData: IPgxReportData[];

    constructor(partial: Partial<ReportDataEntity>) {
        Object.assign(this, partial);
    }

}