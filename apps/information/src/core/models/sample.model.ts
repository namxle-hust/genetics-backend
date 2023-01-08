import { SampleType } from "@app/prisma"

export interface ISampleFilter {
    
}

export interface ISampleFindInput {
    name?: string
    isDelete: boolean
    userId: number
}

export interface ISampleCreateInput {
    name: string
    userId: number
    type: SampleType
}

export interface ISampleUpdateInput {
    name: string;
}

export interface ISampleRemoveInput {
    isDelete: boolean;
}
