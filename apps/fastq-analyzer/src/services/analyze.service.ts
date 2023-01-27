import { FASTQ_OUTPUT_VCF } from "@app/common";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from 'fs';
import { AnalysisModel } from "../models";
import { VcfService } from "../services/vcf.service";
import { CommonService } from "./common.service";

@Injectable()
export class AnalyzeService {

    private readonly logger = new Logger(AnalyzeService.name)

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
        const filterOutput = `${this.analysisFolder}/output-hc-filter.vcf`;

        this.sentieonScript = this.configService.get<string>('WES_SENTIEON');

        this.logger.log('Run Sentieon')

        let tmpOutput = await this.runSentieonWES(analysis);

        await this.vcfService.removeLowQuality(tmpOutput, filterOutput)

        await this.vcfService.renameOutputWES(filterOutput, analysis)

        return true;

    }

    async runSentieonWES(analysis: AnalysisModel): Promise<string> {
        const tmpOutput = `${this.analysisFolder}/output-merged-tmp.vcf`;
        
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

        const mergeVCFCommand = `less ${VcfOutputMerged} | awk -F"\t" 'BEGIN{OFS="\t"}{if (index($1, "#") == 1) {print} else { if ($10 !="./.") { print $0 } else { $10 = $11; print $0;}}}' > ${tmpOutput}`

        const sentieonCommand = `${this.sentieonScript} ${R1Fastq} ${R2Fastq} ${IntervalFile} ${SampleName} ${this.removeDuplicate}`

        const listCommands = [
            formatBedCommand,
            changeDirCommand,
            sentieonCommand,
            mergeVCFCommand
        ]

        const cmd = listCommands.join(' && ');

        await this.commonService.runCommand(cmd);
        
        if (!fs.existsSync(`${this.analysisFolder}/${VcfHcOutput}`)) {
            throw new Error('Run Sentieon Error!');
        }

        return tmpOutput
    }

    async runSentieonWGS(analysis: AnalysisModel) {
        
        const files = analysis.sample.files;

        const R1Fastq = `${this.analysisFolder}/${files[0].uploadedName}`
        const R2Fastq = `${this.analysisFolder}/${files[0].uploadedName}`

        const SampleName = analysis.name.replace(' ', '_');

        const VcfHcOutput = 'vqsr_SNP_INDEL.hc.recaled.vcf.gz'

        const sentieonCommand = `${this.sentieonScript} ${R1Fastq} ${R2Fastq} ${SampleName}`

        this.commonService.runCommand(sentieonCommand);

        return `${this.analysisFolder}/${VcfHcOutput}`
    }

    async analyzeWGS(analysis: AnalysisModel) {
        this.analysisFolder = this.commonService.getAnalysisDestinationFolder(analysis)
        this.sentieonScript = this.configService.get<string>('WGS_SENTIEON');

        this.logger.log('Run Sentieon')

        let output = await this.runSentieonWGS(analysis);

        await this.vcfService.renameOutput(output, analysis);

        return true;   
    }
    
}