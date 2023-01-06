import { ApiProperty } from "@nestjs/swagger";

export class TableOutputEntity<T> {
    @ApiProperty()
    items: Array<T>

    @ApiProperty()
    total: Number

    constructor(partial: Partial<TableOutputEntity<T>>) {
        Object.assign(this, partial);
    }
    
}