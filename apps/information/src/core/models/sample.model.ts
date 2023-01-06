import { Gender, SampleStatus, VcfType } from "@app/prisma"

export interface ISampleFilter {
    
}

export interface ISampleFindInput {
    name?: string
    isDeleted: boolean
    workspaceId?: number
}

export interface ISampleCreateInput {
    name: string
    workspaceId: number
    batchId: number
    description?: string
    vcfType: VcfType
    status: SampleStatus
    gender?: Gender
    vcfFilePath?: string
}

export interface ISampleUpdateInput {
    name: string;
}

export interface ISampleRemoveInput {
    isDeleted: boolean;
}
