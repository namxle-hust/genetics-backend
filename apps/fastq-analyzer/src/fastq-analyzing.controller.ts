import { RmqService, FASTQ_ANALYZE_EVENT } from '@app/common';
import { Analysis, AnalysisStatus } from '@app/prisma';
import { Body, Controller, Get, Logger, Post } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { AnalysisModel } from './models';
import { AnalyzeService, CommunicationService, FastqAnalyzingService } from './services';
import { GlobalService } from './services/global.service';
import { VcfService } from './services/vcf.service';

@Controller('fastq')
export class FastqAnalyzingController {
    private readonly logger = new Logger(FastqAnalyzingController.name)

    constructor(
        private readonly fastqAnalyzingService: FastqAnalyzingService,
        private readonly rmqService: RmqService,
        private communicationService: CommunicationService,
        private vcfService: VcfService,
        private globalService: GlobalService
    ) { }

    @EventPattern(FASTQ_ANALYZE_EVENT)
    async getFastqAnalysis(@Payload() data: AnalysisModel, @Ctx() context: RmqContext) {
        try {
            if (this.globalService.isAnalyzing) {
                this.rmqService.nack(context);
                return;
            }
            this.globalService.isAnalyzing = true;
            this.rmqService.ack(context)

            await this.fastqAnalyzingService.analyzeFastq(data);
            
        } catch (error) {
            this.logger.error(error)
            await this.communicationService.updateSampleStatusStatus(AnalysisStatus.ERROR, data.id)
        }
    }

    @Post('test')
    async test(@Body() data: any) {
        let vcfFile = data.vcfFile;
        let output = data.output;
        await this.vcfService.removeLowQuality(vcfFile, output);
        return true
    }
}
