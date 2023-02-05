import { Analysis } from "@app/prisma";
import { Injectable } from "@nestjs/common";
import { ANALYSES_FOLDER } from "../constants";

@Injectable({})
export class CommonService {

    buildVcfFullPath(analysis: Analysis) {
        return `${ANALYSES_FOLDER}/${analysis.id}/${analysis.vcfFilePath}`
    }

    buildUrlQuery(data: { [key: string]: string }): string {
        return Object.entries(data)
            .map(pair => pair.map(encodeURIComponent).join('='))
            .join('&');
    }

}