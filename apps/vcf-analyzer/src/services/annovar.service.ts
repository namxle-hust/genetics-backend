import { VCF_INPUT } from "@app/common";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommonService } from "apps/fastq-analyzer/src/services/common.service";
import { AnalysisModel } from "../models";

@Injectable()
export class AnnovarService {

    private vcfFile: string = VCF_INPUT

    private analysisFolder: string;
    
    private defaultBedFile: string;

    constructor(
        private readonly commonService: CommonService,
        private readonly configService: ConfigService
    ) {
        this.defaultBedFile = this.configService.get<string>('DEFAULT_BED');
    }


    
    async getRowCount(analysis: AnalysisModel) {
        this.analysisFolder = this.commonService.getAnalysisDestinationFolder(analysis);

        let command = `less ${this.analysisFolder}/${this.vcfFile} | awk -F"\t" '{ if (index($0, "#") != 1) { split($5,a,","); col8 = $8; for (i in a){ $5=a[i]; $8=col8";VARINDEX="i; print }  }}' | wc -l`

        let count = await this.commonService.runCommand(command);

        return parseInt(count);
    }
}