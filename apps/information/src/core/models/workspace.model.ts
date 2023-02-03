
export interface IWorkspaceFilter {
    name?: string
    userId: number
}

export interface IWorkspaceFindInput {
    name?: string
    userId: number
}

export interface IWorkspaceCreateInput {
    name: string
    userId: number
}

export interface IWorkspaceUpdateInput {
    name: string
}
