import { File } from '@app/prisma';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { FileCreateDTO, FileFilterDTO, TableDTO } from '../dto';
import { FileEntity, TableOutputEntity } from '../entities';
import { IFileCreateInput, IFileFindInput, TableFindInput } from '../models';
import { FileRepository } from '../repository';

@Injectable()
export class FileService {
    constructor(private readonly fileRepository: FileRepository) {}

    async getFiles(dto: TableDTO<FileFilterDTO>, sampleId: number): Promise<TableOutputEntity<FileEntity>> {
        let result: TableOutputEntity<FileEntity> = {
            items: [],
            total: 0
        }

        let tableFindDto = new TableFindInput<IFileFindInput, FileFilterDTO>(dto, { sampleId: sampleId });

        const total = await this.fileRepository.count(tableFindDto);

        if (total > 0) {
            const files = await this.fileRepository.findMany(tableFindDto);

            const items = files.map((file) => new FileEntity(file));

            result.items = items;
            result.total = total;
        }

        return result
    }

    async getFile(id: number, sampleId: number): Promise<File> {
        let file = await this.fileRepository.findById(id);
        if (file.sampleId != sampleId) {
            throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
        }
        return file;
    }

    async createSample(dto: FileCreateDTO) {
        let data: IFileCreateInput = {
            sampleId: dto.sampleId,
            size: dto.size,
            uploadedName: dto.uploadedName,
            name: dto.name
        }

        const file = await this.fileRepository.create(data);
        return file;

    }

    async removeSample(id: number) {
        // return this.workspaceRepository.update()
    }
}
