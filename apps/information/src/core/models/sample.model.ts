import { Gender, SampleType } from "@app/prisma"
import { SampleFilterDTO, TableDTO } from "../dto"

export interface ISampleFilter {
    type?: SampleType
}

export interface ISampleFindInput {
    name?: {
        contains: string
    }
    type?: SampleType
    isDelete: boolean
    userId: number
}

export class SampleFindInput implements ISampleFindInput {
    name?: {
        contains: string
    }
    type?: SampleType
    isDelete: boolean
    userId: number

    constructor(dto: TableDTO<ISampleFilter>, userId: number) {
        if (dto.searchTerm) {
            this.name = {
                contains: dto.searchTerm
            }
        }
        if (dto.filter.type) {
            this.type = dto.filter.type
        }
        this.isDelete = false;
        this.userId = userId
    }
}

export interface ISampleCreateInput {
    name: string
    userId: number
    type: SampleType,
    firstName: string
    lastName: string
    dob: string;
    ethnicity: string;
    gender: Gender
}

export interface ISampleUpdateInput {
    name: string;
}

export interface ISampleRemoveInput {
    isDelete: boolean;
}
