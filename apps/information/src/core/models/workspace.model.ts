import { TableDTO } from "../dto"

export interface IWorkspaceFilter {

}

export interface IWorkspaceFindInput {
    name?: { contains: string }
    userId: number
}

export class WorkspaceFindInput implements IWorkspaceFindInput {
    name?: { contains: string }
    userId: number

    constructor(dto: TableDTO<IWorkspaceFilter>, userId: number) {
        if (dto.searchTerm) {
            this.name.contains = dto.searchTerm
        }
        this.userId = userId
    }
}

export interface IWorkspaceCreateInput {
    name: string
    userId: number
}

export interface IWorkspaceUpdateInput {
    name: string
}
