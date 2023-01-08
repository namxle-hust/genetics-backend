import { Gender, Sample, AnalysisStatus, VcfType, Workspace, Analysis } from "@app/prisma";
import { Exclude } from "class-transformer";


export class AnalysisEntity implements Analysis {
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
    sampleId: number;
    
    sample: Sample    

    status: AnalysisStatus;

    isDeleted: boolean;

    vcfFilePath: string;

    totalVariants: number;

    totalGenes: number;

    description: string;

    vcfType: VcfType;

    gender: Gender;

}