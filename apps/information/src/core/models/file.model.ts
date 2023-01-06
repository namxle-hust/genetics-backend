import { File } from "@app/prisma"

export interface IFileFilter {
    
}

export interface IAWSCredentialOuput {
    AccessKeyId: string,
    SecretAccessKey: string
    SessionToken: string
}

export interface IFileFindInput {
    name?: string
    batchId: number
}

export interface IFileCreateInput {
    name: string
    uploadedName: string
    size: number
    batchId: number
}
