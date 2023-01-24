import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommonService } from './services/common.service';
import { AnalysisModel } from './models';
import { AnnovarService } from './services/annovar.service';
import { FASTQ_OUTPUT_VCF, INTERSECT_BED_CMD, VCF_APPLIED_BED, VCF_INPUT_NO_ZIP, VCF_INPUT_ZIP } from '@app/common';
import { SampleType, VcfType } from '@app/prisma';

@Injectable()
export class VcfAnalyzerService {

    private defaultBedFile: string;

    private inputVcf: string 

    private analysisFolder: string

    private uploadFolder: string

    private analysisBed: string;

    private analysis: AnalysisModel

    private isGZ: boolean = false;

    constructor(
        private readonly annovarService: AnnovarService,
        private readonly commonService: CommonService,
        private readonly configService: ConfigService
    ) {
        this.defaultBedFile = this.configService.get<string>('DEFAULT_BED');
        this.uploadFolder = this.configService.get<string>('')
       
    }

    async analyze(analysis: AnalysisModel) {
        this.analysisFolder = this.commonService.getAnalysisFolder(analysis);

        this.analysis = analysis;

        this.analysisBed = `${this.analysisFolder}/${VCF_APPLIED_BED}`

        await this.preprocess();

        await this.applyBedFile();
    }

    async preprocess() {
        let command = ''
        if (this.analysis.sample.type == SampleType.FASTQ) {
            command = `mv ${this.analysisFolder}/${FASTQ_OUTPUT_VCF} ${this.analysisFolder}/${VCF_INPUT_ZIP}`
        } else {
            // Get only first element because vcf only allow upload 1 file
            let uploadPath = `${this.uploadFolder}/${this.analysis.sample.files[0].uploadedName}`

            // Check if it is vcf.gz file
            if (uploadPath.indexOf('vcf.gz') != -1) {
                this.isGZ = true;
                this.inputVcf = `${this.analysisFolder}/${VCF_INPUT_ZIP}`
            } else {
                this.isGZ = false;
                this.inputVcf = `${this.analysisFolder}/${VCF_INPUT_NO_ZIP}`
            }

            command = `cp ${uploadPath} ${this.inputVcf}`  
        }

        await this.commonService.runCommand(command);
    }

    async applyBedFile() {
        
        let count = await this.annovarService.getRowCount(this.inputVcf);

        let options = [
            `-b ${this.defaultBedFile}`,
            `-a ${this.inputVcf}`
        ]

        let zipFileCommand = ''

        if (this.isGZ) {
            zipFileCommand = `bgzip -f ${this.analysisBed}`
        }

        let commands = [
            `${INTERSECT_BED_CMD} ${options.join(' ')}`,
            `grep -v "0/0" > ${this.inputVcf}.body`,
            `less ${this.inputVcf} | awk '{if (index($0, "#") == 1) print $0}' > ${this.inputVcf}.header`,
            `cat ${this.inputVcf}.header ${this.inputVcf}.body > ${this.analysisBed}`,
            zipFileCommand
        ]

        let command = commands.join(' && ');

        this.commonService.runCommand(command);

    }



}
