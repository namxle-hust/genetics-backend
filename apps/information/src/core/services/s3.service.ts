import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GetObjectAclCommandInput, GetObjectCommand, S3, S3Client, UploadPartCommand } from "@aws-sdk/client-s3";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { IAWSCredentialOuput } from "../models";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

@Injectable({})
export class S3Service {
    private s3STS;

    private s3;

    constructor(private configService: ConfigService) {
        this.s3STS = new STSClient({
            credentials: {
                accessKeyId: this.configService.get<string>('S3_UPLOADER_ACCESS_KEY'),
                secretAccessKey: this.configService.get<string>('S3_UPLOADER_SECRET_KEY')
            },
            region: 'ap-southeast-1'
        })

        this.s3 = new S3Client({
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

    async getSignedUrl(key: string): Promise<string> {
        const params: GetObjectAclCommandInput = {
            Bucket: this.configService.get<string>('S3_BUCKET'),
            Key: key
        }

        const command = new GetObjectCommand(params)

        const url = await getSignedUrl(this.s3, command)

        return url
    }
}