import { Analysis } from "@app/prisma";
import { Injectable } from "@nestjs/common";
import { S3_SAMPLE_FOLDER } from "../constants";

@Injectable({})
export class CommonService {

    buildVcfFullPath(analysis: Analysis) {
        return `${S3_SAMPLE_FOLDER}/${analysis.id}/${analysis.vcfFilePath}`
    }

    buildUrlQuery(data: { [key: string]: string }): string {
        return Object.entries(data)
            .map(pair => pair.map(encodeURIComponent).join('='))
            .join('&');
    }

}