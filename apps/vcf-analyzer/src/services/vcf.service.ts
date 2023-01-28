import { Injectable } from "@nestjs/common";
import { AnalysisModel } from "../models";

@Injectable()
export class VcfService {
    private path = null
    private vcfFile = null
    private firstLine: boolean = true
    private vcfHGMDFile = null
    private originAnnoFile = null
    private annoFile = null
    private lineIndex = null
    private headings = null
    private currentAnno = {
        chrom: null,
        inputPos: null,
        transcript: null
    }
    private vcfStream = null
    private annoStream = null
    private genomicCount = 0
    private exonicCount = 0
    private checkAF: boolean = false

    constructor() {

    }

    async run(analysis: AnalysisModel, originAnnoFile: string) {
        this.path
    }
}