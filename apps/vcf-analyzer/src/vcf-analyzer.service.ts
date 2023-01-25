import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommonService } from './services/common.service';
import { AnalysisModel } from './models';
import { AnnovarService } from './services';
import { FASTQ_OUTPUT_VCF, INTERSECT_BED_CMD, VCF_APPLIED_BED, VCF_BGZIP_CMD, VCF_FILE, VCF_INPUT_NO_ZIP, VCF_INPUT_ZIP, VCF_MODIFIED_FILE, VCF_ORIGINAL_NO_ZIP_FILE, VCF_ORIGINAL_ZIP_FILE, VCF_SORT_CMD, VCF_TABIX_CMD } from '@app/common';
import { SampleType } from '@app/prisma';
import * as fs from 'fs'

@Injectable()
export class VcfAnalyzerService {

    private defaultBedFile: string;

    private inputVcf: string 

    private analysisFolder: string

    private uploadFolder: string

    private vcfModified: string
    private vcfBed: string;
    private vcfOriginal: string
    private vcfFile: string

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

        this.vcfBed = `${this.analysisFolder}/${VCF_APPLIED_BED}`
        this.vcfModified = `${this.analysisFolder}/${VCF_MODIFIED_FILE}`
        this.vcfFile = `${this.analysisFolder}/${VCF_FILE}`

        await this.preprocess();

        await this.applyBedFile();

        await this.prepareFile();


        
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
                this.vcfOriginal = `${this.analysisFolder}/${VCF_ORIGINAL_ZIP_FILE}`
            } else {
                this.isGZ = false;
                this.inputVcf = `${this.analysisFolder}/${VCF_INPUT_NO_ZIP}`
                this.vcfOriginal = `${this.analysisFolder}/${VCF_ORIGINAL_NO_ZIP_FILE}`
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
            zipFileCommand = `bgzip -f ${this.vcfFile}`
        }

        let commands = [
            `${INTERSECT_BED_CMD} ${options.join(' ')}`,
            `grep -v "0/0" > ${this.inputVcf}.body`,
            `less ${this.inputVcf} | awk '{if (index($0, "#") == 1) print $0}' > ${this.inputVcf}.header`,
            `cat ${this.inputVcf}.header ${this.inputVcf}.body > ${this.vcfFile}`,
            zipFileCommand
        ]

        let command = commands.join(' && ');

        this.commonService.runCommand(command);

    }


    async prepareFile() {
        // Prepare File
        if (this.isGZ) {
            await this.prepareZipFile()
        } else {
            await this.prepareNormalFile()
        }

    }

    async prepareZipFile() {
        let copyOriginalFileCmd = ''

        if (fs.existsSync(this.vcfOriginal)) {
            copyOriginalFileCmd = 'ls';
        } else {
            copyOriginalFileCmd = `cp ${this.inputVcf} ${this.vcfOriginal}`;
        }

        let sortCmd = `${VCF_SORT_CMD} -c ${this.vcfOriginal} > ${this.vcfFile}`
        let bgzipCmd = `${VCF_BGZIP_CMD} -f ${this.vcfFile}`
        let tabixCmd = `${VCF_TABIX_CMD} -f ${this.vcfFile}.gz`

        let commands = [
            copyOriginalFileCmd,
            sortCmd,
            bgzipCmd,
            tabixCmd
        ]

        let command = commands.join(' && ')

        await this.commonService.runCommand(command)

        await this.annovarService.validateVcf(this.vcfFile)

        await this.annovarService.cleanVcf(this.vcfFile, this.vcfModified)
    }

    async prepareNormalFile() {
        let copyOriginalFileCmd = ''

        if (fs.existsSync(this.vcfOriginal)) {
            copyOriginalFileCmd = 'ls';
        } else {
            copyOriginalFileCmd = `cp ${this.inputVcf} ${this.vcfOriginal}`;
        }

        let sortCmd = `${VCF_SORT_CMD} -c ${this.vcfOriginal} > ${this.vcfFile}`

        await this.commonService.runCommand(sortCmd);

        await this.annovarService.validateVcf(this.vcfFile)

        await this.annovarService.cleanVcf(this.vcfFile, this.vcfModified);

        let bgzipCmd = `${VCF_BGZIP_CMD} -f ${this.vcfFile}`
        let tabixCmd = `${VCF_TABIX_CMD} -f ${this.vcfFile}.gz`

        let commands = [
            bgzipCmd,
            tabixCmd
        ]

        let command = commands.join(' && ')

        await this.commonService.runCommand(command)
    }
}
