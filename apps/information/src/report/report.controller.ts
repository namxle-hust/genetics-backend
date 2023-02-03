import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReportDataEntity } from '../core/entities';
import { JwtGuard } from '../core/guards';
import { IReportData } from '../core/models';
import { ReportService } from '../core/services';

@UseGuards(JwtGuard)
@ApiTags('analysis')
@Controller('report')
export class ReportController {
    constructor(
        private reportService: ReportService
    ) {}

    @Get(':id/data')
    @ApiOkResponse({ type: ReportDataEntity })
    async getReportData(@Param('id', ParseIntPipe) id) {
        const data: IReportData = await this.reportService.getReportData(id);
        return new ReportDataEntity(data);
    }

}
