import { Injectable, Logger } from "@nestjs/common";
import * as child from 'child_process';

@Injectable()
export class CommonService {
    private readonly logger = new Logger(CommonService.name)

    constructor() {

    }

    async runCommand(command: string): Promise<string> {
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
}