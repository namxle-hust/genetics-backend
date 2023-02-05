import { ApiProperty } from '@nestjs/swagger';
import { Workspace, User, Sample, SampleType, File, Gender } from '@app/prisma';
import { Exclude, Transform } from 'class-transformer';
import { DateTransform } from '../decorators';

export class SampleEntity implements Sample {
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

    @ApiProperty()
    firstName: string;
    
    @ApiProperty()
    lastName: string;

    @ApiProperty()
    dob: string;

    @ApiProperty()
    ethnicity: string;


    constructor(partial: Partial<SampleEntity>) {
        Object.assign(this, partial);
    }
    gender: Gender;
   
}