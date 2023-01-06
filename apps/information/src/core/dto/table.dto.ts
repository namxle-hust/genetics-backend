import { Exclude, Type } from "class-transformer"
import { IsNotEmpty, IsNotEmptyObject, IsNumber, IsOptional, ValidateNested } from "class-validator"
import { IPaginator, ISorting, ITable } from "../models"

class PaginatorDTO implements IPaginator {
    @IsNumber()
    page: number

    @IsNumber()
    pageSize: number

    @IsNumber()
    pageSizes: number

    @IsNumber()
    total: number
}

class SortingDTO implements ISorting {
    @IsNotEmpty()
    column: string

    @IsNotEmpty()
    direction: "asc" | "desc"
}

export class TableDTO<T> implements ITable<T> {
    @IsOptional()
    filter: T

    @IsNotEmpty()
    paginator: PaginatorDTO

    @IsOptional()
    searchTerm: string

    @IsNotEmpty()
    sorting: SortingDTO
}

