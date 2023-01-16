import { AnalysisStatus, VcfType } from '@app/prisma';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnalysisModel } from '../models';
import { AnalyzeService, CommunicationService } from '../services';
import { CommonService } from './common.service';

@Injectable({})
export class FastqAnalyzingService {

    protected S3_BUCKET;
    protected S3_UPLOAD_FOLDER;
    protected S3_PROFILE;
    protected ANALYSIS_FOLDER;

    private readonly logger = new Logger(FastqAnalyzingService.name)

    constructor(
        private configService: ConfigService,
        private commonService: CommonService,
        private analyzeService: AnalyzeService,
        private communicationService: CommunicationService
    ) {
        this.S3_BUCKET = this.configService.get<string>('S3_BUCKET')
        this.S3_UPLOAD_FOLDER = this.configService.get<string>('S3_UPLOAD_FOLDER')
        this.ANALYSIS_FOLDER = this.configService.get<string>('ANALYSIS_FOLDER')
        this.S3_PROFILE = this.configService.get<string>('S3_PROFILE')

    }

    async analyzeFastq(analysis: AnalysisModel) {
        this.logger.log('Analyzing')
        this.logger.log(analysis)

        await this.communicationService.updateSampleStatusStatus(AnalysisStatus.FASTQ_ANALYZING, analysis.id)

        // Create folder
        await this.createAnalysisFolder(analysis.id)

        // Download Fastq for analyzing
        await this.downloadFastQFiles(analysis);

        // Analyze
        if (analysis.vcfType == VcfType.WES) {
            await this.analyzeService.analyzeWES(analysis)
        } else {
            await this.analyzeService.analyzeWGS(analysis)
        }

        this.logger.log('FASTQ Analyzed!')

        await this.communicationService.updateSampleStatusStatus(AnalysisStatus.VCF_QUEUING, analysis.id)

        // Create some fake delay
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(true);
            }, 50000)
        })

        this.logger.log(`Done ${analysis.id}`);
    }

    async createAnalysisFolder(id) {
        await this.commonService.runCommand(`mkdir -p ${this.ANALYSIS_FOLDER}/${id}`)
    }


    async downloadFastQFiles(analysis: AnalysisModel) {
        this.logger.log('Downloading Fastq Files')
        const files = analysis.sample.files;
        const s3FolderPath = `s3://${this.S3_BUCKET}/${this.S3_UPLOAD_FOLDER}`
        const destinationFolder = this.commonService.getAnalysisDestinationFolder(analysis)

        let downloadCommands = files.map(file => {
            return `aws s3 cp ${s3FolderPath}/${file.uploadedName} ${destinationFolder}/ --profile ${this.S3_PROFILE}`
        })

        let command = downloadCommands.join(' && ');

        await this.commonService.runCommand(command);
    }
}
