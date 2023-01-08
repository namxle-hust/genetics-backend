import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../core/decorators';
import { AWSCredentialEntity } from '../core/entities';
import { JwtGuard } from '../core/guards';
import { S3Service } from '../core/services';


@UseGuards(JwtGuard)
@Controller('file')
@ApiTags('file')
export class FileController {

    constructor(private s3Service: S3Service) {
    }

    @Get('aws-credentials')
    @ApiOkResponse({ type: AWSCredentialEntity })
    async getAwsCredentials(): Promise<AWSCredentialEntity> {
        const data = await this.s3Service.getAwsTemporaryCredential();
        return new AWSCredentialEntity(data)
    }
}
