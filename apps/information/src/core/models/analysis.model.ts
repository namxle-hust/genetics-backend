import { Gender, AnalysisStatus, VcfType } from "@app/prisma"

export interface IAnalysisFilter {
    
}

export interface IAnalysisFindInput {
    name?: string
    isDeleted: boolean
    workspaceId?: number
}

export interface IAnalysisCreateInput {
    name: string
    workspaceId: number
    sampleId: number
    description?: string
    vcfType: VcfType
    status: AnalysisStatus
    gender?: Gender
    vcfFilePath?: string
}

export interface IAnalysisUpdateInput {
    name: string;
}

export interface IAnalysisRemoveInput {
    isDeleted: boolean;
}
