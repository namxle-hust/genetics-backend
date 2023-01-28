import { RmqService, VCF_ANALYZE_EVENT } from '@app/common';
import { AnalysisStatus } from '@app/prisma';
import { Body, Controller, Get, Logger, Post } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { AnalysisModel } from './models';
import { AnnovarService, CommunicationService, VcfService } from './services';
import { VcfAnalyzerService } from './vcf-analyzer.service';

@Controller('vcf')
export class VcfAnalyzerController {
    private readonly logger = new Logger(VcfAnalyzerController.name)

    constructor(
        private readonly vcfAnalyzerService: VcfAnalyzerService,
        private readonly rmqService: RmqService,
        private readonly communicationService: CommunicationService,
        private readonly annovarService: AnnovarService,
        private readonly vcfService: VcfService
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

            let isInstanceRunning = await this.vcfAnalyzerService.checkInstanceStatus();

            if (isInstanceRunning) {
                this.logger.log('Instance is running!')
                this.vcfAnalyzerService.updateInstanceStatus()
                process.exit(1);
            }

            await this.communicationService.updateSampleStatusStatus(AnalysisStatus.VCF_ANALYZING ,data.id)

            await this.vcfAnalyzerService.analyze(data)

            this.rmqService.ack(context)

            await this.communicationService.updateSampleStatusStatus(AnalysisStatus.IMPORT_QUEUING, data.id)

            await this.vcfAnalyzerService.updateInstanceStatus()

        } catch (error) {
            
            if (!error.stack || error.stack != 'vcf') {
                this.logger.error(error)
                await this.communicationService.updateSampleStatusStatus(AnalysisStatus.ERROR, data.id)
                this.rmqService.ack(context)
            } else {
                console.log('Requeue')
                this.rmqService.nack(context)
            }
           
            await this.vcfAnalyzerService.updateInstanceStatus()
        }
    }
}
