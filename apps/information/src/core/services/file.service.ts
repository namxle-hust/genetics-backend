import { File } from '@app/prisma';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileCreateDTO, FileFilterDTO, TableDTO } from '../dto';
import { FileEntity, TableOutputEntity } from '../entities';
import { IFileCreateInput, IFileFindInput, TableFindInput } from '../models';
import { FileRepository } from '../repository';
import { CommonService } from './common.service';

@Injectable()
export class FileService {
    private s3Bucket: string;
    private s3UploadFolder: string;
    private nodeEnv: string;
    private localUploadFolder: string
    private s3Profile: string

    constructor(
        private readonly fileRepository: FileRepository,
        private readonly configService: ConfigService,
        private readonly commonService: CommonService
    ) { 
        this.s3Bucket = this.configService.get<string>('S3_BUCKET');
        this.s3UploadFolder = this.configService.get<string>('S3_UPLOAD_FOLDER')
        this.nodeEnv = this.configService.get<string>('NODE_ENV');
        this.localUploadFolder = this.configService.get<string>('LOCAL_UPLOAD_FOLDER')
        this.s3Profile = this.configService.get<string>('S3_PROFILE')
    }

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

        // Save File to local machine on production env
        if (this.nodeEnv == 'production') {
            await this.saveFile(data.uploadedName);
        }

        return file;
    }

    async removeSample(id: number) {
        // return this.workspaceRepository.update()
    }

    async saveFile(uploadedName: string) {
        const s3UploadedPath = `s3://${this.s3Bucket}/${this.s3UploadFolder}/${uploadedName}`
        const destination = `${this.localUploadFolder}`

        let command = `aws s3 cp ${s3UploadedPath} ${destination} --profile ${this.s3Profile} >/dev/null 2>&1`

        await this.commonService.runCommand(command);
    }
}
