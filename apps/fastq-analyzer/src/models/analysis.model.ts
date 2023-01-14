import { Analysis, AnalysisStatus, File, Gender, Sample, SampleType, VcfType } from "@app/prisma";

export class AnalysisModel implements Analysis {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    workspaceId: number;
    sampleId: number;
    sample: SampleModel
    status: AnalysisStatus;
    isDeleted: boolean;
    vcfFilePath: string;
    totalVariants: number;
    totalGenes: number;
    description: string;
    vcfType: VcfType;
    gender: Gender;

}

export class SampleModel implements Sample {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    isDelete: boolean;
    userId: number;
    type: SampleType;
    files: File[]
    
}