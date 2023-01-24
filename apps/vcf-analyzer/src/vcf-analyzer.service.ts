import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommonService } from './services/common.service';
import { AnalysisModel } from './models';
import { AnnovarService } from './services';
import { FASTQ_OUTPUT_VCF, INTERSECT_BED_CMD, VCF_APPLIED_BED, VCF_INPUT_NO_ZIP, VCF_INPUT_ZIP } from '@app/common';
import { SampleType, VcfType } from '@app/prisma';

@Injectable()
export class VcfAnalyzerService {

    private defaultBedFile: string;

    private inputVcf: string 

    private analysisFolder: string

    private uploadFolder: string

    private analysisBed: string = VCF_APPLIED_BED

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

        await this.preprocess();
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
                command = `cp ${uploadPath} ${VCF_INPUT_ZIP}`             
            } else {
                this.isGZ = false;
                command = `cp ${uploadPath} ${VCF_INPUT_NO_ZIP}`
            }
        }

        await this.commonService.runCommand(command);
    }

    async applyBedFile(analysis: AnalysisModel) {
        
        let count = await this.annovarService.getRowCount(analysis);

        let options = [
            `-b ${this.defaultBedFile}`,
            `-a ${this.inputVcf}`
        ]

        let commands = `${INTERSECT_BED_CMD} ${options.join(' ')} && grep -v "0/0" > `

        if (analysis.vcfType == VcfType.WGS) {
            commands
        }
    }



}
