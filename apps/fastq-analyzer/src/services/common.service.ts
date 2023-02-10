import { Global, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as child from 'child_process';
import { AnalysisModel } from "../models";

@Injectable()
export class CommonService {
    private readonly logger = new Logger(CommonService.name)

    private s3Bucket: string;
    private s3Folder: string
    private s3Profile: string

    constructor(private configService: ConfigService) {
        this.s3Bucket = this.configService.get<string>('S3_BUCKET')
        this.s3Profile = this.configService.get<string>('S3_PROFILE')
        this.s3Folder = this.configService.get<string>('S3_FAKE_FOLDER')
    }

    async runCommand(command: string): Promise<any> {
        this.logger.log(command)
        return new Promise((resolve, reject) => {
            child.exec(command, { maxBuffer: 1024 * 500 }, (error, stdout, stderr) => {
                if (error) {
                    return reject(error)
                }
                return resolve(true);
            });
        })
    }

    getTbiFile(destination: string) {
        return `${destination}.tbi`
    }

    getUploadCmd(source, destination) {
        return `cp ${source} ${this.s3Folder}/${destination}`
    }

    getDownloadCmd(source, destination) {
        return `cp ${this.s3Folder}/${source} ${destination}`
    }

    getAnalysisDestinationFolder(analysis: AnalysisModel): string {
        const AnalysisFolder = this.configService.get<string>('ANALYSIS_FOLDER')
        return `${AnalysisFolder}/${analysis.id}`
    }
}
