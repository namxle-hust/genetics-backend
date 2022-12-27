import { TableDTO } from "../dto"

export class TableFindInput<T> {
    where: T
    orderBy: Array<{ [key: string]: string }>
    skip: number
    take: number

    constructor(partial: Partial<TableDTO>, whereClause: T) {
        let sortingObject = {}
        sortingObject[`${partial.sorting.column}`] = partial.sorting.direction;

        this.where = whereClause
        this.orderBy = [sortingObject]
        this.skip = (partial.paginator.page - 1) * partial.paginator.pageSize;
        this.take = partial.paginator.pageSize

    }
}