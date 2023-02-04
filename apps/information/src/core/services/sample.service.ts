import { Sample } from '@app/prisma';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { FileCreateDTO, SampleCreateDTO, SampleFilterDTO, SampleUpdateDTO, TableDTO } from '../dto';
import { ISampleCreateInput, ISampleFilter, ISampleFindInput, ISampleUpdateInput, SampleFindInput, TableFindInput } from '../models';
import { TableOutputEntity, SampleEntity } from '../entities';
import { SampleRepository } from '../repository';
import { FileService } from './file.service';

@Injectable({})
export class SampleService {
    constructor(private readonly sampleRepository: SampleRepository, private readonly fileService: FileService) { }

    async getSamples(dto: TableDTO<SampleFilterDTO>, userId: number): Promise<TableOutputEntity<SampleEntity>> {
        let result: TableOutputEntity<SampleEntity> = {
            items: [],
            total: 0
        }

        let findInput: ISampleFindInput = new SampleFindInput(dto, userId)

        let tableFindDto = new TableFindInput<ISampleFindInput, ISampleFilter>(dto, findInput);

        const total = await this.sampleRepository.count(tableFindDto);

        if (total > 0) {
            const samples = await this.sampleRepository.findMany(tableFindDto);

            const items = samples.map((item) => new SampleEntity(item));

            result.items = items;
            result.total = total;
        }

        return result
    }

    async getSampleByUserId(data: ISampleFindInput): Promise<SampleEntity[]> {
        const samples = await this.sampleRepository.findByUserId(data);
        return samples.map(item => new SampleEntity(item));
    } 

    async updateSample(dto: SampleUpdateDTO, userId: number, id: number): Promise<Sample> {
        let data: ISampleUpdateInput = {
            name: dto.name
        }

        let sample = await this.sampleRepository.findById(id);
        if (sample.userId != userId) {
            throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
        }

        return await this.sampleRepository.update(id, data);
    }


    async getSample(id: number, userId: number): Promise<Sample> {
        let sample = await this.sampleRepository.findById(id);
        if (sample.userId != userId) {
            throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
        }
        return sample;
    }

    async createSample(dto: SampleCreateDTO, userId: number) {
        let data: ISampleCreateInput = {
            userId: userId,
            name: dto.name,
            type: dto.type
        }

        const sample = await this.sampleRepository.create(data);

        for (let file of dto.files) {
            let fileData: FileCreateDTO = {
                sampleId: sample.id,
                name: file.name,
                uploadedName: file.uploadedName,
                size: file.size
            }
            await this.fileService.createSample(fileData)
        }

        return sample;
    }

    async removeSample(userId: number, id: number) {
        const sample = await this.sampleRepository.findById(id);
        if (sample.userId != userId) {
            throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
        }

        return await this.sampleRepository.update(id, { isDelete: true });
    }

}
