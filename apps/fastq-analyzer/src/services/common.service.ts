import { Global, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as child from 'child_process';
import { AnalysisModel } from "../models";

@Injectable()
export class CommonService {
    constructor(private configService: ConfigService) {

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

    getAnalysisDestinationFolder(analysis: AnalysisModel): string {
        const AnalysisFolder = this.configService.get<string>('ANALYSIS_FOLDER')
        return `${AnalysisFolder}/${analysis.id}`
        return ''
    }
}
