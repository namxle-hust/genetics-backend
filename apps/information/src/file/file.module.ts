import { Module } from '@nestjs/common';
import { UploadService } from '../core/services';
import { FileController } from './file.controller';

@Module({
    controllers: [FileController],
    providers: [UploadService]
})
export class FileModule { }
