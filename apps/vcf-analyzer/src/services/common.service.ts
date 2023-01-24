import { Global, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as child from 'child_process';
import { AnalysisModel } from "../models";

@Injectable()
export class CommonService {
    private readonly logger = new Logger(CommonService.name)


    constructor(private configService: ConfigService) {
    }

    async runCommand(command: string): Promise<any> {
        this.logger.log(command)
        return new Promise((resolve, reject) => {
            child.exec(command, (error, stdout, stderr) => {
                if (error) {
                    return reject(error)
                }
                return resolve(stdout);
            });
        })
    }

    getAnalysisFolder(analysis: AnalysisModel) {
        let s3Dir = this.configService.get<string>('S3_DIR');
        let analysesFolder = this.configService.get<string>('S3_ANALYSES_FOLDER');
        
        return `${s3Dir}/${analysesFolder}/${analysis.id}`
    }
}
