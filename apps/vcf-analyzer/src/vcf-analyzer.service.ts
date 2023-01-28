import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommonService } from './services/common.service';
import { AnalysisModel } from './models';
import { AnnovarService, VcfService } from './services';
import { FASTQ_OUTPUT_VCF, INTERSECT_BED_CMD, VCF_APPLIED_BED, VCF_BGZIP_CMD, VCF_FILE, VCF_MODIFIED_FILE, VCF_ORIGINAL_FILE, VCF_ORIGINAL_COMPRESSED_FILE, VCF_SORT_CMD, VCF_TABIX_CMD, FASTQ_OUTPUT_VCF_COMPRESSED, ANALYZING_FILE } from '@app/common';
import { SampleType, VcfType } from '@app/prisma';
import * as fs from 'fs'

@Injectable()
export class VcfAnalyzerService {

    private defaultBedFile: string;

    private analysisFolder: string

    private uploadFolder: string


    private vcfModified: string
    private vcfOriginal: string
    private vcfBed: string
    private vcfFile: string
    private vepOutput: string
    private vepInput: string

    private analysis: AnalysisModel

    private isGZ: boolean = false;

    constructor(
        private readonly annovarService: AnnovarService,
        private readonly commonService: CommonService,
        private readonly configService: ConfigService,
        private readonly vcfService: VcfService
    ) {
        this.defaultBedFile = this.configService.get<string>('DEFAULT_BED');
        this.uploadFolder = this.configService.get<string>('')

    }

    async checkInstanceStatus() {
        let instanceStatusFile = this.configService.get<string>('INSTANCE_STATUS_FILE');

        if (fs.existsSync(instanceStatusFile)) {
            return true
        }

        await this.commonService.runCommand(`touch ${instanceStatusFile}`);

        return false;
    }

    // async checkAnalysisStatus(analysis: AnalysisModel): Promise<boolean> {
    //     let analysisFolder = this.commonService.getAnalysisFolder(analysis);

    //     let path = `${analysisFolder}/${ANALYZING_FILE}`

    //     if (fs.existsSync(path)) {
    //         return true;
    //     }

    //     await this.commonService.runCommand(`touch ${path}`);

    //     return false;
    // }

    async updateInstanceStatus() {
        let instanceStatusFile = this.configService.get<string>('INSTANCE_STATUS_FILE');

        if (fs.existsSync(instanceStatusFile)) {
            await this.commonService.runCommand(`rm ${instanceStatusFile}`);
        }

    }

    // async updateAnalysisStatus(analysis: AnalysisModel) {
    //     let analysisFolder = this.commonService.getAnalysisFolder(analysis);

    //     let path = `${analysisFolder}/${ANALYZING_FILE}`

    //     if (fs.existsSync(path)) {
    //         await this.commonService.runCommand(`rm ${path}`);
    //     }
    // }

    async analyze(analysis: AnalysisModel) {
        this.analysisFolder = this.commonService.getAnalysisFolder(analysis);
        this.analysis = analysis;

        this.vcfBed = `${this.analysisFolder}/${VCF_APPLIED_BED}`
        this.vcfFile = `${this.analysisFolder}/${VCF_FILE}`
        this.vcfModified = `${this.analysisFolder}/${VCF_MODIFIED_FILE}`
        this.vepOutput = this.annovarService.getVepOutput(analysis)
       

        await this.preprocess();

        await this.fomatVcfFile();

        await this.applyBedFile();

        await this.prepareFile();

        await this.annovarService.runVEP(this.vepInput ,this.vepOutput)
        
    }

    async preprocess() {
        let uploadPath;

        if (this.analysis.sample.type == SampleType.FASTQ) {
            if (this.analysis.vcfType == VcfType.WES) {
                this.isGZ = false
                uploadPath = `${this.analysisFolder}/${FASTQ_OUTPUT_VCF}`
            } else {
                this.isGZ = true
                uploadPath = `${this.analysisFolder}/${FASTQ_OUTPUT_VCF_COMPRESSED}`
            }


        } else {
            // Get only first element because vcf only allow upload 1 file
            uploadPath = `${this.uploadFolder}/${this.analysis.sample.files[0].uploadedName}`

            // Check if it is vcf.gz file
            this.isGZ = uploadPath.indexOf('vcf.gz') != -1 ? true : false

        }

        if (!fs.existsSync(uploadPath)) {
            let error = this.commonService.customError('Synchronizing');
            throw error;
        }

        this.vcfOriginal = `${this.analysisFolder}/${this.isGZ ? VCF_ORIGINAL_COMPRESSED_FILE : VCF_ORIGINAL_FILE}`

        let command = `cp ${uploadPath} ${this.vcfOriginal}`

        await this.commonService.runCommand(command);
    }

    async fomatVcfFile() {
        let zipFileCommand = 'ls'

        if (this.isGZ) {
            zipFileCommand = `bgzip -f ${this.vcfFile}`
        }

        let commands = [
            `less ${this.vcfOriginal} | awk 'BEGIN{OFS="\t"} { if(index($0, "#") == 1) {print $0;} else { if( $9== "GT:GQ:AD:DP:VF:NL:SB:NC:US") {} else { split($1,a,"chr"); if(a[2] != NULL ) { $1 = a[2];}; print $0;} } }' > ${this.vcfFile}`,
            zipFileCommand
        ]

        let command = commands.join(' && ');

        await this.commonService.runCommand(command);

    }

    async applyBedFile() {

        let count = await this.annovarService.getRowCount(this.vcfOriginal);

        let options = [
            `-b ${this.defaultBedFile}`,
            `-a ${this.isGZ ? `${this.vcfFile}.gz` : this.vcfFile}`
        ]

        let zipFileCommand = 'ls'

        if (this.isGZ) {
            zipFileCommand = `${VCF_BGZIP_CMD} -f ${this.vcfBed}`
        }

        let commands = [
            `${INTERSECT_BED_CMD} ${options.join(' ')} | grep -v "0/0" > ${this.vcfFile}.body`,
            `less ${this.vcfFile} | awk '{if (index($0, "#") == 1) print $0}' > ${this.vcfFile}.header`,
            `cat ${this.vcfFile}.header ${this.vcfFile}.body > ${this.vcfBed}`,
            zipFileCommand
        ]

        let command = commands.filter(cmd => cmd).join(' && ');

        await this.commonService.runCommand(command);

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
        let sortCmd = `${VCF_SORT_CMD} -c ${this.vcfBed}.gz > ${this.vcfFile}`
        let bgzipCmd = `${VCF_BGZIP_CMD} -f ${this.vcfFile}`
        let tabixCmd = `${VCF_TABIX_CMD} -f ${this.vcfFile}.gz`

        this.vepInput = `${this.vcfFile}.gz`

        let commands = [
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
        let sortCmd = `${VCF_SORT_CMD} -c ${this.vcfBed} > ${this.vcfFile}`

        this.vepInput = this.vcfFile

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
