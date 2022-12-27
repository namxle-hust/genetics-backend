import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../core/decorators';
import { AWSCredentialEntity } from '../core/entities';
import { JwtGuard } from '../core/guards';
import { UploadService } from '../core/services';


@UseGuards(JwtGuard)
@Controller('file')
@ApiTags('file')
export class FileController {

    constructor(private uploadService: UploadService) {
    }

    @Get('aws-credentials')
    @ApiOkResponse({ type: AWSCredentialEntity })
    async getAwsCredentials(): Promise<AWSCredentialEntity> {
        const data = await this.uploadService.getAwsTemporaryCredential();
        return new AWSCredentialEntity(data)
    }
}
