import { AnalysisStatus, VcfType } from '@app/prisma';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnalysisModel } from '../models';
import { AnalyzeService, CommunicationService } from '../services';
import { CommonService } from './common.service';
import { VcfService } from './vcf.service';

@Injectable({})
export class FastqAnalyzingService {


    private s3UploadFolder;

    private readonly logger = new Logger(FastqAnalyzingService.name)

    constructor(
        private configService: ConfigService,
        private commonService: CommonService,
        private analyzeService: AnalyzeService,
        private communicationService: CommunicationService,
        private vcfService: VcfService
    ) {
        this.s3UploadFolder = this.configService.get<string>('S3_UPLOAD_FOLDER')
    }

    async analyzeFastq(analysis: AnalysisModel) {
        this.logger.log('Analyzing')
        this.logger.log(analysis)

        await this.communicationService.updateSampleStatusStatus(AnalysisStatus.FASTQ_ANALYZING, analysis.id)

        // Create folder
        await this.commonService.runCommand(`mkdir -p ${this.commonService.getAnalysisDestinationFolder(analysis) }`)

        // Download Fastq for analyzing
        await this.downloadFastQFiles(analysis);

        // Analyze
        if (analysis.vcfType == VcfType.WES) {
            await this.analyzeService.analyzeWES(analysis)
        } else {
            await this.analyzeService.analyzeWGS(analysis)
        }

        await this.vcfService.uploadVcfFiles(analysis);

        this.logger.log('FASTQ Analyzed!')

        await this.communicationService.updateSampleStatusStatus(AnalysisStatus.VCF_QUEUING, analysis.id)

        this.logger.log(`Done ${analysis.id}`);
    }


    async downloadFastQFiles(analysis: AnalysisModel) {
        this.logger.log('Downloading Fastq Files')
        const files = analysis.sample.files;

        const destinationFolder = this.commonService.getAnalysisDestinationFolder(analysis)

        let downloadCommands = files.map(file => {
            return this.commonService.getDownloadCmd(`${this.s3UploadFolder}/${file.uploadedName}`, destinationFolder);
        })

        let command = downloadCommands.join(' && ');

        await this.commonService.runCommand(command);
    }
}
