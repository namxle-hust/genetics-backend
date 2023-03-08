import { Injectable, Logger } from "@nestjs/common";
import * as fs from 'fs';
import * as es from 'event-stream'
import { CommonService } from "./common.service";
import { AnalysisModel } from "../models";
import { ConfigService } from "@nestjs/config";
import { FASTQ_OUTPUT_VCF, FASTQ_OUTPUT_VCF_COMPRESSED } from "@app/common";
import { VcfType } from "@app/prisma";

@Injectable()
export class VcfService {

    private readonly logger = new Logger(VcfService.name)

    private s3Bucket: string
    private s3AnalysesFolder: string
    private s3Folder: string;
    private vcfOutput = FASTQ_OUTPUT_VCF
    private vcfOutputCompressed = FASTQ_OUTPUT_VCF_COMPRESSED


    constructor(private commonService: CommonService, private configService: ConfigService) {
        this.s3AnalysesFolder = this.configService.get<string>('S3_ANALYSES_FOLDER')
        this.s3Bucket = this.configService.get<string>('S3_BUCKET');
        this.s3Folder = this.configService.get<string>('S3_FAKE_FOLDER')
    }

    async uploadVcfFiles(analysis: AnalysisModel) {
        let analysisFolder = this.commonService.getAnalysisDestinationFolder(analysis);
        
        let output = analysis.vcfType == VcfType.WES ? this.vcfOutput : this.vcfOutputCompressed

        let vcfFilePath = `${analysisFolder}/${output}`

        let createFolderCmd = `mkdir -p ${this.s3Folder}/${this.s3AnalysesFolder}/${analysis.id}`

        let uploadVcfCmd = this.commonService.getUploadCmd(vcfFilePath, `${this.s3AnalysesFolder}/${analysis.id}/${output}`)
        
        let commands = [
            createFolderCmd,
            uploadVcfCmd
        ]

        let command = commands.join(' && ')

        await this.commonService.runCommand(command);
    }

    async renameOutputWES(source: string, analysis: AnalysisModel) {
        let analysisFolder = this.commonService.getAnalysisDestinationFolder(analysis);
        let destination = `${analysisFolder}/${this.vcfOutput}`

        let renameCommand = `cp ${source} ${destination}`;

        await this.commonService.runCommand(renameCommand);
    }

    async renameOutput(source: string, analysis: AnalysisModel) {
        let analysisFolder = this.commonService.getAnalysisDestinationFolder(analysis);
        let destination = `${analysisFolder}/${this.vcfOutputCompressed}`

        let renameCommand = `cp ${source} ${destination}`;
        let tabixCommand = `tabix -f ${destination}`;

        let commands = [
            renameCommand,
            tabixCommand
        ]

        let command = commands.join(" && ");

        await this.commonService.runCommand(command);
    }

    async removeLowQuality(vcfFile: string, output: string): Promise<boolean> {
        let VcfStream;
        return new Promise((resolve, reject) => {
            VcfStream = fs.createReadStream(vcfFile)
                .pipe(es.split())
                .pipe(es.mapSync((line) => {
                    VcfStream.pause()

                    if (!VcfStream.passedHeading) {

                        if (line.search('#CHROM') == 0) {
                            VcfStream.passedHeading = true
                            VcfStream.headings = line.split('\t')
                        }

                        fs.appendFileSync(output, line + '\n')

                        VcfStream.resume()
                    } else {
                        if (line) {
                            fs.appendFileSync(output, line + '\n')
                            VcfStream.resume()
                        } else {
                            return VcfStream.resume()
                        }
                    }
                }))
                .on('error', (error) => {
                    this.logger.error('Error Filter vcf', error)
                    return resolve(false);
                })
                .on('end', () => {
                    this.logger.log('End Filter vcf')
                    return resolve(true);
                })
        })
    }

}