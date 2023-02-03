import { ANALYSIS_COLLECTION_PREFIX } from "@app/common/mongodb";
import { Service } from "@app/common/shared/service";
import { Analysis } from "@app/prisma";
import { Injectable } from "@nestjs/common";
import { IPgxData, IPgxReportData, IReportData } from "../models/report.model";
import { PgxRepository, VariantRepository } from "../repository";
import { VariantService } from "./variant.service";

@Injectable()
export class ReportService extends Service{
    constructor(
        private variantService: VariantService,
        private variantRepository: VariantRepository,
        private pgxRepository: PgxRepository
    ) {
        super()
    }

    async getReportData(analysisId: number): Promise<IReportData> {

        let pgxData: IPgxData[] = await this.getPgxData(analysisId);

        let categories = []
        let data: IPgxReportData[] = []

        for (let i in pgxData) {
            let item = pgxData[i];
            let annotationText = item.annotation_text.split('.,"').join('.","');

            let annotationArray = annotationText.split(',"');
            let annotationList = {}

            for (let k in annotationArray) {
                let anoItem = annotationArray[k].split('"').join('');
                annotationList[anoItem.split(":")[0]] = anoItem
            }

            if (categories.indexOf(item.drug_response_category) == -1) {
                categories.push(item.drug_response_category)
            }

            let drugs = item.related_chemicals.split(",")

            for (let j in drugs) {
                data.push({
                    chrom: item.chrom,
                    pos: item.pos,
                    ref: item.ref,
                    alt: item.alt,
                    af: item.af,
                    rsid: item.rsid,
                    drug: drugs[j].split('"').join('').trim(),
                    trade_name: '',
                    evidence: item.evidence,
                    drug_response_category: item.drug_response_category,
                    gene: item.gene,
                    variant: item.rsid,
                    genotype: '',
                    annotation_text: annotationList
                })
            }
        }

        let resultList: IPgxReportData[] = []

        for (let i in data) {
            let item = data[i]
            if (item.af >= 0.92) {
                resultList.push({
                    chrom: item.chrom,
                    pos: item.pos,
                    ref: item.ref,
                    alt: item.alt,
                    af: item.af,
                    drug: item.drug.split('(')[0],
                    rsid: item.rsid,
                    trade_name: item.trade_name,
                    evidence: item.evidence,
                    drug_response_category: item.drug_response_category,
                    gene: item.gene,
                    variant: item.variant,
                    genotype: item.genotype,
                    annotation_text: item.annotation_text[item.alt + item.alt] ? item.annotation_text[item.alt + item.alt] : item.annotation_text[item.alt + '/' + item.alt]
                })
            } else {
                var annotationText = item.annotation_text[item.alt + item.ref] ? item.annotation_text[item.alt + item.ref] : item.annotation_text[item.ref + item.alt]
                annotationText = annotationText ? annotationText : item.annotation_text[item.ref + '/' + item.alt]
                resultList.push({
                    chrom: item.chrom,
                    pos: item.pos,
                    ref: item.ref,
                    alt: item.alt,
                    af: item.af,
                    drug: item.drug.split('(')[0],
                    rsid: item.rsid,
                    trade_name: item.trade_name,
                    evidence: item.evidence,
                    drug_response_category: item.drug_response_category,
                    gene: item.gene,
                    variant: item.variant,
                    genotype: item.genotype,
                    annotation_text: annotationText
                })
            }
        }

        resultList = resultList.sort((a, b) => a.drug > b.drug ? 1 : a.drug < b.drug ? -1 : 0)

        return {
            pgxData: resultList,
            categories: categories
        };
    }

    async getPgxData(analysisId: number): Promise<IPgxData[]> {
        const variants = await this.getPgxVariants(analysisId);

        let rsIds = variants.map(variant => variant.rsId)

        const pgxRecords = await this.pgxRepository.findMany(rsIds);

        let result: IPgxData[] = []

        for (var i in pgxRecords) {
            for (var j in variants) {
                if (pgxRecords[i].rsid == variants[j].rsId
                    && (pgxRecords[i].gene.indexOf(variants[j].gene) == 0 || pgxRecords[i].gene == '.')
                ) {
                    result.push({
                        chrom: variants[j].chrom,
                        pos: variants[j].inputPos,
                        ref: variants[j].REF,
                        alt: variants[j].ALT,
                        rsid: variants[j].rsId,
                        af: variants[j].alleleFrequency,
                        gene: variants[j].gene,
                        evidence: pgxRecords[i].evidence,
                        related_chemicals: pgxRecords[i].related_chemicals,
                        drug_response_category: pgxRecords[i].drug_response_category,
                        annotation_text: pgxRecords[i].annotation_text
                    })
                }
            }
        }

        return result;

    }

    async getPgxVariants(analysisId: number) {
        const collectionName = `${ANALYSIS_COLLECTION_PREFIX}_${analysisId}`
        const condtions = this.variantService.buildPgxCondition();
        const variants = await this.variantRepository.find(collectionName, condtions); 

        return variants;
    }
}