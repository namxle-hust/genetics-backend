import { AtLeastOnePropertyOf } from "@app/common"
import { Role } from "@app/prisma"

export type UserFindCriteria = AtLeastOnePropertyOf<IUserFindModel>

export interface IUserFindModel {
    firstName: string
    lastName: string
    email: string
    role: Role
}

export interface IUserCreateInput {
    firstName: string
    lastName: string
    email: string
    hash: string
    role?: Role
}

export interface IUserUpdateInput {
    
}



