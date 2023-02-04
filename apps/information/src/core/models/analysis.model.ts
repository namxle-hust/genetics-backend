import { Gender, AnalysisStatus, VcfType, Analysis } from "@app/prisma"
import { TableDTO } from "../dto"

export interface IAnalysisFilter {
    workspaceId?: number
    sampleId?: number
    vcfType?: VcfType
    status?: AnalysisStatus
}

export interface IAnalysisFindInput {
    name?: {
        contains: string
    }
    isDeleted: boolean
    sampleId?: number
    workspaceId?: number
    vcfType: VcfType
    workspace: {
        userId: number
    }
}

export class AnalysisFindInput implements IAnalysisFindInput {
    name?: {
        contains: string
    }
    isDeleted: boolean
    sampleId?: number
    workspaceId?: number
    vcfType: VcfType
    workspace: {
        userId: number
    }

    constructor(dto: TableDTO<IAnalysisFilter>, userId: number) {
        if (dto.searchTerm) {
            this.name.contains = dto.searchTerm
        }

        if (dto.filter.vcfType) {
            this.vcfType = dto.filter.vcfType
        }

        if (dto.filter.workspaceId) {
            this.workspaceId = dto.filter.workspaceId
        }

        if (dto.filter.sampleId) {
            this.sampleId = dto.filter.sampleId
        }

        this.workspace = { 
            userId: userId
        }
        
        this.isDeleted = false;
    }
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
