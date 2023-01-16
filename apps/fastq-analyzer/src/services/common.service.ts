import { Global, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as child from 'child_process';
import { AnalysisModel } from "../models";

@Injectable()
export class CommonService {
    private readonly logger = new Logger(CommonService.name)

    private s3Bucket: string;
    private s3Profile: string

    constructor(private configService: ConfigService) {
        this.s3Bucket = this.configService.get<string>('S3_BUCKET')
        this.s3Profile = this.configService.get<string>('S3_PROFILE')
    }

    async runCommand(command: string): Promise<any> {
        this.logger.log(command)
        return new Promise((resolve, reject) => {
            child.exec(command, (error, stdout, stderr) => {
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
        return `aws s3 cp ${source} s3://${this.s3Bucket}/${destination} --profile ${this.s3Profile}`
    }

    getDownloadCmd(source, destination) {
        return `aws s3 cp s3://${this.s3Bucket}/${source} ${destination} --profile ${this.s3Profile}`
    }

    getAnalysisDestinationFolder(analysis: AnalysisModel): string {
        const AnalysisFolder = this.configService.get<string>('ANALYSIS_FOLDER')
        return `${AnalysisFolder}/${analysis.id}`
    }
}
