import { FASTQ_ANALYZING, FASTQ_ANALYZE_EVENT, VCF_ANALYZING, VCF_ANALYZE_EVENT } from '@app/common';
import { Analysis, AnalysisStatus, NotFoundError } from '@app/prisma';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
import { lastValueFrom } from 'rxjs';
import { AnalysisRepository } from './analysis.repository';

@Injectable()
export class SamplesHandlerService {
    private readonly logger = new Logger(SamplesHandlerService.name)

    constructor(
        @Inject(FASTQ_ANALYZING) private fastqAnalyzeClient: ClientProxy,
        @Inject(VCF_ANALYZING) private vcfAnalyzeClient: ClientProxy,
        private analysisRepository: AnalysisRepository
    ) {

    }

    getHello(): string {
        return 'Hello World!';
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async getVcfPending() {
        // this.logger.debug('Called VCF Every 30 seconds');

        try {
            // Get Fastq Analysis
            const analysis: Analysis = await this.analysisRepository.getAnalysisByStatus(AnalysisStatus.VCF_QUEUING)
            this.logger.debug(analysis);
            
            // Send Fastq Sample to Analyze Queue
            await this.sendVcfToQueue(analysis)

            // Update sample to status queue and then send to rabitmq queue
            await this.analysisRepository.updateAnalysisStatus(analysis.id, AnalysisStatus.VCF_RABBITMQ_QUEUING)
        } catch (error) {
            if (error instanceof NotFoundError) {
                return;
            }
            console.log(error);
        }

    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async getFastqPending() {
        // this.logger.debug('Called FASTQ Every 30 seconds');

        try {
            // Get Fastq Analysis
            const analysis: Analysis = await this.analysisRepository.getAnalysisByStatus(AnalysisStatus.FASTQ_QUEUING)
            this.logger.debug(analysis);

            // Send Fastq Sample to Analyze Queue
            await this.sendFastqToQueue(analysis)

            // Update sample to status queue and then send to rabitmq queue
            await this.analysisRepository.updateAnalysisStatus(analysis.id, AnalysisStatus.FASTQ_RABBITMQ_QUEING)

          
        } catch (error) {
            if (error instanceof NotFoundError) {
                return;
            }
            console.log(error);
        }
       
    }

    async sendFastqToQueue(analysis: Analysis) {
        try {
            await lastValueFrom(this.fastqAnalyzeClient.emit(FASTQ_ANALYZE_EVENT, analysis))
            return { status: 'success' }
        } catch (error) {
            throw error
        }
    }


    async sendVcfToQueue(analysis: Analysis) {
        try {
            await lastValueFrom(this.vcfAnalyzeClient.emit(VCF_ANALYZE_EVENT, analysis))
            return { status: 'success' }
        } catch (error) {
            throw error
        }
    }
}
