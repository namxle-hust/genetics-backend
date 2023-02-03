
import { ANALYSIS_COLLECTION_PREFIX } from "@app/common/mongodb";
import { Service } from "@app/common/shared/service";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TableDTO, VariantFilterDTO } from "../dto";
import { TableOutputEntity, VariantEntity, VariantQCUrlEntity } from "../entities";
import { IVariantFilter, TableFindInput, VariantModel } from "../models";
import { AnalysisRepository, VariantRepository } from "../repository";
import { CommonService } from "./common.service";
import { S3Service } from "./s3.service";
import { VariantService } from "./variant.service";


@Injectable({})
export class AnalysisDetailService extends Service {
    constructor(
        private variantService: VariantService,
        private variantRepository: VariantRepository,
        private analysisRepository: AnalysisRepository,
        private s3Service: S3Service,
        private commonService: CommonService,
        private configService: ConfigService
    ) {
        super()
    }

    async getVariant(analsisId: number, dto: TableDTO<VariantFilterDTO>): Promise<TableOutputEntity<VariantEntity>> {

        const criteria = new TableFindInput<IVariantFilter, IVariantFilter>(dto, dto.filter);

        let pipe = this.variantService.buildPipe(criteria)
        let countPipe = this.variantService.buildCountPipe(criteria);

        const collectionName = `${ANALYSIS_COLLECTION_PREFIX}_${analsisId}`

        const data = await this.variantRepository.aggregate(collectionName, pipe);
        const items: VariantEntity[] = data.map((variant) => new VariantEntity(new VariantModel(variant)))

        const count = await this.variantRepository.aggregate(collectionName, countPipe);

        const total: number = count.length > 0 ? count[0].count : 0

        // this.logger.debug(total);

        const results: TableOutputEntity<VariantEntity> = {
            items: items,
            total: total
        }
        return results;
    }

    async getVariantDetail(analysisId: number, _id: string) {
        const collectionName = `${ANALYSIS_COLLECTION_PREFIX}_${analysisId}`
        const condtions = this.variantService.buildVariantDetailConditions(_id);
        const data = await this.variantRepository.find(collectionName, condtions); 
    }

    async getQcUrl(analysisId: number): Promise<string> {
        const ananlysis = await this.analysisRepository.findById(analysisId);

        let key = this.commonService.buildVcfFullPath(ananlysis)

        const singedUrl = await this.s3Service.getSignedUrl(key)
        const tbiSingedUrl = await this.s3Service.getSignedUrl(`${key}.tbi`)

        return this.buildQCUrl(singedUrl, tbiSingedUrl)
    }

    buildQCUrl(s3Url: string, tbiUrl: string): string {
        const params = {
            species: 'Human',
            build: 'GRCh37',
            vcf: s3Url,
            tbi: tbiUrl
        }

        const queryParams = this.commonService.buildUrlQuery(params);

        const url = `${this.configService.get<string>('VCF_IOBIO_HOST')}/?${queryParams}`

        return url;
    }

}