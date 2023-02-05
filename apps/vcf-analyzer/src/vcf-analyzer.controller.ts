import { RmqService, VCF_ANALYZE_EVENT } from '@app/common';
import { AnalysisStatus } from '@app/prisma';
import { Body, Controller, Get, Logger, Post } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { AnalysisModel } from './models';
import { AnnovarService, CommunicationService, VcfService } from './services';
import { GlobalService } from './services/global.service';
import { VcfAnalyzerService } from './vcf-analyzer.service';

@Controller('vcf')
export class VcfAnalyzerController {
    private readonly logger = new Logger(VcfAnalyzerController.name)

    constructor(
        private readonly vcfAnalyzerService: VcfAnalyzerService,
        private readonly rmqService: RmqService,
        private readonly communicationService: CommunicationService,
        private readonly annovarService: AnnovarService,
        private readonly vcfService: VcfService,
        private globalService: GlobalService
    ) { 
        this.logger.log(VCF_ANALYZE_EVENT)
    }

    @Post('test')
    async test(@Body() data: any) {
        let analysis = data.analysis;
        let vcfFile = data.vcfFile
        let vepOutput = this.annovarService.getVepOutput(analysis)

        await this.vcfService.run(vcfFile, analysis, vepOutput);

        return { success: true }

    }

    
    @EventPattern(VCF_ANALYZE_EVENT)
    async getVcfAnalysis(@Payload() data: AnalysisModel, @Ctx() context: RmqContext) {
        try {
            if (this.globalService.isAnalyzing) {
                this.rmqService.nack(context);
                return;
            }

            this.globalService.isAnalyzing = true;

            this.rmqService.ack(context)

            await this.communicationService.updateSampleStatusStatus(AnalysisStatus.VCF_ANALYZING ,data.id)

            await this.vcfAnalyzerService.analyze(data)

            await this.communicationService.updateSampleStatusStatus(AnalysisStatus.IMPORT_QUEUING, data.id)

            this.globalService.isAnalyzing = false;

        } catch (error) {
            this.globalService.isAnalyzing = false;

            if (!error.stack || error.stack != 'vcf') {
                this.logger.error(error)
                await this.communicationService.updateSampleStatusStatus(AnalysisStatus.ERROR, data.id)
            } else {
                console.log('Analysis Syncrhonzing')
                await this.communicationService.updateSampleStatusStatus(AnalysisStatus.VCF_QUEUING, data.id)
            }
        }
    }
}
