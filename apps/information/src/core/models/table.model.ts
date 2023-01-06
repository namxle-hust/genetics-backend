export interface IPaginator {
    page: number
    pageSize: number
    pageSizes: number
    total: number
}

export interface ISorting {
    column: string
    direction: "asc" | "desc"
}


export interface ITable<T> {
    filter: T
    paginator: IPaginator
    searchTerm: string
    sorting: ISorting
}

export class TableFindInput<T, FT> {
    where: T
    orderBy: Array<{ [key: string]: string }>
    skip: number
    take: number

    constructor(partial: Partial<ITable<FT>>, whereClause: T) {
        let sortingObject = {}
        sortingObject[`${partial.sorting.column}`] = partial.sorting.direction;

        this.where = whereClause
        this.orderBy = [sortingObject]
        this.skip = (partial.paginator.page - 1) * partial.paginator.pageSize;
        this.take = partial.paginator.pageSize
    }
}