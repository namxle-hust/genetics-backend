import { Batch, Gender, Sample, SampleStatus, VcfType, Workspace } from "@app/prisma";
import { Exclude } from "class-transformer";


export class SampleEntity implements Sample {
    id: number;
    
    @Exclude()
    createdAt: Date;

    @Exclude()
    updatedAt: Date;

    name: string;

    @Exclude()
    workspaceId: number;

    workspace: Workspace

    @Exclude()
    batchId: number;
    
    batch: Batch    

    status: SampleStatus;

    isDeleted: boolean;

    vcfFilePath: string;

    totalVariants: number;

    totalGenes: number;

    description: string;

    vcfType: VcfType;

    gender: Gender;

}