import { Batch, File } from "@app/prisma";
import { ApiProperty } from "@nestjs/swagger";
import { DateTransform } from "../decorators";
import { IAWSCredentialOuput } from "../models";


export class FileEntity implements File {
    @ApiProperty()
    id: number;

    @ApiProperty()
    @DateTransform()
    createdAt: Date;

    @ApiProperty()
    @DateTransform()
    updatedAt: Date;

    @ApiProperty()
    name: string;

    @ApiProperty()
    uploadedName: string;

    @ApiProperty()
    size: number;

    @ApiProperty()
    batchId: number;
    
    @ApiProperty()
    batch: Batch


    constructor(partial: Partial<FileEntity>) {
        Object.assign(this, partial);
    }
}

export class AWSCredentialEntity implements IAWSCredentialOuput {
    @ApiProperty()
    AccessKeyId: string;
    
    @ApiProperty()
    SecretAccessKey: string;

    @ApiProperty()
    SessionToken: string;
    
    constructor(partial: Partial<AWSCredentialEntity>) {
        Object.assign(this, partial);
    }
}