import { RmqService, VCF_ANALYZE_EVENT } from '@app/common';
import { AnalysisStatus } from '@app/prisma';
import { Controller, Get, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { AnalysisModel } from './models';
import { CommunicationService } from './services';
import { VcfAnalyzerService } from './vcf-analyzer.service';

@Controller()
export class VcfAnalyzerController {
    private readonly logger = new Logger(VcfAnalyzerController.name)

    constructor(
        private readonly vcfAnalyzerService: VcfAnalyzerService,
        private readonly rmqService: RmqService,
        private readonly communicationService: CommunicationService
    ) { 
        this.logger.log(VCF_ANALYZE_EVENT)
    }

    @EventPattern(VCF_ANALYZE_EVENT)
    async getVcfAnalysis(@Payload() data: AnalysisModel, @Ctx() context: RmqContext) {
        try {
            await this.communicationService.updateSampleStatusStatus(AnalysisStatus.VCF_ANALYZING ,data.id)

            await this.vcfAnalyzerService.analyze(data)

            this.rmqService.ack(context)

            await this.communicationService.updateSampleStatusStatus(AnalysisStatus.IMPORT_QUEUING, data.id)

        } catch (error) {
            this.logger.error(error)
            await this.communicationService.updateSampleStatusStatus(AnalysisStatus.ERROR, data.id)
            this.rmqService.ack(context)
        }
    }
}
