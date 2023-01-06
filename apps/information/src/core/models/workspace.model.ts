
export interface IWorkspaceFilter {
    
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
