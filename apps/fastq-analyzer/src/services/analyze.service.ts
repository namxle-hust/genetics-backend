import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from 'fs';
import { AnalysisModel } from "../models";
import { VcfService } from "../services/vcf.service";
import { CommonService } from "./common.service";

@Injectable()
export class AnalyzeService {

    private readonly logger = new Logger(AnalyzeService.name)

    private vcfOutputName: string = 'output.vcf.gz';
    private vcfOutputPath: string;

    private vcfOutputTmp: string;

    private analysisFolder: string;

    private removeDuplicate: string = 'YES'
    private sentieonScript: string;

    constructor(
        private commonService: CommonService,
        private configService: ConfigService,
        private vcfService: VcfService
    ) { }

    async analyzeWES(analysis: AnalysisModel) {
        this.analysisFolder = this.commonService.getAnalysisDestinationFolder(analysis)

        this.vcfOutputPath = `${this.analysisFolder}/${this.vcfOutputName}`;

        this.vcfOutputTmp = `${this.analysisFolder}/output-merged-tmp.vcf`

        this.sentieonScript = this.configService.get<string>('WES_SENTIEON');

        const vcfHcFilterOuput = `${this.analysisFolder}/output-hc-filter.vcf`;

        await this.runSentieonWES(analysis);

        await this.vcfService.removeLowQuality(this.vcfOutputTmp, vcfHcFilterOuput)

        return true;

    }

    async runSentieonWES(analysis: AnalysisModel) {
        const IntervalFile = this.configService.get<String>('INTERVAR_FILE')

        const VcfHcOutput = `output-hc.vcf.gz`

        const VcfOutputMerged = 'output-merged.vcf';

        const files = analysis.sample.files;

        const SampleName = analysis.name.replace(' ', '_');

        const R1Fastq = `${this.analysisFolder}/${files[0].uploadedName}`
        const R2Fastq = `${this.analysisFolder}/${files[0].uploadedName}`

        const changeDirCommand = `cd ${this.analysisFolder}`

        const mergeVCFCommand = `less ${VcfOutputMerged} | awk -F"\t" 'BEGIN{OFS="\t"}{if (index($1, "#") == 1) {print} else { if ($10 !="./.") { print $0 } else { $10 = $11; print $0;}}}' > ${this.vcfOutputTmp}`

        const sentieonCommand = `${this.sentieonScript} ${R1Fastq} ${R2Fastq} ${SampleName} ${IntervalFile} ${this.removeDuplicate}`

        const listCommands = [
            changeDirCommand,
            sentieonCommand,
            mergeVCFCommand
        ]

        const cmd = listCommands.join(' && ');

        await this.commonService.runCommand(cmd);

        if (!fs.existsSync(`${this.analysisFolder}/${VcfHcOutput}`)) {
            throw new Error('Run Sentieon Error!');
        }
    }

    async runSentieonWGS(analysis: AnalysisModel) {
        
    }

    async analyzeWGS(analysis: AnalysisModel) {

    }
}