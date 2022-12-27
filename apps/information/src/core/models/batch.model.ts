import { SampleType } from "@app/prisma"

export interface IBatchFindInput {
    name?: string
    isDelete: boolean
    userId: number
}

export interface IBatchCreateInput {
    name: string
    userId: number
    type: SampleType
}

export interface IBatchUpdateInput {
    name: string;
}

export interface IBatchRemoveInput {
    isDelete: boolean;
}
