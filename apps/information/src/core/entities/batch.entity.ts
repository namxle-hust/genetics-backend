import { ApiProperty } from '@nestjs/swagger';
import { Workspace, User, Batch, SampleType, File } from '@app/prisma';
import { Exclude, Transform } from 'class-transformer';
import { DateTransform } from '../decorators';

export class BatchEntity implements Batch {
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
    userId: number;

    @ApiProperty()
    type: SampleType;

    @ApiProperty()
    files: File

    @ApiProperty()
    user: User

    @ApiProperty()
    @Exclude()
    isDelete: boolean;

    constructor(partial: Partial<BatchEntity>) {
        Object.assign(this, partial);
    }
    
}