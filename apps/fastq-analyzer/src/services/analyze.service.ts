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

        this.logger.log('Run Sentieon')

        await this.runSentieonWES(analysis);

        await this.vcfService.removeLowQuality(this.vcfOutputTmp, vcfHcFilterOuput)

        return true;

    }

    async runSentieonWES(analysis: AnalysisModel) {
        const VcfHcOutput = `output-hc.vcf.gz`

        const VcfOutputMerged = 'output-merged.vcf';

        const IntervalFile = `${this.analysisFolder}/formated.bed`

        const gensetPath = this.configService.get<string>('DEFAULT_BED')
        const picardScript = this.configService.get<string>('PICARD_SCRIPT')
        const intervalSD = this.configService.get<string>('INTERVAL_SD')

        const formatBedCommand = `awk -F"\t" '{print $1"\t"$2"\t"$3"\t"$1"-"$2"-"$3}' ${gensetPath} > ${IntervalFile} && java -jar ${picardScript}  BedToIntervalList I=${IntervalFile} O=${IntervalFile}.interval SD=${intervalSD}`;

        const files = analysis.sample.files;

        const SampleName = analysis.name.replace(' ', '_');

        const R1Fastq = `${this.analysisFolder}/${files[0].uploadedName}`
        const R2Fastq = `${this.analysisFolder}/${files[0].uploadedName}`

        const changeDirCommand = `cd ${this.analysisFolder}`

        const mergeVCFCommand = `less ${VcfOutputMerged} | awk -F"\t" 'BEGIN{OFS="\t"}{if (index($1, "#") == 1) {print} else { if ($10 !="./.") { print $0 } else { $10 = $11; print $0;}}}' > ${this.vcfOutputTmp}`

        const sentieonCommand = `${this.sentieonScript} ${R1Fastq} ${R2Fastq} ${IntervalFile} ${SampleName} ${this.removeDuplicate}`

        const listCommands = [
            formatBedCommand,
            changeDirCommand,
            sentieonCommand,
            mergeVCFCommand
        ]

        const cmd = listCommands.join(' && ');

        this.logger.log(cmd)

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