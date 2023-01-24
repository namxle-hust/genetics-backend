import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommonService } from "../services/common.service";
import { AnalysisModel } from "../models";

@Injectable()
export class AnnovarService {

    private vcfFile: string;

    private analysisFolder: string;
    
    private defaultBedFile: string;

    constructor(
        private readonly commonService: CommonService,
        private readonly configService: ConfigService
    ) {
        this.defaultBedFile = this.configService.get<string>('DEFAULT_BED');
    }

    async getRowCount(vcfFilePath: string) {
        let command = `less ${vcfFilePath} | awk -F"\t" '{ if (index($0, "#") != 1) { split($5,a,","); col8 = $8; for (i in a){ $5=a[i]; $8=col8";VARINDEX="i; print }  }}' | wc -l`

        let count = await this.commonService.runCommand(command);

        return parseInt(count);
    }
}