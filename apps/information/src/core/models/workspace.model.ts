
export interface IWorkspaceFilter {

}

export interface IWorkspaceFindInput {
    name?: { contains: string }
    userId: number
}

export interface IWorkspaceCreateInput {
    name: string
    userId: number
}

export interface IWorkspaceUpdateInput {
    name: string
}
