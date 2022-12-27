import { IsNotEmpty, IsNotEmptyObject, IsNumber } from "class-validator"

class PaginatorDTO {
    @IsNumber()
    page: number

    @IsNumber()
    pageSize: number

    @IsNumber()
    pageSizes: number

    @IsNumber()
    total: number
}

class SortingDTO {
    @IsNotEmpty()
    column: string

    @IsNotEmpty()
    direction: "asc" | "desc"
}

export class TableDTO {
    @IsNotEmpty()
    filter: object

    @IsNotEmpty()
    paginator: PaginatorDTO

    searchTerm: string

    @IsNotEmpty()
    sorting: SortingDTO
}

