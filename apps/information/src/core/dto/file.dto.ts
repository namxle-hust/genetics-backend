import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsEnum, IsNotEmpty, IsNumber, IsString, ValidateIf, ValidateNested } from "class-validator"
import { BatchExists, Trim } from "../decorators";

export class FileCreateWithBatchDTO {
    @IsString()
    @IsNotEmpty()
    @Trim()
    @ApiProperty()
    name: string;

    @IsString()
    @IsNotEmpty()
    @Trim()
    @ApiProperty()
    uploadedName: string

    @IsNumber()
    @IsNotEmpty()
    size: number
}

export class FileCreateDTO {
    @IsString()
    @IsNotEmpty()
    @Trim()
    @ApiProperty()
    name: string;

    @IsString()
    @IsNotEmpty()
    @Trim()
    @ApiProperty()
    uploadedName: string

    @IsNumber()
    @IsNotEmpty()
    size: number

    @BatchExists()
    batchId: number
}

export class FileUpdateDTO {
    @IsString()
    @IsNotEmpty()
    @Trim()
    @ApiProperty()
    name: string;

    @IsString()
    @IsNotEmpty()
    @Trim()
    @ApiProperty()
    uploadedName: string
}

