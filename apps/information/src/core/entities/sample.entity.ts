import { ApiProperty } from '@nestjs/swagger';
import { Sample, Gender, SampleStatus, VcfType, Workspace } from '@app/prisma';
import { Exclude } from 'class-transformer';
import { DateTransform } from '../decorators';
import { WorkspaceEntity } from './workspace.entity';
import { BatchEntity } from './batch.entity';

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

    @Exclude()
    @ApiProperty()
    workspaceId: number;

    @Exclude()
    @ApiProperty()
    batchId: number;

    @ApiProperty()
    status: SampleStatus;

    @Exclude()
    @ApiProperty()
    isDeleted: boolean;

    @Exclude()
    @ApiProperty()
    vcfFilePath: string;

    @ApiProperty()
    totalVariants: number;

    @ApiProperty()
    totalGenes: number;

    @ApiProperty()
    description: string;

    @ApiProperty()
    vcfType: VcfType;

    @ApiProperty()
    gender: Gender;

    @ApiProperty()
    workspace: WorkspaceEntity

    @ApiProperty()
    batch: BatchEntity

    constructor(partial: Partial<SampleEntity>) {
        Object.assign(this, partial);
    }

    
}