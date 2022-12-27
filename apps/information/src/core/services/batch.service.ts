import { Batch } from '@app/prisma';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BatchCreateDTO, BatchUpdateDTO, FileCreateDTO, TableDTO } from '../dto';
import { IBatchCreateInput, IBatchFindInput, IBatchUpdateInput, TableFindInput } from '../models';
import { TableOutputEntity, BatchEntity } from '../entities';
import { BatchRepository } from '../repository';
import { FileService } from './file.service';

@Injectable({})
export class BatchService {
    constructor(private readonly batchRepository: BatchRepository, private readonly fileService: FileService) { }

    async getBatches(dto: TableDTO, userId: number): Promise<TableOutputEntity<BatchEntity>> {
        let result: TableOutputEntity<BatchEntity> = {
            items: [],
            total: 0
        }

        let tableFindDto = new TableFindInput<IBatchFindInput>(dto, { userId: userId, isDelete: false });

        const total = await this.batchRepository.count(tableFindDto);

        if (total > 0) {
            const batches = await this.batchRepository.findMany(tableFindDto);

            const items = batches.map((workspace) => new BatchEntity(workspace));

            result.items = items;
            result.total = total;
        }

        return result
    }

    async getBatchByUserId(data: IBatchFindInput): Promise<BatchEntity[]> {
        const batches = await this.batchRepository.findBatchByUserId(data);
        return batches.map(batch => new BatchEntity(batch));
    } 

    async updateBatch(dto: BatchUpdateDTO, userId: number, id: number): Promise<Batch> {
        let data: IBatchUpdateInput = {
            name: dto.name
        }

        let batch = await this.batchRepository.findById(id);
        if (batch.userId != userId) {
            throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
        }

        return await this.batchRepository.update(id, data);
    }


    async getBatch(id: number, userId: number): Promise<Batch> {
        let batch = await this.batchRepository.findById(id);
        if (batch.userId != userId) {
            throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
        }
        return batch;
    }

    async createBatch(dto: BatchCreateDTO, userId: number) {
        let data: IBatchCreateInput = {
            userId: userId,
            name: dto.name,
            type: dto.type
        }

        const batch = await this.batchRepository.create(data);

        for (let file of dto.files) {
            let fileData: FileCreateDTO = {
                batchId: batch.id,
                name: file.name,
                uploadedName: file.uploadedName,
                size: file.size
            }
            await this.fileService.createBatch(fileData)
        }

        return batch;
    }

    async removeBatch(userId: number, id: number) {
        const batch = await this.batchRepository.findById(id);
        if (batch.userId != userId) {
            throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
        }

        return await this.batchRepository.update(id, { isDelete: true });
    }

}
