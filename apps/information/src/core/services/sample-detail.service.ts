
import { SAMPLE_COLLECTION_PREFIX } from "@app/common/mongodb";
import { Service } from "@app/common/shared/service";
import { Injectable } from "@nestjs/common";
import { TableDTO, VariantFilterDTO } from "../dto";
import { TableOutputEntity, VariantEntity, VariantQCUrlEntity } from "../entities";
import { IVariantFilter, TableFindInput, VariantModel } from "../models";
import { SampleRepository } from "../repository";
import { VariantRepository } from "../repository/variant.repository";
import { VariantService } from "./variant.service";


@Injectable({})
export class SampleDetailService extends Service {
    constructor(private variantService: VariantService, private variantRepository: VariantRepository, private sampleRepository: SampleRepository) {
        super()
    }

    async getVariant(sampleId: number, dto: TableDTO<VariantFilterDTO>): Promise<TableOutputEntity<VariantEntity>> {
        
        const criteria = new TableFindInput<IVariantFilter, IVariantFilter>(dto, dto.filter);

        let pipe = this.variantService.buildPipe(criteria)
        let countPipe = this.variantService.buildCountPipe(criteria);

        const collectionName = `${SAMPLE_COLLECTION_PREFIX}_${sampleId}`

        const data = await this.variantRepository.find(collectionName, pipe);
        const items: VariantEntity[] = data.map((variant) => new VariantEntity(new VariantModel(variant)))

        const count = await this.variantRepository.find(collectionName, countPipe);

        const total: number = count.length > 0 ? count[0].count : 0

        // this.logger.debug(total);

        const results: TableOutputEntity<VariantEntity> = {
            items: items,
            total: total
        }
        return results;
    }


    async getSampleQcUrl(sampleId: number): Promise<VariantQCUrlEntity> {
        const sample = this.sampleRepository.findById(sampleId);
        

        return {
            url: ''
        }
    }

}