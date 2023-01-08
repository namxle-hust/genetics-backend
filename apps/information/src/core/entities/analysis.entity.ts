import { ApiProperty } from '@nestjs/swagger';
import { Gender, VcfType, Analysis, AnalysisStatus } from '@app/prisma';
import { Exclude } from 'class-transformer';
import { DateTransform } from '../decorators';
import { WorkspaceEntity } from './workspace.entity';
import { SampleEntity } from './sample.entity';

export class AnalysisEntity implements Analysis {
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
    sampleId: number;

    @ApiProperty()
    status: AnalysisStatus;

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
    sample: SampleEntity

    constructor(partial: Partial<AnalysisEntity>) {
        Object.assign(this, partial);
    }

    
}