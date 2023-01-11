import { Analysis, VcfType } from '@app/prisma';
import { Inject, Injectable, Logger } from '@nestjs/common';
import * as child from 'child_process';
import { ConfigService } from '@nestjs/config';
import { AnalysisModel } from './analysis.model';

@Injectable()
export class FastqAnalyzingService {

    protected S3_BUCKET;
    protected S3_UPLOAD_FOLDER;
    protected ANALYSIS_FOLDER;
    protected S3_PROFILE;

    private readonly logger = new Logger(FastqAnalyzingService.name)
    
    constructor(private configService: ConfigService){
        this.S3_BUCKET = this.configService.get<string>('S3_BUCKET')
        this.S3_UPLOAD_FOLDER = this.configService.get<string>('S3_UPLOAD_FOLDER')
        this.ANALYSIS_FOLDER = this.configService.get<string>('ANALYSIS_FOLDER')
        this.S3_PROFILE = this.configService.get<string>('S3_PROFILE')

    }

    async analyzeFastq(analysis: AnalysisModel) {
        this.logger.log('Analyzing')
        this.logger.log(analysis)

        // Create folder
        await this.runCommand(`mkdir -p ${this.ANALYSIS_FOLDER}/${analysis.id}`)

        // Download Fastq for analyzing
        await this.downloadFastQFiles(analysis);

        // Analyze
        if (analysis.vcfType == VcfType.WES) {
            await this.analyzeWES()
        } else {
            await this.analyzeWGS()
        }

        await new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(true);
            }, 50000)
        })

        this.logger.log(`Done ${analysis.id}`);
    }


    async downloadFastQFiles(analysis: AnalysisModel) {
        const files = analysis.sample.files;
        const s3FolderPath = `s3://${this.S3_BUCKET}/${this.S3_UPLOAD_FOLDER}`
        const destinationFolder = `${this.ANALYSIS_FOLDER}/${analysis.id}`

        let downloadCommands = files.map(file => {
            return `aws s3 cp ${s3FolderPath}/${file.uploadedName} ${destinationFolder}/ --profile ${this.S3_PROFILE}`
        })

        let command = downloadCommands.join(' && ');

        await this.runCommand(command);
    }

    async analyzeWES() {
        this.logger.log('Analyze WES')
    }
    
    async analyzeWGS() {
        this.logger.log('Analyze WGS')

    }

    async runCommand(command): Promise<any> {
        return new Promise((resolve, reject) => {
            child.exec(command, (error, stdout, stderr) => {
                if (error) {
                    return reject(error)
                }
                return resolve(true);
            });
        })
    }


    getHello(): string {
        return 'Hello World!';
    }
}
