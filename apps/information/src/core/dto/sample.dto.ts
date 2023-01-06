import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateIf, ValidateNested } from "class-validator"
import { BatchExists, Trim, WorkspaceExist } from "../decorators";
import { Gender, VcfType } from "@app/prisma";
import { ISampleFilter } from "../models";

export class SampleFilterDTO implements ISampleFilter {
    
}

export class SampleCreateDTO {
    @ApiProperty()
    @IsNotEmpty()
    @IsNumber()
    @WorkspaceExist()
    workspaceId: number

    @ApiProperty()
    @IsNotEmpty()
    @IsNumber()
    @BatchExists()
    batchId: number

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Trim()
    description: string

    @IsEnum(VcfType)
    @IsNotEmpty()
    vcfType: VcfType

    @IsString()
    @IsNotEmpty()
    @Trim()
    @ApiProperty()
    name: string

    @IsEnum(Gender)
    gender: Gender
}

export class SampleUpdateDTO {
    @IsString()
    @IsNotEmpty()
    @Trim()
    @ApiProperty()
    name: string
}

export class SampleDeleteManyDTO {
    @IsArray()
    @IsNotEmpty()
    @ApiProperty()
    ids: number[]
}