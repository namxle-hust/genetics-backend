import { Global, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as child from 'child_process';
import { AnalysisModel } from "../models";

@Injectable()
export class CommonService {
    private readonly logger = new Logger(CommonService.name)

    private tmpFolder: string;

    constructor(private configService: ConfigService) {
        this.tmpFolder = this.configService.get<string>('TMP_DIR')
    }

    async runCommand(command: string): Promise<any> {
        this.logger.log(command)
        return await new Promise((resolve, reject) => {
            child.exec(command, (error, stdout, stderr) => {
                if (error) {
                    this.logger.log(stderr);
                    return reject(error)
                } else {
                    return resolve(stdout);
                }
            });
        })
    }


    getTmpFolderFormat(analysis: AnalysisModel) {
        return `${this.tmpFolder}/analysis_${analysis.id}`
    }

    getAnalysisFolder(analysis: AnalysisModel) {
        let s3Dir = this.configService.get<string>('S3_DIR');
        let analysesFolder = this.configService.get<string>('S3_ANALYSES_FOLDER');
        
        return `${s3Dir}/${analysesFolder}/${analysis.id}`
    }

    customError(message: string): Error {
        let error = new Error(message);
        error.stack = 'vcf'

        return error;
    }

    escapeFileName(name) {
        let options = [
            [/"/g, '\\"'],
            [/\s/g, '\\ '],
            [/\(/g, '\\('],
            [/\)/g, '\\)']
        ]

        for (var key in options) {
            name = name.replace(options[key][0], options[key][1])
        }

        return name
    }
}
