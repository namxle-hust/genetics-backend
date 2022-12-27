import { Module } from '@nestjs/common';
import { BatchRepository, FileRepository } from '../core/repository';
import { BatchService } from '../core/services';
import { FileService } from '../core/services/file.service';
import { BatchController } from './batch.controller';

@Module({
    controllers: [BatchController],
    providers: [BatchService, BatchRepository, FileService, FileRepository]
})
export class BatchModule { }
