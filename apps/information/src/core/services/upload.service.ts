import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3, UploadPartCommand } from "@aws-sdk/client-s3";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { IAWSCredentialOuput } from "../models";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

@Injectable({})
export class UploadService {
    private s3STS;

    constructor(private configService: ConfigService) {
        this.s3STS = new STSClient({
            credentials: {
                accessKeyId: this.configService.get<string>('S3_UPLOADER_ACCESS_KEY'),
                secretAccessKey: this.configService.get<string>('S3_UPLOADER_SECRET_KEY')
            },
            region: 'ap-southeast-1'
        })
    }

    async getAwsTemporaryCredential(): Promise<IAWSCredentialOuput> {

        const params = {
            RoleSessionName: 'temporary_upload_session',
            RoleArn: this.configService.get<string>('S3_ROLE_ARN'),
            DurationSeconds: 3600

        };
        const command = new AssumeRoleCommand(params);

        const response = await this.s3STS.send(command);

        return response.Credentials;
    }
}