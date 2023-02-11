
import { ANALYSIS_COLLECTION_PREFIX } from "@app/common/mongodb";
import { Service } from "@app/common/shared/service";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TableDTO, VariantFilterDTO } from "../dto";
import { AnalysisEntity, IIgvUrl, TableOutputEntity, VariantEntity, VariantQCUrlEntity } from "../entities";
import { IVariantFilter, TableFindInput, VariantModel } from "../models";
import { AnalysisRepository, VariantRepository } from "../repository";
import { CommonService } from "./common.service";
import { S3Service } from "./s3.service";
import { VariantService } from "./variant.service";
import axios from 'axios';
import { SampleType } from "@app/prisma";


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

    // async getIgvLink(path: string, clientIp: string): Promise<string> {
    //     let host = this.configService.get<string>('IGV_FILE_HOST');
    //     let secret = this.configService.get<string>('IGV_SECRET_KEY');
    //     let folder = this.configService.get<string>('IGV_SERVER_FOLDER');

    //     let uri = `/${folder}/${path}`

    //     let today = new Date();
	// 	let minute_exist = today.getMinutes() + 30;
	// 	let expires = Math.round(new Date(today.getFullYear(), today.getMonth(), today.getDate(), today.getHours(), minute_exist, today.getSeconds()).getTime() / 1000);
	// 	let input = uri + clientIp + expires + " " + secret;
	// 	let binaryHash = crypto.createHash("md5").update(input).digest().toString('hex');
    //     let signatures = binaryHash.replace(/\+/g, "-").replace(/\//g, "_").replace(/\=/g, "")

    //     return `${host}${uri}?Signatures=${signatures}&Expires=${expires}`
    // }

    async getIgvLinkV2(path: string, clientIp: string): Promise<string> {
        let folder = this.configService.get<string>('IGV_SERVER_FOLDER');
        let enliterHost = this.configService.get<string>('ENLITER_HOST');
        let url = `${enliterHost}/vg/get-igv`

        let postData = {
            path: `${folder}/${path}`,
            clientIp: clientIp
        }
        let response = await axios.post(url, postData)

        let data = response.data;

        // this.logger.debug(data);
    
        return data.url
    }

    async getIgvURLs(analysisId: number, clientIp: string): Promise<IIgvUrl> {         
        this.logger.debug(clientIp);

        let result = await this.analysisRepository.findByIdOrFail(analysisId);
        let analysis = new AnalysisEntity(result);
        if (analysis.sample && analysis.sample.type == SampleType.VCF) {
            return {}
        }

        let bamPath = `${analysisId}/realigned.bam`
        let indexBamPath = `${analysisId}/realigned.bam.bai`

        let bamUrl = await this.getIgvLinkV2(bamPath, clientIp);
        let indexBamUrl = await this.getIgvLinkV2(indexBamPath, clientIp);
       
        return {
            bamUrl: bamUrl,
            indexBamUrl: indexBamUrl
        }
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