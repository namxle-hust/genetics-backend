import { Batch, NotFoundError, Sample, SampleStatus } from '@app/prisma';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { SampleCreateDTO, SampleFilterDTO, SampleUpdateDTO, TableDTO } from '../dto';
import { ISampleCreateInput, ISampleFindInput, ISampleUpdateInput, TableFindInput } from '../models';
import { TableOutputEntity, BatchEntity, SampleEntity, VariantQCUrlEntity } from '../entities';
import { BatchRepository, SampleRepository } from '../repository';
@Injectable({})
export class SampleService {
    constructor(private readonly sampleRepository: SampleRepository, private readonly batchRepository: BatchRepository) { }
    
    async getSamples(dto: TableDTO<SampleFilterDTO>, userId: number): Promise<TableOutputEntity<SampleEntity>> {
        let result: TableOutputEntity<SampleEntity> = {
            items: [],
            total: 0
        }

        let tableFindDto = new TableFindInput<ISampleFindInput, SampleFilterDTO>(dto, { isDeleted: false });

        const total = await this.sampleRepository.count(tableFindDto);

        if (total > 0) {
            const samples = await this.sampleRepository.findMany(tableFindDto);

            const items = samples.map((workspace) => new SampleEntity(workspace));

            result.items = items;
            result.total = total;
        }

        return result
    }

    async updateSample(dto: SampleUpdateDTO, userId: number, id: number): Promise<Sample> {
        let data: ISampleUpdateInput = {
            name: dto.name
        }

        let sample = await this.sampleRepository.findById(id);
        // if (batch.userId != userId) {
        //     throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
        // }

        return await this.sampleRepository.update(id, data);
    }


    async getSample(id: number): Promise<Sample> {
        let sample = await this.sampleRepository.findById(id);
        return sample;
    }

    async createSample(dto: SampleCreateDTO, userId: number) {
        let status;

        let batch = await this.batchRepository.findById(dto.batchId);

        if (batch.type == 'FASTQ') {
            status = SampleStatus.FASTQ_QUEUING
        } else {
            status = SampleStatus.VCF_QUEUING
        }

        let data: ISampleCreateInput = {
            status: status,
            ...dto
        };

        const sample = await this.sampleRepository.create(data);

        return sample;
    }

    async removeSample(userId: number, id: number) {
        const sample = await this.sampleRepository.findById(id);
        return await this.sampleRepository.update(id, { isDeleted: true });
    }

    async getSampleDetail(userId: number, id: number): Promise<SampleEntity> {
        try {
            const sample = await this.sampleRepository.findByIdOrFail(id);

            const data = new SampleEntity(sample);
            if (data.batch.userId != userId) {
                throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
            }
            return data;
        } catch(error) {
            if (error instanceof NotFoundError) {
                console.log(123);
                throw new HttpException('Sample Not Found', HttpStatus.NOT_FOUND)
            }
            throw error;
        }
    }


}
