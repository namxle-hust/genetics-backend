import { ApiProperty } from "@nestjs/swagger";
import { ArrayNotEmpty, IsArray, IsEnum, IsNotEmpty, IsNumber, IsString, ValidateIf, ValidateNested } from "class-validator"
import { Trim } from "../decorators";
import { SampleType } from "@app/prisma";
import { Type } from "class-transformer";
import { FileCreateWithBatchDTO } from "./file.dto";


export class BatchCreateDTO {
    @IsString()
    @IsNotEmpty()
    @Trim()
    @ApiProperty()
    name: string;

    @IsEnum(SampleType)
    type: SampleType

    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => FileCreateWithBatchDTO)
    files: FileCreateWithBatchDTO[]

}

export class BatchUpdateDTO {
    @IsString()
    @IsNotEmpty()
    @Trim()
    @ApiProperty()
    name: string;
}

export class BatchDeleteManyDTO {
    @IsArray()
    @IsNotEmpty()
    @ApiProperty()
    ids: number[]
}