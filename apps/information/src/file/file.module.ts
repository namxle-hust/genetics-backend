import { Module } from '@nestjs/common';
import { S3Service } from '../core/services';
import { FileController } from './file.controller';

@Module({
    controllers: [FileController],
    providers: [S3Service]
})
export class FileModule { }
