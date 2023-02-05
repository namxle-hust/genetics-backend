import { Controller, Get, Logger, Post } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SampleImportService } from './sample-import.service';

@Controller()
export class SampleImportController {

    private readonly logger = new Logger(SampleImportController.name)

    constructor(private readonly sampleImportService: SampleImportService) { }

    @Get()
    getHello(): string {
        return this.sampleImportService.getHello();
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async import() {
        try {
            await this.sampleImportService.importAnalysis()

        } catch (error) {
            this.logger.error(error)
        }
    }
    
}
