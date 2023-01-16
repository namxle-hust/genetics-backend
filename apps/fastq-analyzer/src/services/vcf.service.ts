import { Injectable } from "@nestjs/common";
import * as fs from 'fs';
import * as es from 'event-stream'
import { CommonService } from "./common.service";
import { AnalysisModel } from "../models";
import { ConfigService } from "@nestjs/config";
import { FASTQ_OUTPUT_VCF } from "@app/common";

@Injectable()
export class VcfService {

    VcfStream: any;

    private s3AnalysesFolder: string
    private vcfOutput = FASTQ_OUTPUT_VCF


    constructor(private commonService: CommonService, private configService: ConfigService) {
        this.s3AnalysesFolder = this.configService.get<string>('S3_ANALYSES_FOLDER')
    }

    async uploadVcfFiles(analysis: AnalysisModel) {
        const destinationFolder = `s3://${this.s3Bucket}/${this.s3AnalysesFolder}/`
        let analysisFolder = this.commonService.getAnalysisDestinationFolder(analysis);
        
        let uploadVcfCmd = `aws s3 cp ${analysisFolder}/${this.vcfOutput} ${destinationFolder}`
        let uploadTbiCmd = `aws s3 cp ${this.commonService.getTbiFile(`${analysisFolder}/${this.vcfOutput}`)} ${destinationFolder}`

        let commands = [
            uploadVcfCmd,
            uploadTbiCmd
        ]

        let command = commands.join(' && ')

        this.commonService.runCommand(command);
    }

    async archiveOutput(source: string, analysis: AnalysisModel) {
        let analysisFolder = this.commonService.getAnalysisDestinationFolder(analysis);
        let destination = `${analysisFolder}/${this.vcfOutput}`

        let bgzipCommand = `bgzip -c ${source} > ${destination}`
        let tabixCommand = `tabix -f ${destination}`

        let commands = [
            bgzipCommand,
            tabixCommand
        ]

        let command = commands.join(" && ");

        await this.commonService.runCommand(command);
    }

    async removeLowQuality(vcfFile: string, output: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.VcfStream = fs.createReadStream(vcfFile)
                .pipe(es.split())
                .pipe(es.mapSync((line) => {
                    this.VcfStream.pause()

                    if (!this.VcfStream.passedHeading) {

                        if (line.search('#CHROM') == 0) {
                            this.VcfStream.passedHeading = true
                            this.VcfStream.headings = line.split('\t')
                        }

                        fs.appendFileSync(output, line + '\n')

                        this.VcfStream.resume()
                    } else {
                        if (line) {
                            fs.appendFileSync(output, line + '\n')
                            this.VcfStream.resume()
                        } else {
                            return this.VcfStream.resume()
                        }
                    }
                }))
                .on('error', (error) => {
                    console.log('Error Filter vcf', error)
                    return resolve(false);
                })
                .on('end', () => {
                    console.log('End Filter vcf')
                    return resolve(true);
                })
        })
    }

}